import React from 'react';
import { motion } from 'framer-motion';
import { Visualizer } from './Visualizer';

interface PairingScreenProps {
  code: string;
}

/**
 * El código que hay que teclear en el teléfono.
 *
 * Se lee desde un sofá, a tres metros, con luz de día: por eso ocupa media
 * pantalla y va con espaciado entre letras. El alfabeto del servidor ya evita
 * los caracteres que se confunden —cero y O, uno e I y L—, así que aquí solo
 * hay que hacerlo grande.
 */
export function PairingScreen({ code }: PairingScreenProps) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-[6vw] text-center">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32vh] opacity-20">
        <Visualizer style="waves" intensity={0.4} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative">

        {/* Todo con `clamp`: esta pantalla se ve en un televisor de 1920px y
            también en el móvil, cuando se prueba. Con `vw` a secas, el texto de
            apoyo bajaba a 5px en el teléfono y parecía que no había nada. */}
        <p
          className="font-semibold uppercase tracking-[0.3em] text-white/45"
          style={{ fontSize: '1.3vw' }}>
          Pulse en tu televisor
        </p>

        <p className="mt-[3vh] text-white/75" style={{ fontSize: '1.9vw' }}>
          Abre Pulse en el teléfono y ve a
          <span className="font-semibold text-white"> Ajustes → Televisores</span>
        </p>

        <div
          className="text-glow mt-[5vh] font-display font-extrabold leading-none text-c1"
          style={{ fontSize: '11vw', letterSpacing: '0.12em' }}>
          {code}
        </div>

        <p className="mt-[5vh] text-white/40" style={{ fontSize: '1.3vw' }}>
          El código cambia cada dos minutos. Se toma el que esté en pantalla.
        </p>
      </motion.div>
    </div>);

}
