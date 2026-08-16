/**
 * El mando a distancia.
 *
 * Esta es una aplicación de televisor: se maneja con el mando y funciona sola.
 * Las flechas tienen doble función: fuera de cualquier elemento focuseable hacen
 * acciones globales (cambiar canción, abrir biblioteca, cambiar modo); dentro
 * de un elemento focuseable son del hook de navegación espacial y mueven el
 * cursor entre botones. El cambio se detecta con document.activeElement.
 */

const TECLAS = {
  atras: [10009, 10182],
  izquierda: 37,
  arriba: 38,
  derecha: 39,
  abajo: 40,
  aceptar: 13,
  reproducirPausar: [10252, 415, 19],
  siguiente: [417, 10233],
  anterior: [412, 10232],
  rojo: 403,
  verde: 404,
  amarillo: 405,
  azul: 406
} as const;

interface TizenApplication {
  exit(): void;
}

interface TizenInputDevice {
  registerKey(nombre: string): void;
}

interface TizenGlobal {
  application?: { getCurrentApplication(): TizenApplication };
  tvinputdevice?: TizenInputDevice;
}

declare global {
  interface Window {
    tizen?: TizenGlobal;
  }
}

export const isTizen = (): boolean => Boolean(window.tizen?.application);

export type AccionMando =
  | 'arriba'
  | 'abajo'
  | 'izquierda'
  | 'derecha'
  | 'aceptar'
  | 'atras'
  | 'reproducirPausar'
  | 'siguiente'
  | 'anterior'
  | 'biblioteca'
  | 'modo';

/**
 * Devuelve 	rue desde el manejador significa «ya lo he gestionado»; si no, la
 * tecla «atrás» cierra la aplicación. Así una vista abierta puede quedarse con
 * ese botón para cerrarse ella primero.
 */
export function setupTizen(alPulsar: (accion: AccionMando) => boolean | void): void {
  // Las teclas multimedia y de color no llegan a la aplicación hasta que esta
  // declara que las quiere.
  const entrada = window.tizen?.tvinputdevice;
  if (entrada) {
    for (const nombre of [
      'MediaPlayPause',
      'MediaPlay',
      'MediaPause',
      'MediaTrackPrevious',
      'MediaTrackNext',
      'ColorF0Red',
      'ColorF1Green',
      'ColorF2Yellow',
      'ColorF3Blue'
    ]) {
      try {
        entrada.registerKey(nombre);
      } catch {
        // Un televisor sin esa tecla no es motivo para no arrancar.
      }
    }
  }

  window.addEventListener('keydown', (event) => {
    const c = event.keyCode;

    // Si el foco está dentro de un elemento navegable (barra de controles,
    // biblioteca, modal), las flechas son del hook de navegación espacial y no
    // deben disparar acciones globales como cambiar de canción.
    const foco = document.activeElement as HTMLElement | null;
    const enNavegable =
      !!foco &&
      ['BUTTON', 'INPUT', 'A', 'TEXTAREA', 'SELECT'].includes(foco.tagName);

    let accion: AccionMando | null = null;

    if ((TECLAS.atras as readonly number[]).includes(c)) accion = 'atras';
    else if (c === TECLAS.arriba) accion = 'arriba';
    else if (c === TECLAS.abajo) accion = 'abajo';
    else if (c === TECLAS.izquierda) accion = 'izquierda';
    else if (c === TECLAS.derecha) accion = 'derecha';
    else if (c === TECLAS.aceptar) accion = 'aceptar';
    else if ((TECLAS.reproducirPausar as readonly number[]).includes(c)) accion = 'reproducirPausar';
    else if ((TECLAS.siguiente as readonly number[]).includes(c)) accion = 'siguiente';
    else if ((TECLAS.anterior as readonly number[]).includes(c)) accion = 'anterior';
    else if (c === TECLAS.amarillo) accion = 'biblioteca';
    else if (c === TECLAS.azul) accion = 'modo';

    if (!accion) return;

    const esFlecha =
      accion === 'izquierda' ||
      accion === 'derecha' ||
      accion === 'arriba' ||
      accion === 'abajo';
    if (enNavegable && esFlecha) return;

    event.preventDefault();

    const gestionada = alPulsar(accion);

    if (accion === 'atras' && !gestionada && isTizen()) {
      try {
        window.tizen?.application?.getCurrentApplication().exit();
      } catch {
        // Si el sistema no deja cerrar, mejor seguir abierto que reventar.
      }
    }
  });
}