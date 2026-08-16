import React from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '../../contexts/PlayerContext';
import { ProgressBar } from '../ProgressBar';
import { PlayingBars } from '../PlayingBars';
import { formatTime } from '../../utils/format';

export function VideoMode() {
  const { track, chromeVisible, isPlaying, position, settings } = usePlayer();

  return (
    <div className="relative h-full w-full px-[2vw] py-[2vh]">
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-black ring-1 ring-white/10">
        <motion.img
          key={track.id}
          src={track.video ?? track.cover}
          alt={`Video de ${track.title}`}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={`h-full w-full object-cover ${settings.animations ? 'animate-panGradient' : ''}`} />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

        {/* Discreet overlay — fades out with the rest of the chrome */}
        <div
          className="absolute inset-x-0 bottom-0 p-[3vw] transition-opacity duration-300 ease-out"
          style={{ opacity: chromeVisible ? 1 : 0 }}>
          
          <div className="flex items-end justify-between gap-8">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-base font-semibold tracking-[0.2em] text-c2">
                <PlayingBars bars={3} />
                <span>{isPlaying ? 'VIDEO EN VIVO' : 'VIDEO EN PAUSA'}</span>
              </div>
              <h2 className="text-glow mt-2 truncate font-display text-[3.6vw] font-extrabold leading-tight">
                {track.title}
              </h2>
              <p className="mt-1 font-display text-[1.6vw] font-semibold text-white/70">
                {track.artist}
              </p>
            </div>
            <div className="shrink-0 rounded-xl bg-black/50 px-4 py-2 font-sans text-lg tabular-nums text-white/80 ring-1 ring-white/10">
              {formatTime(position)} / {formatTime(track.duration)}
            </div>
          </div>
          <ProgressBar size="sm" showTimes={false} className="mt-5" />
        </div>
      </div>
    </div>);

}