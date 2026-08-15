export interface LyricLine {
  t: number;
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  duration: number;
  cover: string;
  bpm: number;
  video?: string;
  lyrics: LyricLine[];
}

export interface VisualTheme {
  id: string;
  name: string;
  colors: [string, string, string];
  bg: string;
}

export type PlayerMode = 'cover' | 'lyrics' | 'video' | 'visualizer' | 'party' | 'immersive';

export type VizStyle = 'spectrum' | 'waves' | 'circular' | 'particles' | 'neon' | 'pulse';

export type RepeatMode = 'off' | 'all' | 'one';

export interface Settings {
  lightIntensity: number;
  brightness: number;
  panelOpacity: number;
  animations: boolean;
  sensitivity: number;
  vizSpeed: number;
  particles: number;
  glow: number;
  lyricsSize: number;
  lyricsFont: 'display' | 'sans';
  lyricsColor: 'theme' | 'white' | 'accent';
  lyricsPosition: 'center' | 'bottom';
  lyricsSpeed: number;
  showClock: boolean;
  showSongInfo: boolean;
  showPlaylist: boolean;
}