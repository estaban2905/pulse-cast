import React, { useEffect, useRef } from 'react';
import { audioSim } from '../utils/audioSim';

interface PlayingBarsProps {
  bars?: number;
  className?: string;
  barClassName?: string;
}

/** Small live equalizer indicator driven by the shared analyser. */
export function PlayingBars({ bars = 4, className = '', barClassName = '' }: PlayingBarsProps) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const sim = audioSim.read(now);
      refs.current.forEach((el, i) => {
        if (!el) return;
        const v = sim.bands[i * 5 + 2] ?? 0;
        el.style.height = `${Math.max(14, Math.min(100, v * 105))}%`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className={`flex h-4 items-end gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) =>
      <span
        key={i}
        ref={(el) => {
          refs.current[i] = el;
        }}
        className={`w-[3px] rounded-full bg-c1 ${barClassName}`}
        style={{ height: '30%', boxShadow: '0 0 8px rgb(var(--c1-rgb) / 0.8)' }} />

      )}
    </span>);

}