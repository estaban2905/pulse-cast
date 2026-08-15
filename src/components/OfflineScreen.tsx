import React from 'react';
import { motion } from 'framer-motion';

/**
 * No se puede hablar con el servidor.
 *
 * Existe porque su ausencia costó una tarde: sin esta pantalla, un fallo de red
 * —o un origen que falta en `CORS_ORIGINS`, que es lo mismo visto desde aquí—
 * caía en la pantalla de reposo. Y el reposo dice «envía una canción desde tu
 * teléfono», así que el usuario intenta justo lo que no puede funcionar y no
 * tiene forma de saber por qué.
 *
 * Una pantalla que falla en silencio es peor que una que da un error.
 */
export function OfflineScreen() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-[8vw] text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>

        <div
          className="mx-auto mb-[4vh] rounded-full border-2 border-white/20"
          style={{ width: '5vw', height: '5vw' }} />

        <h1 className="font-display font-extrabold text-white" style={{ fontSize: 'clamp(24px, 3.4vw, 64px)' }}>
          Sin conexión con Pulse
        </h1>

        <p className="mt-[3vh] text-white/55" style={{ fontSize: 'clamp(14px, 1.5vw, 28px)', lineHeight: 1.5 }}>
          El televisor no puede contactar con el servidor.
          <br />
          Comprueba que tenga internet.
        </p>

        <p className="mt-[5vh] text-white/30" style={{ fontSize: 'clamp(12px, 1.1vw, 22px)' }}>
          Se reintenta solo cada pocos segundos.
        </p>
      </motion.div>
    </div>);

}
