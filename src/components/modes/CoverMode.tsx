import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '../../contexts/PlayerContext';
import { audioSim } from '../../utils/audioSim';
import { Visualizer } from '../Visualizer';
import { ProgressBar } from '../ProgressBar';
import { PlayingBars } from '../PlayingBars';

export function CoverMode() {
  const { track, isPlaying, settings } = usePlayer();
  const artRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const sim = audioSim.read(now);
      if (artRef.current) {
        artRef.current.style.transform = `scale(${(1 + sim.bass * 0.022).toFixed(4)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="grid h-full w-full grid-cols-1 items-center gap-[4vw] px-[6vw] lg:grid-cols-[minmax(0,40%)_minmax(0,1fr)]">
      {/* Artwork stage */}
      <div className={`relative mx-auto w-full max-w-[46vh] ${settings.animations ? 'animate-floaty' : ''}`}>
        <div className="pointer-events-none absolute -inset-[26%]">
          <Visualizer style="circular" intensity={0.75} />
        </div>
        <div ref={artRef} className="relative aspect-square w-full">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={track.id}
              src={track.cover}
              alt={`Portada de ${track.album}`}
              initial={{ opacity: 0, scale: 1.08, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(16px)' }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="ring-glow absolute inset-0 h-full w-full rounded-[28px] object-cover" />
            
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/15" />
        </div>
        {/* Reflection */}
        <div className="relative mt-3 h-[9vh] w-full overflow-hidden">
          <img
            src={track.cover}
            alt=""
            aria-hidden="true"
            className="h-[40vh] w-full -scale-y-100 object-cover opacity-25 blur-[3px]"
            style={{
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 75%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 75%)'
            }} />
          
        </div>
      </div>

      {/* Track information */}
      <div className="min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
            
            {/* El álbum solo si viene. La app no siempre lo manda, y una fila
                con un punto suelto y nada al lado se ve como un fallo. */}
            {track.album ?
            <div className="flex items-center gap-4 text-lg font-semibold tracking-wide text-white/55">
                <span className="truncate">{track.album}</span>
              </div> :
            null}
            <h1 className="text-glow mt-3 font-display text-[5.6vw] font-extrabold leading-[0.94] tracking-tight">
              {track.title}
            </h1>
            <p className="mt-4 font-display text-[2.4vw] font-semibold text-c1">
              {track.artist}
            </p>
          </motion.div>
        </AnimatePresence>

        <ProgressBar className="mt-[4vh] max-w-[46vw]" />

        {/* Aquí iba «SIGUIENTE», y no puede ir: la cola vive en el teléfono y
            el receptor solo recibe la canción actual. Con una sola pista, ese
            renglón anunciaba como siguiente la que ya estaba sonando. */}
        <div className="mt-[3vh] flex items-center gap-5 text-lg text-white/50">
          <PlayingBars bars={5} />
          <span className="font-semibold tracking-[0.14em] text-white/70">
            {isPlaying ? 'REPRODUCIENDO' : 'EN PAUSA'}
          </span>
        </div>

        <div className="mt-[3vh] h-[9vh] max-w-[42vw] opacity-70">
          <Visualizer style="spectrum" intensity={0.85} />
        </div>
      </div>
    </div>);

}