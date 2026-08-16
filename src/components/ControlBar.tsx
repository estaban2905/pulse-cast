import React, { useRef } from 'react';
import {
  ActivityIcon,
  FilmIcon,
  HeartIcon,
  ListMusicIcon,
  MaximizeIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  SettingsIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SparklesIcon,
  Volume2Icon,
  VolumeXIcon } from
'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { useSpatialNav } from '../navigation/useSpatialNav';

interface IconButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function IconButton({ label, active = false, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-2xl p-3.5 transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
      active ?
      'bg-c1/25 text-c1 ring-1 ring-c1/50' :
      'text-white/60 hover:bg-white/10 hover:text-white'}`
      }>
      
      {children}
    </button>);

}

export function ControlBar() {
  const barraRef = useRef<HTMLDivElement>(null);
  const {
    isPlaying,
    togglePlay,
    next,
    prev,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    volume,
    setVolume,
    muted,
    toggleMute,
    mode,
    setMode,
    playlistOpen,
    setPlaylistOpen,
    setSettingsOpen,
    toggleFullscreen,
    partyMode,
    togglePartyMode,
    favorites,
    track,
    toggleFavorite,
    chromeVisible
  } = usePlayer();

  const isFav = favorites.includes(track.id);

  // La barra solo captura las flechas si está visible y no hay otra vista
  // (biblioteca, playlist, settings) robándose el foco.
  const navActiva = chromeVisible && !playlistOpen;
  useSpatialNav({ contenedor: barraRef, eje: 'x', activo: navActiva });

  return (
    <div
      ref={barraRef}
      className="glass pointer-events-auto flex items-center gap-7 rounded-[28px] px-7 py-4 transition-all duration-300 ease-smooth"
      style={{
        opacity: chromeVisible ? 1 : 0,
        transform: chromeVisible ? 'translateY(0)' : 'translateY(40px)'
      }}>
      
      {/* Transport */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          aria-label="Canción anterior"
          className="rounded-2xl p-4 text-white/85 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
          
          <SkipBackIcon className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          className="rounded-full bg-white p-5 text-black transition-transform duration-150 ease-out hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-c2"
          style={{ boxShadow: '0 0 calc(38px * var(--glow)) rgb(var(--c1-rgb) / 0.5)' }}>
          
          {isPlaying ? <PauseIcon className="h-9 w-9" /> : <PlayIcon className="h-9 w-9" />}
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Siguiente canción"
          className="rounded-2xl p-4 text-white/85 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
          
          <SkipForwardIcon className="h-8 w-8" />
        </button>
      </div>

      <span className="h-10 w-px bg-white/10" />

      {/* Volume */}
      <div className="flex items-center gap-4">
        <IconButton label={muted ? 'Activar sonido' : 'Silenciar'} active={muted} onClick={toggleMute}>
          {muted || volume === 0 ?
          <VolumeXIcon className="h-6 w-6" /> :

          <Volume2Icon className="h-6 w-6" />
          }
        </IconButton>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="Volumen"
          className="h-2 w-36 cursor-pointer appearance-none rounded-full bg-white/15 accent-white [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
        
        <span className="w-10 font-sans text-base tabular-nums text-white/50">
          {muted ? 0 : Math.round(volume * 100)}
        </span>
      </div>

      <span className="h-10 w-px bg-white/10" />

      {/* Playback options */}
      <div className="flex items-center gap-2">
        <IconButton label="Aleatorio" active={shuffle} onClick={toggleShuffle}>
          <ShuffleIcon className="h-6 w-6" />
        </IconButton>
        <IconButton
          label={repeat === 'one' ? 'Repetir canción' : repeat === 'all' ? 'Repetir lista' : 'Repetir desactivado'}
          active={repeat !== 'off'}
          onClick={cycleRepeat}>
          
          {repeat === 'one' ? <Repeat1Icon className="h-6 w-6" /> : <RepeatIcon className="h-6 w-6" />}
        </IconButton>
        <IconButton label="Favorito" active={isFav} onClick={() => toggleFavorite(track.id)}>
          <HeartIcon className={`h-6 w-6 ${isFav ? 'fill-c1' : ''}`} />
        </IconButton>
      </div>

      <span className="h-10 w-px bg-white/10" />

      {/* Views */}
      <div className="flex items-center gap-2">
        <IconButton
          label="Letras"
          active={mode === 'lyrics'}
          onClick={() => setMode(mode === 'lyrics' ? 'cover' : 'lyrics')}>
          
          <MicIcon className="h-6 w-6" />
        </IconButton>
        <IconButton
          label="Video"
          active={mode === 'video'}
          onClick={() => setMode(mode === 'video' ? 'cover' : 'video')}>
          
          <FilmIcon className="h-6 w-6" />
        </IconButton>
        <IconButton
          label="Visualizador"
          active={mode === 'visualizer'}
          onClick={() => setMode(mode === 'visualizer' ? 'cover' : 'visualizer')}>
          
          <ActivityIcon className="h-6 w-6" />
        </IconButton>
        <IconButton label="Lista de reproducción" active={playlistOpen} onClick={() => setPlaylistOpen(!playlistOpen)}>
          <ListMusicIcon className="h-6 w-6" />
        </IconButton>
        <IconButton label="Pantalla completa" onClick={toggleFullscreen}>
          <MaximizeIcon className="h-6 w-6" />
        </IconButton>
        <IconButton label="Configuración" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon className="h-6 w-6" />
        </IconButton>
      </div>

      {/* Party mode — the loudest control on the bar */}
      <button
        type="button"
        onClick={togglePartyMode}
        aria-pressed={partyMode}
        className={`ml-1 flex items-center gap-3 rounded-2xl px-6 py-4 font-display text-lg font-extrabold tracking-[0.12em] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
        partyMode ?
        'bg-c1 text-black' :
        'bg-white/10 text-white hover:bg-white/20'}`
        }
        style={partyMode ? { boxShadow: '0 0 calc(46px * var(--glow)) rgb(var(--c1-rgb) / 0.75)' } : undefined}>
        
        <SparklesIcon className="h-6 w-6" />
        PARTY
      </button>
    </div>);

}