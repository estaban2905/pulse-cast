import React from 'react';
import {
  ActivityIcon,
  Disc3Icon,
  FilmIcon,
  MaximizeIcon,
  MicIcon,
  SparklesIcon } from
'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { PlayerMode } from '../types/player';

const MODES: {id: PlayerMode;Icon: typeof Disc3Icon;label: string;}[] = [
{ id: 'cover', Icon: Disc3Icon, label: 'Portada' },
{ id: 'lyrics', Icon: MicIcon, label: 'Letras' },
{ id: 'video', Icon: FilmIcon, label: 'Video' },
{ id: 'visualizer', Icon: ActivityIcon, label: 'Visualizador' },
{ id: 'party', Icon: SparklesIcon, label: 'Fiesta' },
{ id: 'immersive', Icon: MaximizeIcon, label: 'Fullscreen' }];


export function ModeSwitcher() {
  const { mode, setMode, chromeVisible } = usePlayer();

  return (
    <nav
      aria-label="Modos de visualización"
      className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5 transition-all duration-300 ease-smooth"
      style={{
        opacity: chromeVisible ? 1 : 0,
        transform: chromeVisible ? 'translateY(0)' : 'translateY(-24px)'
      }}>
      
      {MODES.map((m) => {
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-current={isActive}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
            isActive ? 'bg-white text-black' : 'text-white/65 hover:bg-white/10 hover:text-white'}`
            }>
            
            <m.Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />
            <span>{m.label}</span>
          </button>);

      })}
    </nav>);

}