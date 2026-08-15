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
import { findTrack } from '../services/catalogApi';
import { detener, sincronizar, volumenTv } from '../services/tvAudio';
import { currentPosition, enviarOrden, pollTv, type TvState } from '../services/tvApi';
import { isCastDevice, startCastReceiver, type CastMediaInfo } from '../cast/castReceiver';
import { setupTizen } from '../tizen';
import type { PlayerMode, RepeatMode, Settings, Track, VisualTheme, VizStyle } from '../types/player';

/**
 * El estado de la pantalla, venga de donde venga.
 *
 * Hay tres formas de que una canción llegue hasta aquí, y las tres acaban en el
 * mismo sitio para que los modos, el visualizador y el fondo no se enteren:
 *
 * - **Cast**: el Chromecast abre esta página y le pasa la canción. Es lo cómodo.
 * - **Emparejada**: para Samsung y LG, que no hablan Cast. La pantalla enseña un
 *   código y luego pregunta al servidor qué suena.
 * - **Demostración**: `?demo=1`, para trabajar el diseño sin nada conectado.
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

/** Cada cuánto se le pregunta al servidor. */
const POLL_MS = 2_000;

interface PlayerContextValue {
  tracks: Track[];
  track: Track;
  index: number;
  isPlaying: boolean;
  position: number;
  mode: PlayerMode;
  /** La elige el mando; se olvida al cambiar de canción. */
  setMode: (m: PlayerMode) => void;
  vizStyle: VizStyle;
  setVizStyle: (s: VizStyle) => void;
  theme: VisualTheme;
  partyMode: boolean;
  togglePartyMode: () => void;
  settings: Settings;

  /*
   * Transporte. No lo ejecuta el televisor: se lo pide al teléfono, que es
   * quien tiene la cola y decide qué suena después.
   */
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeat: RepeatMode;
  cycleRepeat: () => void;
  volume: number;
  setVolume: (v: number) => void;
  muted: boolean;
  toggleMute: () => void;

