import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { audioSim } from '../../utils/audioSim';
import { rgba } from '../../data/themes';
import { Visualizer } from '../Visualizer';
import { PlayingBars } from '../PlayingBars';
import { ProgressBar } from '../ProgressBar';

interface StageVisualizerProps {
  /** Party mode layers in beams, particles and a bigger title. */
  party?: boolean;
}

export function StageVisualizer({ party = false }: StageVisualizerProps) {
  const { track, theme, settings, vizStyle } = usePlayer();
  const titleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!party) return;
    let raf = 0;
    const loop = (now: number) => {
      const sim = audioSim.read(now);
      if (titleRef.current) {
        titleRef.current.style.transform = `scale(${(1 + sim.bass * 0.03).toFixed(4)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [party]);

  return (
    <div className="relative h-full w-full">
      {party &&
      <>
          <div
          className={`pointer-events-none absolute left-1/2 top-1/2 h-[190vh] w-[190vh] -translate-x-1/2 -translate-y-1/2 opacity-[0.22] blur-[3px] mix-blend-screen ${
          settings.animations ? 'animate-spinSlow' : ''}`
          }
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${rgba(
              theme.colors[0],
              0.55
            )} 12deg, transparent 26deg, transparent 90deg, ${rgba(
              theme.colors[1],
              0.5
            )} 104deg, transparent 120deg, transparent 200deg, ${rgba(
              theme.colors[2],
              0.5
            )} 214deg, transparent 230deg)`
          }}
          aria-hidden="true" />
        
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <Visualizer style="particles" intensity={0.9} />
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <Visualizer style="pulse" intensity={0.8} />
          </div>
        </>
      }

      <div className="absolute inset-0">
        <Visualizer intensity={party ? 1 : 0.95} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-8 bg-gradient-to-t from-black/80 to-transparent px-[5vw] pb-[12vh] pt-[16vh]">
        <div className="min-w-0" ref={titleRef} style={{ transformOrigin: 'left bottom' }}>
          <div className="flex items-center gap-4 text-base font-semibold tracking-[0.22em] text-c2">
            <PlayingBars bars={4} />
            <span>{party ? 'PARTY MODE' : vizStyle.toUpperCase()}</span>
          </div>
          <h2
            className="text-glow mt-3 truncate font-display font-extrabold leading-[0.95] tracking-tight"
            style={{ fontSize: party ? '6.4vw' : '4.2vw' }}>
            
            {track.title}
          </h2>
          <p className="mt-2 font-display text-[2vw] font-semibold text-white/75">
            {track.artist}
          </p>
        </div>
        <div className="pointer-events-auto w-[26vw] shrink-0">
          <ProgressBar size="sm" />
        </div>
      </div>
    </div>);

}