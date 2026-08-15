import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { PlayingBars } from './PlayingBars';

export function NowPlayingBadge() {
  const { track, isPlaying, settings } = usePlayer();
  if (!settings.showSongInfo) return null;

  return (
    <div className="glass flex max-w-[22vw] items-center gap-4 rounded-2xl px-5 py-3.5">
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        <span
          className={`absolute h-3 w-3 rounded-full bg-c2 ${isPlaying ? 'animate-beatDot' : 'opacity-40'}`}
          style={{ boxShadow: '0 0 14px rgb(var(--c2-rgb) / 0.9)' }} />
        
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-[0.22em] text-c2">
          {isPlaying ? '▶ REPRODUCIENDO' : '❙❙ EN PAUSA'}
        </p>
        <p className="mt-1 truncate font-display text-xl font-bold leading-tight">{track.title}</p>
        <p className="truncate text-base text-white/60">{track.artist}</p>
      </div>
      <PlayingBars bars={4} className="shrink-0" />
    </div>);

}