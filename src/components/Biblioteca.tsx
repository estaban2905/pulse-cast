import React, { useEffect, useRef, useState } from 'react';
import { listTracks, type CatalogTrack } from '../services/catalogApi';
import { formatTime } from '../utils/format';

interface BibliotecaProps {
  abierta: boolean;
  seleccion: number;
  onCerrar: () => void;
  onPistas: (pistas: CatalogTrack[]) => void;
}

/**
 * La música, navegable con el mando.
 *
 * Es lo que faltaba para que esto fuera una aplicación de televisor y no una
 * pantalla del teléfono: aquí se elige qué sonar sin que haya ningún móvil
 * cerca. El catálogo es público, así que no hace falta ni cuenta.
 *
 * La fila seleccionada la lleva quien la dibuja, no este componente: el mando
 * se atiende en un solo sitio y así no hay dos ideas de «dónde está el cursor».
 */
export function Biblioteca({ abierta, seleccion, onCerrar, onPistas }: BibliotecaProps) {
  const [pistas, setPistas] = useState<CatalogTrack[]>([]);
  const activaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void listTracks().then((lista) => {
      setPistas(lista);
      onPistas(lista);
    });
    // `onPistas` es estable en el llamador; incluirlo recargaría el catálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantiene la fila elegida a la vista: en una lista de mil canciones, sin
  // esto el cursor se va de pantalla al tercer botón.
  useEffect(() => {
    activaRef.current?.scrollIntoView({ block: 'center' });
  }, [seleccion, abierta]);

  if (!abierta) return null;

  const desde = Math.max(0, seleccion - 8);
  const visibles = pistas.slice(desde, desde + 17);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{ background: 'rgba(5,6,12,0.94)' }}>

      <div className="flex items-baseline justify-between px-[5vw] pt-[5vh]">
        <h2 className="font-display font-extrabold text-white" style={{ fontSize: '2.6vw' }}>
          Tu música
        </h2>
        <p className="text-white/40" style={{ fontSize: '1.2vw' }}>
          {pistas.length} canciones · ▲▼ elegir · OK reproducir · ATRÁS cerrar
        </p>
      </div>

      <div className="mt-[3vh] flex-1 overflow-hidden px-[5vw]">
        {visibles.map((pista, i) => {
          const indice = desde + i;
          const activa = indice === seleccion;
          return (
            <div
              key={pista.id}
              ref={activa ? activaRef : null}
              className="flex items-center gap-[2vw] rounded-lg px-[1.5vw]"
              style={{
                background: activa ? 'rgba(var(--c1-rgb),0.18)' : 'transparent',
                paddingTop: '0.9vh',
                paddingBottom: '0.9vh'
              }}>

              <span
                className="tabular-nums text-white/30"
                style={{ fontSize: '1.1vw', width: '3vw' }}>
                {indice + 1}
              </span>
              <span
                className="flex-1 truncate font-semibold"
                style={{ fontSize: '1.5vw', color: activa ? 'rgb(var(--c1-rgb))' : '#F7F7FA' }}>
                {pista.title}
              </span>
              <span className="w-[22vw] truncate text-white/45" style={{ fontSize: '1.3vw' }}>
                {pista.artist}
              </span>
              <span className="tabular-nums text-white/30" style={{ fontSize: '1.1vw' }}>
                {formatTime(pista.duration)}
              </span>
            </div>);

        })}
      </div>

      <button
        type="button"
        onClick={onCerrar}
        className="sr-only">
        Cerrar
      </button>
    </div>);

}
