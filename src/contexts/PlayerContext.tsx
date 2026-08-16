import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { hexToRgbTriplet, themes } from '../data/themes';
import { audioSim } from '../utils/audioSim';
import { fetchLyrics, noLyrics, type Lyrics } from '../services/lyricsApi';
import type { CatalogTrack } from '../services/catalogApi';
import * as reproductor from '../services/localPlayer';
import { currentPosition, pollTv, type TvState } from '../services/tvApi';
import { setupTizen, type AccionMando } from '../tizen';
import type { PlayerMode, RepeatMode, Settings, Track, VisualTheme, VizStyle } from '../types/player';

/**
 * El estado de la aplicación de televisor.
 *
 * **Funciona sola.** Se abre con el mando, se navega con el mando y reproduce
 * su propio audio: no hace falta ningún teléfono. La primera versión dependía
 * del móvil para todo, y eso convertía una aplicación de televisor en un cartel
 * que solo dibujaba lo que sonaba en otro sitio.
 *
 * El teléfono sigue pudiendo mandar música —si alguien empareja el suyo, esta
 * pantalla lo sigue— pero es un extra, no un requisito.
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

/** Cada cuánto se mira si un teléfono emparejado mandó algo. */
const POLL_MS = 3_000;

const VISTAS: PlayerMode[] = ['cover', 'lyrics', 'visualizer', 'party', 'video', 'immersive'];

interface PlayerContextValue {
  tracks: Track[];
  track: Track;
  index: number;
  isPlaying: boolean;
  position: number;
  duration: number;

  mode: PlayerMode;
  setMode: (m: PlayerMode) => void;
  vizStyle: VizStyle;
  setVizStyle: (s: VizStyle) => void;
  theme: VisualTheme;
  partyMode: boolean;
  togglePartyMode: () => void;
  settings: Settings;

  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeat: RepeatMode;
  cycleRepeat: () => void;
  volume: number;
  setVolume: (v: number) => void;
  muted: boolean;
  toggleMute: () => void;

  playlistOpen: boolean;
  setPlaylistOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  toggleFullscreen: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  /** Reproduce una fila de la lista. La usa el panel de playlist. */
  selectTrack: (i: number) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setThemeId: (id: string) => void;

  /** La biblioteca, y qué fila tiene el cursor del mando. */
  libraryOpen: boolean;
  librarySelection: number;
  onLibraryTracks: (pistas: CatalogTrack[]) => void;

  /** Un teléfono emparejado quiere enviar música: se enseña su código. */
  pairingCode: string | null;
  chromeVisible: boolean;
  synced: boolean;
  diagnostic: string;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const pistaVacia: Track = {
  id: 'idle',
  title: 'Pulse',
  artist: 'Elige una canción',
  album: '',
  year: new Date().getFullYear(),
  duration: 0,
  cover: '',
  bpm: 96,
  lyrics: []
};

function aTrack(p: CatalogTrack | null, lyrics: Lyrics): Track {
  if (!p) return pistaVacia;
  return {
    id: p.id,
    title: p.title,
    artist: p.artist,
    album: p.album,
    year: new Date().getFullYear(),
    duration: p.duration,
    cover: p.coverUrl,
    // El API no manda BPM y el visualizador necesita un pulso. No pretende ir a
    // compás: solo moverse.
    bpm: 104,
    lyrics: lyrics.lines
  };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<reproductor.EstadoLocal | null>(null);
  const [lyrics, setLyrics] = useState<Lyrics>(noLyrics);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [themeId, setThemeId] = useState('neon');

  const [manual, setManual] = useState<PlayerMode | null>(null);
  const [vizStyle, setVizStyle] = useState<VizStyle>('spectrum');
  const [muted, setMuted] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState('iniciando…');

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySelection, setLibrarySelection] = useState(0);
  const pistasRef = useRef<CatalogTrack[]>([]);

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  /* ---------------- El reproductor de este televisor ---------------- */

