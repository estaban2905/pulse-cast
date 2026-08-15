import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { formatTime } from '../utils/format';

interface ProgressBarProps {
  size?: 'lg' | 'sm';
  showTimes?: boolean;
  className?: string;
}

/**
 * Barra de progreso, solo para mirar.
 *
 * Antes era un control: se podía pulsar y arrastrar para saltar. Aquí no tiene
 * sentido —un Chromecast no tiene puntero— y además engañaba, porque `seek` en
 * el receptor no hace nada. Sin `role="slider"` ni `tabIndex`, un lector de
 * pantalla tampoco lo anuncia como algo que se pueda manejar.
 */
export function ProgressBar({ size = 'lg', showTimes = true, className = '' }: ProgressBarProps) {
  const { position, track } = usePlayer();

  // La duración puede no venir: el emisor no siempre la manda en los metadatos.
  // Sin esta guarda, `position / 0` da `Infinity`, `Math.min` lo deja en `NaN`
  // y el ancho acaba siendo `NaN%`, que el navegador descarta en silencio: la
  // barra se queda vacía toda la canción y no hay error en ninguna parte.
  const known = Number.isFinite(track.duration) && track.duration > 0;
  const pct = known ? Math.min(100, Math.max(0, position / track.duration * 100)) : 0;
  const height = size === 'lg' ? 'h-3' : 'h-1.5';

  return (
    <div className={className}>
      <div className={`relative w-full rounded-full bg-white/10 ${height}`}>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-c2 to-c1"
          style={{
            width: `${pct}%`,
            boxShadow: '0 0 calc(22px * var(--glow)) rgb(var(--c1-rgb) / 0.75)',
            transition: 'width 200ms linear'
          }} />

        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-c1/40 ${
          size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'}`
          }
          style={{ left: `${pct}%`, transition: 'left 200ms linear' }} />

      </div>
      {showTimes &&
      <div
        className={`mt-3 flex items-center justify-between font-sans tabular-nums text-white/60 ${
        size === 'lg' ? 'text-xl' : 'text-sm'}`
        }>

          <span className="text-white/85">{formatTime(position)}</span>
          {/* Un guion en lugar de «0:00»: no saber cuánto dura es distinto de
              que dure cero, y en pantalla eso se nota. */}
          <span>{known ? formatTime(track.duration) : '—:—'}</span>
        </div>
      }
    </div>);

}
