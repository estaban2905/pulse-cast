import React from 'react';
import { motion } from 'framer-motion';
import { Visualizer } from './Visualizer';
import { ClockWidget } from './ClockWidget';

/**
 * Lo que se ve mientras nadie ha enviado música.
 *
 * Un receptor de Cast pasa aquí la mayor parte de su vida: conectado y a la
 * espera. La pantalla dice qué es y qué hacer, sin pedir nada, porque el
 * televisor no tiene dónde pulsar.
 *
 * Sin imágenes fijas y con poco brillo a propósito: esto puede quedarse horas
 * en pantalla y los paneles OLED retienen lo que no se mueve.
 */
export function IdleScreen() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-[6vw]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh] opacity-25">
        <Visualizer style="waves" intensity={0.45} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        className="relative flex flex-col items-center text-center">

        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-[4vh] h-[7vw] w-[7vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(var(--c1-rgb),0.9) 0%, rgba(var(--c1-rgb),0) 70%)'
          }} />

        <h1
          className="font-display font-extrabold leading-none tracking-tight text-white"
          style={{ fontSize: 'clamp(40px, 5.4vw, 108px)' }}>
          Pulse
        </h1>

        <p className="mt-[2vh] text-white/45" style={{ fontSize: 'clamp(14px, 1.5vw, 30px)' }}>
          Envía una canción desde tu teléfono
        </p>
      </motion.div>

      <div className="absolute bottom-[5vh] right-[5vw] opacity-70">
        <ClockWidget />
      </div>
    </div>);

}
