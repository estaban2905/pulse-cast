import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { formatTime } from '../utils/format';

interface ProgressBarProps {
  size?: 'lg' | 'sm';
  showTimes?: boolean;
  className?: string;
}

export function ProgressBar({ size = 'lg', showTimes = true, className = '' }: ProgressBarProps) {
  const { position, track, seek } = usePlayer();
  const pct = Math.min(100, position / track.duration * 100);
  const height = size === 'lg' ? 'h-3' : 'h-1.5';

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - rect.left) / rect.width * track.duration);
  };

  return (
    <div className={className}>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Progreso de la canción"
        aria-valuemin={0}
        aria-valuemax={Math.floor(track.duration)}
        aria-valuenow={Math.floor(position)}
        onClick={onSeek}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seek(position + 5);
          if (e.key === 'ArrowLeft') seek(position - 5);
        }}
        className={`group relative w-full cursor-pointer rounded-full bg-white/10 ${height} focus:outline-none focus-visible:ring-2 focus-visible:ring-c2`}>
        
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-c2 to-c1"
          style={{
            width: `${pct}%`,
            boxShadow: '0 0 calc(22px * var(--glow)) rgb(var(--c1-rgb) / 0.75)'
          }} />
        
        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-c1/40 transition-transform duration-150 ease-out group-hover:scale-125 ${
          size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'}`
          }
          style={{ left: `${pct}%` }} />
        
      </div>
      {showTimes &&
      <div
        className={`mt-3 flex items-center justify-between font-sans tabular-nums text-white/60 ${
        size === 'lg' ? 'text-xl' : 'text-sm'}`
        }>
        
          <span className="text-white/85">{formatTime(position)}</span>
          <span>{formatTime(track.duration)}</span>
        </div>
      }
    </div>);

}