  useEffect(() => reproductor.suscribir(setLocal), []);

  // Al arrancar se prepara el catálogo entero como cola, pero **sin sonar**:
  // que una aplicación empiece a dar música sola al encenderla es agresivo.
  useEffect(() => {
    void reproductor.arrancarCatalogo().then((ids) => {
      if (ids.length) reproductor.preparar(ids);
      setDiagnostic(`${ids.length} canciones · AMARILLO abre tu música`);
    });
  }, []);

  /* ---------------- Un teléfono emparejado, si lo hay ---------------- */

  const ultimaDelMovil = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const tick = async () => {
      const estado: TvState = await pollTv();
      if (cancelado) return;

      if (estado.status === 'pairing') {
        setPairingCode(estado.code);
        return;
      }
      setPairingCode(null);

      if (estado.status !== 'playing') return;

      // El teléfono manda solo cuando cambia de canción: si no, mandaría cada
      // pocos segundos sobre lo que se esté eligiendo con el mando, y no se
      // podría usar el televisor mientras haya un móvil emparejado.
      const { nowPlaying } = estado;
      if (ultimaDelMovil.current === nowPlaying.trackId) return;
      ultimaDelMovil.current = nowPlaying.trackId;

      await reproductor.reproducir([nowPlaying.trackId], 0);
      reproductor.saltar(currentPosition(nowPlaying));
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelado = true;
      window.clearInterval(timer);
    };
  }, []);

  /* ---------------- Letra ---------------- */

  const trackId = local?.pista?.id ?? null;

  useEffect(() => {
    if (!trackId) return;
    const controller = new AbortController();
    setLyrics(noLyrics);
    void fetchLyrics(trackId, controller.signal).then(setLyrics);
    return () => controller.abort();
  }, [trackId]);

  /* ---------------- Presentación ---------------- */

  const track = useMemo(() => aTrack(local?.pista ?? null, lyrics), [local?.pista, lyrics]);
  const automatico: PlayerMode = lyrics.synced ? 'lyrics' : 'cover';
  const mode: PlayerMode = manual ?? automatico;
  const partyMode = mode === 'party';

  useEffect(() => setManual(null), [trackId]);

  useEffect(() => {
    audioSim.playing = Boolean(local?.reproduciendo);
    audioSim.bpm = track.bpm;
    audioSim.sensitivity = settings.sensitivity;
    audioSim.speed = settings.vizSpeed;
  }, [local?.reproduciendo, track.bpm, settings.sensitivity, settings.vizSpeed]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--c1-rgb', hexToRgbTriplet(theme.colors[0]));
    root.style.setProperty('--c2-rgb', hexToRgbTriplet(theme.colors[1]));
    root.style.setProperty('--c3-rgb', hexToRgbTriplet(theme.colors[2]));
    root.style.setProperty('--bg-rgb', hexToRgbTriplet(theme.bg));
    root.style.setProperty('--glow', String(settings.glow * settings.lightIntensity));
    root.style.setProperty('--brightness', String(settings.brightness));
    root.style.setProperty('--panel-opacity', String(settings.panelOpacity));
  }, [theme, settings]);

  /* ---------------- El mando ---------------- */

  const vista = useRef({ libraryOpen, librarySelection, mode });
  vista.current = { libraryOpen, librarySelection, mode };

  useEffect(() => {
    setupTizen((accion: AccionMando) => {
      const { libraryOpen: abierta, librarySelection: fila, mode: actual } = vista.current;
      const total = pistasRef.current.length;

      // Con la biblioteca abierta, el mando le pertenece entera.
      if (abierta) {
        if (accion === 'arriba') setLibrarySelection((f) => Math.max(0, f - 1));
        else if (accion === 'abajo') setLibrarySelection((f) => Math.min(total - 1, f + 1));
        else if (accion === 'izquierda') setLibrarySelection((f) => Math.max(0, f - 10));
        else if (accion === 'derecha') setLibrarySelection((f) => Math.min(total - 1, f + 10));
        else if (accion === 'aceptar') {
          const ids = pistasRef.current.map((p) => p.id);
          void reproductor.reproducir(ids, fila);
          setLibraryOpen(false);
        } else if (accion === 'atras' || accion === 'biblioteca') {
          setLibraryOpen(false);
        }
        return true;
      }

      if (accion === 'biblioteca') {
        setLibrarySelection(Math.max(0, local?.indice ?? 0));
        setLibraryOpen(true);
        return true;
      }
      if (accion === 'aceptar' || accion === 'reproducirPausar') {
        reproductor.alternar();
        return true;
      }
      if (accion === 'derecha' || accion === 'siguiente') {
        void reproductor.siguiente();
        return true;
      }
      if (accion === 'izquierda' || accion === 'anterior') {
        void reproductor.anterior();
        return true;
      }
      if (accion === 'arriba' || accion === 'abajo' || accion === 'modo') {
        const paso = accion === 'arriba' ? -1 : 1;
        const desde = VISTAS.indexOf(actual);
        setManual(VISTAS[(desde + paso + VISTAS.length) % VISTAS.length]);
        return true;
      }
      // «Atrás» sin nada abierto cierra la aplicación: lo hace `setupTizen`.
      return false;
    });
    // Sin dependencias: el manejador lee el estado por `ref`. Con ellas se
    // registraría un escuchador nuevo por cada cambio y una pulsación saltaría
    // varias vistas de golpe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLibraryTracks = useCallback((pistas: CatalogTrack[]) => {
    pistasRef.current = pistas;
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      tracks: [track],
      track,
      index: 0,
      isPlaying: Boolean(local?.reproduciendo),
      position: local?.posicion ?? 0,
      duration: local?.duracion ?? track.duration,

      mode,
      setMode: setManual,
      vizStyle,
      setVizStyle,
      theme,
      partyMode,
      togglePartyMode: () => setManual((a) => (a === 'party' ? null : 'party')),
      settings,

      togglePlay: () => reproductor.alternar(),
      next: () => void reproductor.siguiente(),
      prev: () => void reproductor.anterior(),
      seek: (s: number) => reproductor.saltar(s),
      shuffle: Boolean(local?.aleatorio),
      toggleShuffle: () => reproductor.alternarAleatorio(),
      repeat: (local?.repetir ?? 'off') as RepeatMode,
      cycleRepeat: () => reproductor.ciclarRepetir(),
      volume: Math.round((local?.volumen ?? 1) * 100),
      setVolume: (v: number) => {
        reproductor.volumen(v / 100);
        setMuted(v === 0);
      },
      muted,
      toggleMute: () => {
        setMuted((m) => {
          reproductor.volumen(m ? 1 : 0);
          return !m;
        });
      },

      playlistOpen,
      setPlaylistOpen,
      settingsOpen,
      setSettingsOpen,
      toggleFullscreen: () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      },
      favorites,
      toggleFavorite: (id: string) =>
        setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      selectTrack: (i: number) => void reproductor.reproducir(pistasRef.current.map((t) => t.id), i),
      updateSetting: (key, valor) => setSettings((s) => ({ ...s, [key]: valor })),
      setThemeId,

      libraryOpen,
      librarySelection,
      onLibraryTracks,

      pairingCode,
      chromeVisible: true,
      synced: lyrics.synced,
      diagnostic
    }),
    [
      track,
      local,
      mode,
      vizStyle,
      theme,
      partyMode,
      settings,
      muted,
      playlistOpen,
      settingsOpen,
      favorites,
      libraryOpen,
      librarySelection,
      onLibraryTracks,
      pairingCode,
      lyrics.synced,
      diagnostic
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer debe usarse dentro de PlayerProvider');
  return ctx;
}
