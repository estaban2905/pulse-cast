import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '../contexts/PlayerContext';
import { BackgroundFX } from './BackgroundFX';
import { Biblioteca } from './Biblioteca';
import { ClockWidget } from './ClockWidget';
import { ControlBar } from './ControlBar';
import { ModeSwitcher } from './ModeSwitcher';
import { NowPlayingBadge } from './NowPlayingBadge';
import { PlaylistPanel } from './PlaylistPanel';
import { SettingsModal } from './SettingsModal';
import { VizStylePicker } from './VizStylePicker';
import { CoverMode } from './modes/CoverMode';
import { LyricsMode } from './modes/LyricsMode';
import { VideoMode } from './modes/VideoMode';
import { StageVisualizer } from './modes/StageVisualizer';
import { ImmersiveMode } from './modes/ImmersiveMode';

const EASE = [0.23, 1, 0.32, 1] as const;

/** Cómo se llama cada vista en pantalla, para el indicador del mando. */
const NOMBRES: Record<string, string> = {
  cover: 'Portada',
  lyrics: 'Letra',
  visualizer: 'Visualizador',
  party: 'Fiesta',
  video: 'Video',
  immersive: 'Pantalla completa'
};

export function PlayerStage() {
  const { mode, playlistOpen, chromeVisible, libraryOpen, librarySelection, onLibraryTracks } = usePlayer();

  const framed = mode === 'cover' || mode === 'lyrics';
  const showStylePicker = mode === 'visualizer' || mode === 'party';

  return (
    <main
      className="stage relative h-full w-full overflow-hidden bg-stage font-sans text-white"
      aria-label="Reproductor musical para TV">
      
      <BackgroundFX />

      {/* Stage content */}
      <div
        className="absolute inset-0 transition-[padding] duration-300 ease-smooth"
        style={{
          paddingTop: framed ? '17vh' : 0,
          paddingBottom: framed ? '16vh' : 0,
          paddingRight: playlistOpen ? '34vw' : 0
        }}>
        
        <AnimatePresence mode="wait">
          <motion.section
            key={mode}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.015 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="h-full w-full">
            
            {mode === 'cover' && <CoverMode />}
            {mode === 'lyrics' && <LyricsMode />}
            {mode === 'video' && <VideoMode />}
            {mode === 'visualizer' && <StageVisualizer />}
            {mode === 'party' && <StageVisualizer party />}
            {mode === 'immersive' && <ImmersiveMode />}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* Persistent, discreet header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-8 px-[3vw] pt-[3vh]">
        <div
          className="pointer-events-auto transition-opacity duration-300 ease-out"
          style={{ opacity: chromeVisible ? 1 : 0.55 }}>
          
          <NowPlayingBadge />
        </div>
        <ModeSwitcher />
        <div
          className="transition-opacity duration-300 ease-out"
          style={{ opacity: chromeVisible ? 1 : 0.75 }}>
          
          <ClockWidget />
        </div>
      </div>

      {/* Visualizer style rail */}
      {showStylePicker &&
      <div
        className="pointer-events-none absolute right-[2vw] top-1/2 z-20 -translate-y-1/2"
        style={{ right: playlistOpen ? 'calc(34vw + 2vw)' : '2vw' }}>
        
          <VizStylePicker />
        </div>
      }

      {/* Auto-hiding control bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 flex justify-center px-[3vw]">
        <ControlBar />
      </div>

      <PlaylistPanel />
      <SettingsModal />

      {/* La música, navegable con el mando. Se superpone a todo lo demás. */}
      <Biblioteca
        abierta={libraryOpen}
        seleccion={librarySelection}
        onCerrar={() => undefined}
        onPistas={onLibraryTracks} />


      {/*
        Qué vista está puesta y qué teclas responden.

        Con un mando no hay puntero ni foco visible: sin esto no hay forma de
        saber dónde estás ni qué acaba de cambiar al pulsar, que es justo lo que
        hacía la aplicación imposible de manejar.
      */}
      <div
        className="pointer-events-none absolute bottom-[1.2vh] right-[2.5vw] z-30 flex items-center gap-[1.2vw]"
        style={{ fontSize: '1.05vw' }}>

        <span
          className="rounded-full px-[1.3vw] py-[0.5vh] font-bold uppercase tracking-[0.16em]"
          style={{
            background: 'rgba(var(--c1-rgb),0.22)',
            color: 'rgb(var(--c1-rgb))',
            boxShadow: '0 0 2vh rgba(var(--c1-rgb),0.45)'
          }}>

          {NOMBRES[mode] ?? mode}
        </span>
        <span className="text-white/35">▲▼ vista · ◀▶ canción · OK play · AMARILLO música</span>
      </div>
    </main>);

}