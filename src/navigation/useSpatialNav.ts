import { useEffect, useRef } from 'react';

/**
 * Navegación espacial para TV.
 *
 * El problema que resuelve: en una TV no hay puntero. Las flechas del mando
 * tienen que mover un cursor entre los elementos focuseables de un contenedor
 * (los botones de la barra de controles, los items de una lista, etc.) y OK los
 * activa.
 *
 * Implementación: roving tabindex. Solo un elemento del grupo tiene
 * `tabIndex=0` en cada momento; los demás tienen `tabIndex=-1`. Las flechas
 * mueven el `tabIndex=0` al siguiente y le hacen `.focus()`. El anillo de foco
 * de CSS (`.stage :focus`) se encarga del resto.
 *
 * No interfiere con las acciones globales del mando (cambiar canción, abrir
 * biblioteca, etc.): solo actúa cuando el contenedor está activo. Eso se
 * controla con el parámetro `activo`. Mientras no lo esté, las flechas no se
 * consumen y siguen haciendo su labor original.
 */

type Dir = 'izquierda' | 'derecha';

export interface SpatialNavOpts {
  /** Ref al contenedor con los botones focuseables. */
  contenedor: React.RefObject<HTMLElement>;
  /** Selector CSS de los hijos focuseables. */
  selector?: string;
  /** Si es false, el hook ignora las flechas y no mueve el foco. */
  activo?: boolean;
  /** Dirección principal de navegación. Horizontal en barras, vertical en listas. */
  eje?: 'x' | 'y';
  /**
   * Llamado cuando el usuario pulsa OK / Enter sobre el elemento enfocado.
   * Si no se da, se hace click nativo en el elemento, lo que dispara los
   * handlers `onClick` que ya tengas.
   */
  onAceptar?: (elemento: HTMLElement) => void;
}

const COD = {
  izquierda: 37,
  arriba: 38,
  derecha: 39,
  abajo: 40,
  aceptar: 13
} as const;

export function useSpatialNav(opts: SpatialNavOpts): void {
  const { contenedor, selector = 'button, [role="button"], a, input', activo = true, eje = 'x', onAceptar } = opts;
  const indiceRef = useRef(0);
  const activoRef = useRef(activo);
  activoRef.current = activo;

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;

    const focuseables = (): HTMLElement[] =>
      Array.from(raiz.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );

    // Posiciona el cursor en el primer focuseable al activarse el grupo.
    const colocar = () => {
      const items = focuseables();
      if (items.length === 0) return;
      items.forEach((el, i) => el.setAttribute('tabindex', i === 0 ? '0' : '-1'));
      indiceRef.current = 0;
    };

    colocar();

    // Si el contenedor cambia de hijos (se abre un modal, se añaden botones),
    // recolocamos.
    const obs = new MutationObserver(colocar);
    obs.observe(raiz, { childList: true, subtree: true });

    const mover = (dir: Dir) => {
      if (!activoRef.current) return false;
      const items = focuseables();
      if (items.length === 0) return false;
      const paso = dir === 'derecha' ? 1 : -1;
      const siguiente = (indiceRef.current + paso + items.length) % items.length;
      items[indiceRef.current].setAttribute('tabindex', '-1');
      items[siguiente].setAttribute('tabindex', '0');
      items[siguiente].focus();
      indiceRef.current = siguiente;
      return true;
    };

    const onKey = (event: KeyboardEvent) => {
      if (!activoRef.current) return;
      // Solo actuamos si el foco ya está dentro de nuestro contenedor; si no,
      // dejamos que las teclas hagan su acción global (cambiar canción, etc.).
      const dentro = raiz.contains(document.activeElement);
      const c = event.keyCode;
      const esHorizontal = eje === 'x';

      if (esHorizontal) {
        if (c === COD.derecha) {
          event.preventDefault();
          mover('derecha');
          return;
        }
        if (c === COD.izquierda) {
          event.preventDefault();
          mover('izquierda');
          return;
        }
      } else {
        if (c === COD.abajo) {
          event.preventDefault();
          mover('derecha');
          return;
        }
        if (c === COD.arriba) {
          event.preventDefault();
          mover('izquierda');
          return;
        }
      }

      // OK activa el botón enfocado.
      if (dentro && c === COD.aceptar) {
        const foco = document.activeElement as HTMLElement | null;
        if (foco && raiz.contains(foco)) {
          event.preventDefault();
          if (onAceptar) onAceptar(foco);
          else foco.click();
        }
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      obs.disconnect();
    };
  }, [contenedor, selector, eje, onAceptar]);
}