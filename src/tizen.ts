/**
 * El mando a distancia.
 *
 * La primera versión de esta pantalla no tenía ningún control, razonando que un
 * televisor no tiene puntero. Es cierto y era el razonamiento equivocado: un
 * televisor **tiene mando**, y sin atender sus teclas el usuario se queda
 * encerrado en la aplicación sin poder cambiar de vista ni salir.
 */

/** Códigos del mando de Samsung. */
const TECLAS = {
  atras: [10009, 10182],
  izquierda: 37,
  derecha: 39,
  arriba: 38,
  abajo: 40,
  aceptar: 13
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

/** Cierto cuando la página corre empaquetada dentro de un televisor Samsung. */
export const isTizen = (): boolean => Boolean(window.tizen?.application);

export type AccionMando = 'anterior' | 'siguiente' | 'alternar';

/**
 * Empieza a escuchar el mando.
 *
 * `registerKey` no es opcional para las teclas de color y multimedia: el
 * televisor no las entrega a la aplicación hasta que esta declara que las
 * quiere. Las flechas y «atrás» sí llegan siempre, pero registrarlas no molesta
 * y deja el comportamiento explícito.
 */
export function setupTizen(alPulsar?: (accion: AccionMando) => void): void {
  if (!isTizen()) return;

  const entrada = window.tizen?.tvinputdevice;
  if (entrada) {
    for (const nombre of ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'ColorF0Red']) {
      try {
        entrada.registerKey(nombre);
      } catch {
        // Un televisor que no tenga esa tecla no es motivo para no arrancar.
      }
    }
  }

  window.addEventListener('keydown', (event) => {
    const code = event.keyCode;

    if ((TECLAS.atras as readonly number[]).includes(code)) {
      event.preventDefault();
      try {
        window.tizen?.application?.getCurrentApplication().exit();
      } catch {
        // Si el sistema no deja cerrar, mejor seguir abierto que reventar.
      }
      return;
    }

    if (!alPulsar) return;

    if (code === TECLAS.izquierda || code === TECLAS.arriba) {
      event.preventDefault();
      alPulsar('anterior');
    } else if (code === TECLAS.derecha || code === TECLAS.abajo) {
      event.preventDefault();
      alPulsar('siguiente');
    } else if (code === TECLAS.aceptar) {
      event.preventDefault();
      alPulsar('alternar');
    }
  });
}
