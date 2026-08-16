import React from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '../../contexts/PlayerContext';
import { ProgressBar } from '../ProgressBar';
import { Visualizer } from '../Visualizer';

export function ImmersiveMode() {
  const { track, settings } = usePlayer();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <motion.img
        key={track.id}
        src={track.cover}
        alt={`Portada de ${track.album}`}
        initial={{ opacity: 0, scale: 1.12, filter: 'blur(24px)' }}
        animate={{ opacity: 1, scale: 1.02, filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className={`h-full w-full object-cover ${settings.animations ? 'animate-floaty' : ''}`} />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/50" />
      <div className="pointer-events-none absolute inset-x-0 bottom-[14vh] h-[14vh] opacity-45">
        <Visualizer style="spectrum" intensity={0.8} />
      </div>
      <div className="absolute inset-x-0 bottom-0 px-[6vw] pb-[6vh]">
        <h2 className="text-glow max-w-[70vw] font-display text-[7vw] font-extrabold leading-[0.9] tracking-tight">
          {track.title}
        </h2>
        <p className="mt-4 font-display text-[2.4vw] font-semibold text-c1">
          {track.artist} · {track.year}
        </p>
        <ProgressBar size="sm" showTimes={false} className="mt-8 max-w-[60vw]" />
      </div>
    </div>);

}