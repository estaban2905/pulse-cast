/**
 * Lo poco que hace falta cuando esto corre como app de Samsung TV.
 *
 * Un televisor solo tiene mando: sin esto, pulsar «atrás» no hace nada y la
 * aplicación se queda abierta sin forma de salir salvo desenchufando. Tizen
 * exige que la app maneje esa tecla ella misma —es lo que declara
 * `hwkey-event` en `config.xml`—.
 */

/** Códigos del mando de Samsung. `10009` es RETURN; `10182`, EXIT. */
const BACK_KEYS = new Set([10009, 10182]);

interface TizenApplication {
  exit(): void;
}

interface TizenGlobal {
  application?: { getCurrentApplication(): TizenApplication };
}

declare global {
  interface Window {
    tizen?: TizenGlobal;
  }
}

/** Cierto cuando la página corre empaquetada dentro de un televisor Samsung. */
export const isTizen = (): boolean => Boolean(window.tizen?.application);

export function setupTizen(): void {
  if (!isTizen()) return;

  window.addEventListener('keydown', (event) => {
    if (!BACK_KEYS.has(event.keyCode)) return;
    try {
      window.tizen?.application?.getCurrentApplication().exit();
    } catch {
      // Si el sistema no deja cerrar, mejor quedarse abierto que reventar.
    }
  });
}