  /* Superficies que el diseño original abre desde la barra de controles. */
  playlistOpen: boolean;
  setPlaylistOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  settingsOpen: boolean;
  toggleFullscreen: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  /** Nadie ha mandado música todavía. */
  idle: boolean;
  /** El código a enseñar, o nulo si no hay que emparejar. */
  pairingCode: string | null;
  /** No se pudo hablar con el servidor. */
  offline: boolean;
  /**
   * Qué está pasando, en una línea.
   *
   * Se enseña en una esquina siempre. En un televisor no hay consola que abrir,
   * así que sin esto la única información disponible es «no se ve el código», y
   * con eso no se diagnostica nada.
   */
  diagnostic: string;
  synced: boolean;
  chromeVisible: boolean;
  seek: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

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

function toTrack(
  info: { id: string; title: string; artist: string; album: string; cover: string; duration: number },
  lyrics: Lyrics
): Track {
  return {
    id: info.id,
    title: info.title,
    artist: info.artist,
    album: info.album,
    year: new Date().getFullYear(),
    duration: info.duration,
    cover: info.cover,
    // El visualizador necesita un pulso y el API no manda BPM. La animación no
    // pretende ir a compás, solo moverse.
    bpm: 104,
    lyrics: lyrics.lines
  };
}

const fromCast = (media: CastMediaInfo) => ({
  id: media.trackId ?? 'unknown',
  title: media.title,
  artist: media.artist,
  album: media.album,
  cover: media.coverUrl ?? '',
  duration: media.duration
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const onCast = isCastDevice();
  const isDemo = !onCast && new URLSearchParams(window.location.search).has('demo');
  const paired = !onCast && !isDemo;

  // Qué camino tomó, a la vista. Distinguir «se cree un Chromecast» de «está
  // emparejando» costó una tarde de pruebas a ciegas: desde fuera los dos se
  // veían igual, una pantalla de reposo que no hacía nada.
  const channel = onCast ? 'cast' : isDemo ? 'demo' : 'emparejada';

  const [info, setInfo] = useState<ReturnType<typeof fromCast> | null>(null);
  const [lyrics, setLyrics] = useState<Lyrics>(noLyrics);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [diagnostic, setDiagnostic] = useState(`modo ${channel} · iniciando…`);
  const [settings] = useState<Settings>(defaultSettings);

  const theme = themes.find((t) => t.id === 'neon') ?? themes[0];

  /* ---------------- Chromecast ---------------- */

  useEffect(() => {
    if (!onCast) return;

    startCastReceiver({
      onMedia: (media) => {
        setInfo(fromCast(media));
        setPosition(0);
        setLyrics(noLyrics);
      },
      onState: ({ isPlaying: playing, position: seconds }) => {
        setIsPlaying(playing);
        setPosition(seconds);
      },
      onEnded: () => {
        setInfo(null);
        setIsPlaying(false);
        setPosition(0);
        setLyrics(noLyrics);
      }
    });
  }, [onCast]);

  /* ---------------- Emparejada (Samsung, LG, navegador) ---------------- */

  const currentId = useRef<string | null>(null);

  useEffect(() => {
    if (!paired) return;

    let cancelled = false;

    const tick = async () => {
      const state: TvState = await pollTv();
      if (cancelled) return;

      setOffline(state.status === 'offline');
      setDiagnostic(
        `modo ${channel} · ` +
          (state.status === 'offline'
            ? state.reason
            : state.status === 'pairing'
              ? `esperando a que reclamen el código ${state.code}`
              : state.status === 'idle'
                ? 'emparejada, sin música'
                : 'reproduciendo')
      );

      if (state.status === 'pairing') {
        setPairingCode(state.code);
        setInfo(null);
        setIsPlaying(false);
        return;
      }

      setPairingCode(null);

      if (state.status === 'idle') {
        setInfo(null);
        setIsPlaying(false);
        currentId.current = null;
        // Sin canción no hay nada que sonar: se suelta el audio para no dejar
        // el televisor con un búfer cargado indefinidamente.
        detener();
        return;
      }

      if (state.status !== 'playing') return;

      const { nowPlaying } = state;
      const segundos = currentPosition(nowPlaying);
      setIsPlaying(nowPlaying.isPlaying);
      setPosition(segundos);

      // El audio suena **aquí**, en el televisor. El teléfono solo dice qué,
      // dónde y si va: es el mando, no el altavoz.
      const pista = await findTrack(nowPlaying.trackId);
      if (cancelled) return;
      if (pista?.streamUrl) {
        sincronizar({
          streamUrl: pista.streamUrl,
          posicion: segundos,
          reproduciendo: nowPlaying.isPlaying
        });
      }

      // Solo se resuelve el catálogo al cambiar de canción, no en cada vuelta.
      if (currentId.current !== nowPlaying.trackId) {
        currentId.current = nowPlaying.trackId;
        setLyrics(noLyrics);

        const track = pista;
        if (cancelled || currentId.current !== nowPlaying.trackId) return;

        setInfo(
          track
            ? {
                id: track.id,
                title: track.title,
                artist: track.artist,
                album: track.album,
                cover: track.coverUrl,
                duration: track.duration
              }
            : // El catálogo no la conoce —recién publicada, o caché viejo—. Se
              // enseña lo que se sabe en vez de quedarse en la pantalla de espera.
              { id: nowPlaying.trackId, title: 'Reproduciendo', artist: '', album: '', cover: '', duration: 0 }
        );
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paired, channel]);

  /* ---------------- Demostración ---------------- */

  useEffect(() => {
    if (!isDemo) return;

    const demo = demoTracks[0];
    setInfo({
      id: demo.id,
      title: demo.title,
      artist: demo.artist,
      album: demo.album,
      cover: demo.cover,
      duration: demo.duration
    });
    setLyrics({ synced: true, lines: demo.lyrics });
    setIsPlaying(true);

    const id = window.setInterval(() => {
      setPosition((p) => (p + 0.25 >= demo.duration ? 0 : p + 0.25));
    }, 250);
    return () => window.clearInterval(id);
  }, [isDemo]);

  /* ---------------- Letra ---------------- */

  const trackId = info?.id ?? null;

  useEffect(() => {
    if (isDemo || !trackId || trackId === 'unknown') return;

    const controller = new AbortController();
    void fetchLyrics(trackId, controller.signal).then(setLyrics);
    return () => controller.abort();
  }, [isDemo, trackId]);

  /* ---------------- Presentación ---------------- */

  const idle = info === null;
  const track = useMemo(() => (info ? toTrack(info, lyrics) : idleTrack), [info, lyrics]);

  /**
   * Qué se enseña, decidido solo. En una TV no hay dónde pulsar.
   *
   * Se exige `synced` para la letra: una sin marcas llega con todos los tiempos
   * a cero y el karaoke los daría todos por cantados, resaltando el final de la
   * canción desde el primer segundo.
   */
  const automatico: PlayerMode = idle ? 'visualizer' : lyrics.synced ? 'lyrics' : 'cover';

  /**
   * Las vistas por las que pasa el mando, en orden.
   *
   * Están todas las del diseño original. La primera versión de esta pantalla
   * solo tenía tres porque borré las demás dando por hecho que un televisor no
   * podía manejarlas; sí puede, con las flechas.
   */
  const VISTAS: PlayerMode[] = ['cover', 'lyrics', 'visualizer', 'party', 'video', 'immersive'];

  /**
   * El mando manda sobre la elección automática.
   *
   * La vista se elige sola —letra si la hay, si no carátula—, pero quien mira
   * tiene que poder cambiarla. Sin esto, una canción con letra dejaba al usuario
   * encerrado en el karaoke sin forma de ver la portada ni el visualizador.
   *
   * La elección manual se olvida al cambiar de canción: es una preferencia del
   * momento, no un ajuste.
   */
  const [manual, setManual] = useState<PlayerMode | null>(null);
  const mode: PlayerMode = manual ?? automatico;
  const partyMode = mode === 'party';

  const [vizStyle, setVizStyle] = useState<VizStyle>('spectrum');
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // La elección manual se olvida al cambiar de canción: es una preferencia del
  // momento, no un ajuste.
  useEffect(() => setManual(null), [trackId]);

  /*
   * El mando, una sola vez.
   *
   * `setupTizen` añade un escuchador de teclas; registrarlo en cada cambio de
   * `automatico` dejaba uno nuevo por cada canción, y una pulsación acababa
   * saltando varias vistas de golpe.
   */
  const modoRef = useRef<PlayerMode>(automatico);
  modoRef.current = mode;

  useEffect(() => {
    setupTizen((accion) => {
      if (accion === 'alternar') {
        setManual(null);
        return;
      }
      const desde = VISTAS.indexOf(modoRef.current);
      const paso = accion === 'anterior' ? -1 : 1;
      setManual(VISTAS[(desde + paso + VISTAS.length) % VISTAS.length]);
    });
    // Sin dependencias a propósito: el escuchador lee el modo por `ref`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    root.style.setProperty('--glow', String(settings.glow * settings.lightIntensity));
    root.style.setProperty('--brightness', String(settings.brightness));
    root.style.setProperty('--panel-opacity', String(settings.panelOpacity));
  }, [theme, settings.glow, settings.lightIntensity, settings.brightness, settings.panelOpacity]);

  /**
   * Entre dos avisos pasan segundos y la letra se vería a saltos. Esto interpola
   * en medio; cada consulta real vuelve a fijar la posición, así que la cuenta
   * nunca se separa de la verdad.
   */
  const lastTick = useRef(Date.now());
  useEffect(() => {
    if (isDemo || !isPlaying) return;

    lastTick.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setPosition((p) => p + delta);
    }, 100);
    return () => window.clearInterval(id);
  }, [isDemo, isPlaying]);

  const seek = useCallback(() => undefined, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      tracks: [track],
      track,
      index: 0,
      isPlaying,
      position,
      mode,
      setMode: (m: PlayerMode) => setManual(m),
      vizStyle,
      setVizStyle,
      theme,
      partyMode,
      togglePartyMode: () => setManual((actual) => (actual === 'party' ? null : 'party')),
      settings,

      // Cada botón se traduce en una orden para el teléfono. La pantalla no
      // cambia su estado al pulsar: espera a que el teléfono lo confirme en la
      // siguiente consulta, que es lo que evita que se vean dos verdades.
      togglePlay: () => void enviarOrden(isPlaying ? 'pause' : 'play'),
      next: () => void enviarOrden('next'),
      prev: () => void enviarOrden('previous'),
      shuffle,
      toggleShuffle: () => {
        setShuffle((s) => !s);
        void enviarOrden('shuffle');
      },
      repeat,
      cycleRepeat: () => {
        setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
        void enviarOrden('repeat');
      },
      // El volumen sí es local: lo que suena sale de este televisor.
      volume,
      setVolume: (v: number) => {
        setVolume(v);
        setMuted(v === 0);
        volumenTv(v / 100);
      },
      muted,
      toggleMute: () => {
        setMuted((m) => {
          volumenTv(m ? volume / 100 : 0);
          return !m;
        });
      },

      playlistOpen,
      setPlaylistOpen,
      settingsOpen,
      setSettingsOpen,
      toggleFullscreen: () => {
        // En un televisor ya se ve a pantalla completa; el botón queda para
        // cuando esta misma página se abre en un navegador.
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      },
      favorites,
      toggleFavorite: (id: string) =>
        setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      idle,
      pairingCode,
      offline,
      diagnostic,
      synced: lyrics.synced,
      chromeVisible: true,
      seek
    }),
    [
      track,
      isPlaying,
      position,
      mode,
      vizStyle,
      partyMode,
      theme,
      settings,
      idle,
      pairingCode,
      offline,
      diagnostic,
      lyrics.synced,
      seek
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer debe usarse dentro de PlayerProvider');
  return ctx;
}
