import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '../contexts/PlayerContext';
import { BackgroundFX } from './BackgroundFX';
import { ClockWidget } from './ClockWidget';
import { NowPlayingBadge } from './NowPlayingBadge';
import { ProgressBar } from './ProgressBar';
import { IdleScreen } from './IdleScreen';
import { OfflineScreen } from './OfflineScreen';
import { PairingScreen } from './PairingScreen';
import { CoverMode } from './modes/CoverMode';
import { LyricsMode } from './modes/LyricsMode';
import { StageVisualizer } from './modes/StageVisualizer';

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * La pantalla de la TV.
 *
 * Aquí no hay barra de controles, ni panel de playlist, ni ajustes, ni selector
 * de modo. No es una simplificación: un Chromecast no tiene puntero ni teclado,
 * así que un botón en esta pantalla es un botón que nadie puede pulsar. Todo
 * eso se maneja desde el teléfono, que es quien manda.
 *
 * El margen del 4 % no es decorativo: muchos televisores recortan el borde de
 * la imagen (*overscan*), y sin él los títulos se comen las esquinas.
 */
export function PlayerStage() {
  const { mode, idle, pairingCode, offline, diagnostic } = usePlayer();

  const framed = mode === 'cover' || mode === 'lyrics';

  return (
    <main
      className="stage relative h-full w-full overflow-hidden bg-stage font-sans text-white"
      aria-label="Pulse en la televisión">

      <BackgroundFX />

      {/* Sin servidor no hay nada que enseñar y hay que decirlo: si esto cae en
          la pantalla de reposo, el usuario lee «envía una canción» e intenta
          justo lo único que no puede funcionar. */}
      {offline ? (
        <OfflineScreen />
      ) : pairingCode ? (
        <PairingScreen code={pairingCode} />
      ) : idle ? (
        <IdleScreen />
      ) : (
        <>
          <div
            className="absolute inset-0 transition-[padding] duration-300 ease-smooth"
            style={{ paddingTop: framed ? '17vh' : 0, paddingBottom: framed ? '16vh' : 0 }}>

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
                {mode === 'visualizer' && <StageVisualizer />}
              </motion.section>
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-8 px-[4vw] pt-[4vh]">
            <NowPlayingBadge />
            <ClockWidget />
          </div>

          {/* Solo en la letra: el modo carátula ya trae la suya, colocada
              dentro de su propia columna. Dos barras a la vez se veían. */}
          {mode === 'lyrics' ?
          <div className="pointer-events-none absolute inset-x-0 bottom-[5vh] z-20 px-[6vw]">
              <ProgressBar size="lg" />
            </div> :
          null}
        </>
      )}

      {/* Siempre visible, discreto. En un televisor no hay consola: sin esta
          línea, lo único que se puede reportar de un fallo es «no se ve nada»,
          que es exactamente donde se atasca el diagnóstico. */}
      {/* `clamp` y no `vw` a secas: esta pantalla se diseñó para 1920px, donde
          0.85vw son 16px legibles. En un móvil de 390px son 3px —invisibles—, y
          resulta que el sitio donde más falta hace leer esto es justo cuando se
          prueba desde el teléfono. */}
      <p
        className="pointer-events-none absolute bottom-2 left-3 right-3 z-30 font-sans text-white/55"
        style={{ fontSize: 'clamp(12px, 0.85vw, 18px)' }}>
        {diagnostic}
      </p>
    </main>);

}
