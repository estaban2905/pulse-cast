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

  /*
   * Sin letra no hay nada que cantar, y hay que decirlo.
   *
   * Este componente daba por hecho que siempre había al menos un verso, porque
   * en el diseño original las canciones venían con letra escrita a mano. Con el
   * catálogo real muchas no la tienen, y al cambiar a esta vista con el mando
   * `lyrics[0]` era `undefined`: la aplicación entera se caía con
   * «Cannot read property 't' of undefined» y la pantalla quedaba muerta.
   */
  if (!line) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-[8vw] text-center">
        <div className="mb-[3vh] flex items-center gap-4 text-lg tracking-[0.2em] text-white/40">
          <PlayingBars bars={4} />
          <span className="font-semibold">KARAOKE</span>
        </div>
        <p className="font-display font-extrabold text-white/70" style={{ fontSize: '3vw' }}>
          Esta canción no tiene letra
        </p>
        <p className="mt-[2vh] text-white/35" style={{ fontSize: '1.4vw' }}>
          {track.title} — {track.artist}
        </p>
        <p className="mt-[5vh] text-white/25" style={{ fontSize: '1.2vw' }}>
          Pulsa ▲ o ▼ para ver la carátula o el visualizador
        </p>
      </div>);

  }

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