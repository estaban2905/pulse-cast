import React from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '../../contexts/PlayerContext';
import { Visualizer } from '../Visualizer';
import { PlayingBars } from '../PlayingBars';

const EASE = [0.23, 1, 0.32, 1] as const;

export function LyricsMode() {
  const { track, position, settings, seek } = usePlayer();
  const lyrics = track.lyrics;
  const current = Math.max(
    0,
    lyrics.reduce((acc, line, i) => position >= line.t ? i : acc, 0)
  );
  const line = lyrics[current];
  const nextT = lyrics[current + 1]?.t ?? track.duration;
  const spanProgress = Math.max(
    0,
    Math.min(1, (position - line.t) / Math.max(1, nextT - line.t) * settings.lyricsSpeed)
  );

  const colorClass =
  settings.lyricsColor === 'white' ?
  'text-white' :
  settings.lyricsColor === 'accent' ?
  'text-c2' :
  'text-c1';
  const fontClass = settings.lyricsFont === 'sans' ? 'font-sans' : 'font-display';
  const scale = settings.lyricsSize;

  const visible = [current - 2, current - 1, current, current + 1, current + 2];

  return (
    <div
      className={`relative flex h-full w-full flex-col px-[7vw] ${
      settings.lyricsPosition === 'bottom' ? 'justify-end pb-[16vh]' : 'justify-center'}`
      }>
      
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[26vh] opacity-40">
        <Visualizer style="waves" intensity={0.7} />
      </div>

      <div className="mb-[4vh] flex items-center gap-4 text-lg tracking-[0.2em] text-white/45">
        <PlayingBars bars={4} />
        <span className="font-semibold">KARAOKE</span>
        <span className="h-1 w-1 rounded-full bg-white/30" />
        <span className="truncate text-white/70">
          {track.title} — {track.artist}
        </span>
      </div>

      <div className="relative space-y-[2.2vh]">
        {visible.map((i) => {
          const l = lyrics[i];
          if (!l) return null;
          const isCurrent = i === current;
          const distance = Math.abs(i - current);
          return (
            <motion.button
              key={`${track.id}-${i}`}
              type="button"
              onClick={() => seek(l.t + 0.1)}
              layout
              initial={{ opacity: 0, y: 34 }}
              animate={{
                opacity: isCurrent ? 1 : distance === 1 ? 0.42 : 0.16,
                y: 0
              }}
              transition={{ duration: 0.28, ease: EASE }}
              className="block w-full text-left focus:outline-none focus-visible:underline">
              
              {isCurrent ?
              <span
                className={`relative inline-block ${fontClass} font-extrabold leading-[1.05] tracking-tight`}
                style={{ fontSize: `${4.6 * scale}vw` }}>
                
                  <span className="whitespace-nowrap text-white/25">{l.text}</span>
                  <span
                  className={`text-glow absolute inset-0 overflow-hidden whitespace-nowrap ${colorClass}`}
                  style={{
                    width: `${spanProgress * 100}%`,
                    transition: 'width 250ms linear'
                  }}>
                  
                    {l.text}
                  </span>
                </span> :

              <span
                className={`${fontClass} font-bold leading-[1.15] tracking-tight text-white`}
                style={{ fontSize: `${(distance === 1 ? 2.5 : 1.8) * scale}vw` }}>
                
                  {l.text}
                </span>
              }
            </motion.button>);

        })}
      </div>
    </div>);

}