import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { VizStyle } from '../types/player';

const STYLES: {id: VizStyle;label: string;}[] = [
{ id: 'spectrum', label: 'Spectrum' },
{ id: 'waves', label: 'Waves' },
{ id: 'circular', label: 'Circular' },
{ id: 'particles', label: 'Particles' },
{ id: 'neon', label: 'Neon' },
{ id: 'pulse', label: 'Pulse' }];


export function VizStylePicker() {
  const { vizStyle, setVizStyle, chromeVisible } = usePlayer();

  return (
    <div
      className="glass pointer-events-auto flex flex-col gap-1 rounded-3xl p-2 transition-all duration-300 ease-smooth"
      style={{
        opacity: chromeVisible ? 1 : 0,
        transform: chromeVisible ? 'translateX(0)' : 'translateX(32px)'
      }}
      role="radiogroup"
      aria-label="Estilo de visualizador">
      
      {STYLES.map((s) => {
        const isActive = vizStyle === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setVizStyle(s.id)}
            className={`rounded-2xl px-5 py-3 text-left text-base font-semibold tracking-wide transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
            isActive ?
            'bg-c1/25 text-white ring-1 ring-c1/60' :
            'text-white/55 hover:bg-white/10 hover:text-white'}`
            }>
            
            {s.label}
          </button>);

      })}
    </div>);

}