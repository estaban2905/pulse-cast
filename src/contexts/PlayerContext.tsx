import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { tracks as demoTracks } from '../data/tracks';
import { hexToRgbTriplet, themes } from '../data/themes';
import { audioSim } from '../utils/audioSim';
import { fetchLyrics, noLyrics, type Lyrics } from '../services/lyricsApi';
import {
  isCastDevice,
  startCastReceiver,
  type CastMediaInfo
} from '../cast/castReceiver';
import type { PlayerMode, Settings, Track, VisualTheme, VizStyle } from '../types/player';

/**
 * El estado de la pantalla de la TV.
 *
 * Antes esto simulaba un reproductor entero: avanzaba la posición con un
 * `setInterval` y llevaba su propia cola de canciones. En un Chromecast eso
 * sobra y estorba —quien reproduce es el dispositivo y quien manda es el
 * teléfono—, así que aquí solo se refleja lo que llega.
 *
 * Lo que **no** cambió es la forma de este contexto, y es deliberado: los modos,
 * el visualizador y el fondo siguen leyendo `track`, `position` y `settings`
 * exactamente igual que antes, y no hubo que tocar ni uno.
 */

const defaultSettings: Settings = {
  lightIntensity: 1,
  brightness: 1,
  panelOpacity: 0.55,
  animations: true,
  sensitivity: 1,
  vizSpeed: 1,
  particles: 0.6,
  glow: 1,
  lyricsSize: 1,
  lyricsFont: 'display',
  lyricsColor: 'theme',
  lyricsPosition: 'center',
  lyricsSpeed: 1,
  showClock: true,
  showSongInfo: true,
  showPlaylist: false
};

