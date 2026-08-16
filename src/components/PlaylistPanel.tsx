import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HeartIcon,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon } from
'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { formatTime } from '../utils/format';
import { PlayingBars } from './PlayingBars';

export function PlaylistPanel() {
  const {
    tracks,
    index,
    track,
    playlistOpen,
    setPlaylistOpen,
    selectTrack,
    isPlaying,
    togglePlay,
    next,
    prev,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    favorites,
    toggleFavorite
  } = usePlayer();

  const upNext = tracks[(index + 1) % tracks.length];

  return (
    <AnimatePresence>
      {playlistOpen &&
      <motion.aside
        key="playlist"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
        aria-label="Lista de reproducción"
        className="glass pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-[34vw] min-w-[420px] flex-col rounded-l-[28px] p-7">
        
          <header className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">En cola</h2>
              <p className="mt-1 text-base text-white/50">
                {tracks.length} canciones · siguiente: {upNext.title}
              </p>
            </div>
            <button
            type="button"
            onClick={() => setPlaylistOpen(false)}
            aria-label="Cerrar lista de reproducción"
            className="rounded-full p-3 text-white/60 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
            
              <XIcon className="h-7 w-7" />
            </button>
          </header>

          {/* Current track hero */}
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-c1/12 p-4 ring-1 ring-c1/40">
            <img
            src={track.cover}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
            style={{ boxShadow: '0 0 30px rgb(var(--c1-rgb) / 0.45)' }} />
          
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-[0.2em] text-c2">AHORA SUENA</p>
              <p className="mt-1 truncate font-display text-xl font-bold">{track.title}</p>
              <p className="truncate text-base text-white/60">{track.artist}</p>
            </div>
            <PlayingBars bars={4} />
          </div>

          <ol className="no-scrollbar mt-5 flex-1 space-y-1.5 overflow-y-auto pr-2">
            {tracks.map((t, i) => {
            const isCurrent = i === index;
            const isFav = favorites.includes(t.id);
            return (
              <li key={t.id}>
                  <div
                  className={`group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors duration-150 ease-out ${
                  isCurrent ? 'bg-white/10' : 'hover:bg-white/[0.06]'}`
                  }>
                  
                    <button
                    type="button"
                    onClick={() => selectTrack(i)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
                    
                      <span
                      className={`w-7 shrink-0 text-center font-sans text-lg tabular-nums ${
                      isCurrent ? 'text-c1' : 'text-white/35'}`
                      }>
                      
                        {(i + 1).toString().padStart(2, '0')}
                      </span>
                      <img src={t.cover} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span
                        className={`block truncate font-display text-lg font-semibold ${
                        isCurrent ? 'text-white' : 'text-white/85'}`
                        }>
                        
                          {t.title}
                        </span>
                        <span className="block truncate text-sm text-white/50">{t.artist}</span>
                      </span>
                      <span className="shrink-0 font-sans text-base tabular-nums text-white/40">
                        {formatTime(t.duration)}
                      </span>
                    </button>
                    <button
                    type="button"
                    onClick={() => toggleFavorite(t.id)}
                    aria-label={isFav ? `Quitar ${t.title} de favoritos` : `Añadir ${t.title} a favoritos`}
                    aria-pressed={isFav}
                    className="shrink-0 rounded-full p-2 transition-colors duration-150 ease-out hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
                    
                      <HeartIcon
                      className={`h-5 w-5 ${isFav ? 'fill-c1 text-c1' : 'text-white/35'}`} />
                    
                    </button>
                  </div>
                </li>);

          })}
          </ol>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            <button
            type="button"
            onClick={toggleShuffle}
            aria-label="Aleatorio"
            aria-pressed={shuffle}
            className={`rounded-full p-3.5 transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
            shuffle ? 'bg-c1/25 text-c1' : 'text-white/55 hover:bg-white/10 hover:text-white'}`
            }>
            
              <ShuffleIcon className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <button
              type="button"
              onClick={prev}
              aria-label="Canción anterior"
              className="rounded-full p-3.5 text-white/80 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
              
                <SkipBackIcon className="h-7 w-7" />
              </button>
              <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              className="rounded-full bg-white p-4 text-black transition-transform duration-150 ease-out hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
              
                {isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}
              </button>
              <button
              type="button"
              onClick={next}
              aria-label="Siguiente canción"
              className="rounded-full p-3.5 text-white/80 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
              
                <SkipForwardIcon className="h-7 w-7" />
              </button>
            </div>
            <button
            type="button"
            onClick={cycleRepeat}
            aria-label={`Repetir: ${repeat}`}
            className={`rounded-full p-3.5 transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
            repeat !== 'off' ? 'bg-c1/25 text-c1' : 'text-white/55 hover:bg-white/10 hover:text-white'}`
            }>
            
              {repeat === 'one' ? <Repeat1Icon className="h-6 w-6" /> : <RepeatIcon className="h-6 w-6" />}
            </button>
          </div>
        </motion.aside>
      }
    </AnimatePresence>);

}