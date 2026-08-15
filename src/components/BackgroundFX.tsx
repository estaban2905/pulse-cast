import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { audioSim } from '../utils/audioSim';
import { rgba } from '../data/themes';

/**
 * Ambient stage lighting: two large colour blooms that breathe with the bass,
 * a soft vignette, and — in party mode — occasional gentle light flashes.
 */
export function BackgroundFX() {
  const { theme, partyMode, settings, track } = usePlayer();
  const bloomA = useRef<HTMLDivElement | null>(null);
  const bloomB = useRef<HTMLDivElement | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const sim = audioSim.read(now);
      const pump = 1 + sim.bass * (partyMode ? 0.22 : 0.1);
      if (bloomA.current) bloomA.current.style.transform = `scale(${pump.toFixed(3)})`;
      if (bloomB.current) bloomB.current.style.transform = `scale(${(2 - pump).toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [partyMode]);

  useEffect(() => {
    if (!partyMode) return;
    const id = window.setInterval(() => {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 140);
    }, 7000);
    return () => window.clearInterval(id);
  }, [partyMode]);

  const intensity = settings.lightIntensity;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <img
        src={track.cover}
        alt=""
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.16] blur-[90px] transition-opacity duration-300 ease-smooth" />
      
      <div
        ref={bloomA}
        className={`absolute -left-[10%] top-[-20%] h-[80vh] w-[80vh] rounded-full blur-[130px] ${
        settings.animations ? 'animate-panGradient' : ''}`
        }
        style={{
          background: `radial-gradient(circle, ${rgba(theme.colors[0], 0.5 * intensity)} 0%, transparent 68%)`
        }} />
      
      <div
        ref={bloomB}
        className={`absolute -right-[8%] bottom-[-24%] h-[85vh] w-[85vh] rounded-full blur-[140px] ${
        settings.animations ? 'animate-panGradient' : ''}`
        }
        style={{
          background: `radial-gradient(circle, ${rgba(theme.colors[1], 0.45 * intensity)} 0%, transparent 68%)`,
          animationDelay: '-9s'
        }} />
      
      <div
        className="absolute left-1/2 top-1/2 h-[60vh] w-[120vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
        style={{
          background: `radial-gradient(ellipse, ${rgba(theme.colors[2], 0.3 * intensity)} 0%, transparent 70%)`
        }} />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
          'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.85\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'url(%23n)\'/%3E%3C/svg%3E")'
        }} />
      
      <div
        className="absolute inset-0 bg-white transition-opacity duration-150 ease-out"
        style={{ opacity: flash ? 0.07 : 0 }} />
      
    </div>);

}