interface PlayerContextValue {
  /** Siempre una sola pista: la cola vive en el teléfono, no aquí. */
  tracks: Track[];
  track: Track;
  index: number;
  isPlaying: boolean;
  position: number;
  mode: PlayerMode;
  vizStyle: VizStyle;
  theme: VisualTheme;
  partyMode: boolean;
  settings: Settings;
  /** Cierto mientras no haya llegado ninguna carga desde el teléfono. */
  idle: boolean;
  /** Cierto cuando la letra trae marcas de tiempo y se puede resaltar. */
  synced: boolean;
  /** Falso en un Chromecast: no hay ratón ni teclado que ocultar. */
  chromeVisible: boolean;
  playlistOpen: boolean;
  /** Sin efecto aquí. La pantalla no manda, obedece. */
  seek: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

/** Lo que se ve mientras nadie ha enviado música todavía. */
const idleTrack: Track = {
  id: 'idle',
  title: 'Pulse',
  artist: 'Listo para reproducir',
  album: '',
  year: new Date().getFullYear(),
  duration: 0,
  cover: '',
  bpm: 96,
  lyrics: []
};

/** Convierte lo que manda el Chromecast en la pista que las vistas esperan. */
function toTrack(media: CastMediaInfo, lyrics: Lyrics): Track {
  return {
    id: media.trackId ?? 'unknown',
    title: media.title,
    artist: media.artist,
    album: media.album,
    year: new Date().getFullYear(),
    duration: media.duration,
    cover: media.coverUrl ?? '',
    // El visualizador necesita un pulso y el API no manda BPM. 104 es un valor
    // de andar por casa: la animación no pretende ir a compás, solo moverse.
    bpm: 104,
    lyrics: lyrics.lines
  };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const onCast = isCastDevice();

  const [media, setMedia] = useState<CastMediaInfo | null>(null);
  const [lyrics, setLyrics] = useState<Lyrics>(noLyrics);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [settings] = useState<Settings>(defaultSettings);
  const [themeId] = useState('neon');

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  /* ------------------------------------------------------------------
   * Chromecast
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (!onCast) return;

    const started = startCastReceiver({
      onMedia: (next) => {
        setMedia(next);
        setPosition(0);
        setLyrics(noLyrics);
      },
      onState: ({ isPlaying: playing, position: seconds }) => {
        setIsPlaying(playing);
        setPosition(seconds);
      },
      onEnded: () => {
        setMedia(null);
        setIsPlaying(false);
        setPosition(0);
        setLyrics(noLyrics);
      }
    });

    if (!started) {
      // El SDK estaba al cargar y desapareció: no debería pasar, pero dejar la
      // pantalla en blanco sería peor que enseñar el reposo.
      setMedia(null);
    }
  }, [onCast]);

  /* ------------------------------------------------------------------
   * Modo de demostración, fuera de un Chromecast
   *
   * Existe para poder abrir esta página en un navegador y ver el diseño sin
   * emparejar nada. La posición avanza sola porque aquí no hay reproductor que
   * la dicte; en la TV, esto no llega a ejecutarse.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (onCast) return;

    const demo = demoTracks[0];
    setMedia({
      trackId: null,
      title: demo.title,
      artist: demo.artist,
      album: demo.album,
      coverUrl: demo.cover,
      duration: demo.duration
    });
    setLyrics({ synced: true, lines: demo.lyrics });
    setIsPlaying(true);

    const id = window.setInterval(() => {
      setPosition((p) => (p + 0.25 >= demo.duration ? 0 : p + 0.25));
    }, 250);
    return () => window.clearInterval(id);
  }, [onCast]);

  /* ------------------------------------------------------------------
   * Letra de la pista en curso
   * ------------------------------------------------------------------ */

  const trackId = media?.trackId ?? null;

  useEffect(() => {
    if (!onCast || !trackId) return;

    const controller = new AbortController();
    void fetchLyrics(trackId, controller.signal).then(setLyrics);
    return () => controller.abort();
  }, [onCast, trackId]);

  /* ------------------------------------------------------------------
   * Presentación
   * ------------------------------------------------------------------ */

  const idle = media === null;
  const track = useMemo(
    () => (media ? toTrack(media, lyrics) : idleTrack),
    [media, lyrics]
  );

  /**
   * Qué se enseña, decidido solo.
   *
   * En una TV no hay dónde pulsar, así que el modo no puede ser una elección
   * del que mira. Sin nada cargado, el reposo; con letra sincronizada, la
   * letra; en cualquier otro caso, la carátula.
   *
   * Se exige `synced` y no basta con que haya versos: una letra sin marcas
   * llega con todos los tiempos a cero, y el karaoke —que busca el último verso
   * ya empezado— los daría todos por cantados y resaltaría el final de la
   * canción desde el primer segundo.
   */
  const mode: PlayerMode = idle ? 'visualizer' : lyrics.synced ? 'lyrics' : 'cover';

  /* Alimenta el analizador simulado. En un Chromecast no hay forma de leer el
     audio real que está sonando, así que la animación sigue al estado de
     reproducción y al pulso supuesto, no a la señal. */
  useEffect(() => {
    audioSim.playing = isPlaying;
    audioSim.bpm = track.bpm;
    audioSim.sensitivity = settings.sensitivity;
    audioSim.speed = settings.vizSpeed;
  }, [isPlaying, track.bpm, settings.sensitivity, settings.vizSpeed]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--c1-rgb', hexToRgbTriplet(theme.colors[0]));
    root.style.setProperty('--c2-rgb', hexToRgbTriplet(theme.colors[1]));
    root.style.setProperty('--c3-rgb', hexToRgbTriplet(theme.colors[2]));
    root.style.setProperty('--bg-rgb', hexToRgbTriplet(theme.bg));
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glow', String(settings.glow * settings.lightIntensity));
    root.style.setProperty('--brightness', String(settings.brightness));
    root.style.setProperty('--panel-opacity', String(settings.panelOpacity));
  }, [settings.glow, settings.lightIntensity, settings.brightness, settings.panelOpacity]);

  /**
   * Entre dos `TIME_UPDATE` pasan cientos de milisegundos y la letra se vería
   * a saltos. Esto interpola en medio; cada aviso real del dispositivo vuelve a
   * fijar la posición, así que la cuenta nunca se separa de la verdad.
   */
  const lastTick = useRef(Date.now());
  useEffect(() => {
    if (!onCast || !isPlaying) return;

    lastTick.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setPosition((p) => p + delta);
    }, 100);
    return () => window.clearInterval(id);
  }, [onCast, isPlaying]);

  const seek = useCallback(() => undefined, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      tracks: [track],
      track,
      index: 0,
      isPlaying,
      position,
      mode,
      vizStyle: 'spectrum',
      theme,
      partyMode: false,
      settings,
      idle,
      synced: lyrics.synced,
      chromeVisible: true,
      playlistOpen: false,
      seek
    }),
    [track, isPlaying, position, mode, theme, settings, idle, lyrics.synced, seek]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer debe usarse dentro de PlayerProvider');
  return ctx;
}
