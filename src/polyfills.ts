/**
 * Lo que le falta al navegador de un televisor de 2019.
 *
 * Se importa **el primero de todo** en `index.tsx`: React llama a
 * `queueMicrotask` mientras se evalúa el módulo, así que un respaldo instalado
 * más tarde llega tarde.
 *
 * El síntoma sin esto es de los peores: la aplicación no arranca, la pantalla se
 * queda **negra**, y ni siquiera responde el botón de atrás del mando —porque el
 * código que lo escucha tampoco llegó a ejecutarse—. Desde fuera parece un
 * televisor colgado, no un error de JavaScript.
 */

/*
 * `window` y no `globalThis`.
 *
 * `globalThis` llegó a Chromium en la versión 71, y el televisor lleva una
 * anterior. La primera versión de este archivo lo usaba para instalar el
 * respaldo, así que el propio arreglo lanzaba `globalThis is not defined` antes
 * de arreglar nada. Un polyfill no puede depender de lo que viene después de lo
 * que intenta cubrir.
 */
type Global = Record<string, unknown>;
const raiz = (typeof window !== 'undefined' ? window : self) as unknown as Global;

// Tizen 5.5 es anterior a `queueMicrotask` (Chromium 71).
if (typeof raiz.queueMicrotask !== 'function') {
  raiz.queueMicrotask = (callback: VoidFunction): void => {
    // Una promesa ya resuelta encola en la misma cola de microtareas, que es lo
    // que pide la especificación.
    //
    // El `setTimeout` del `catch` no es adorno: `queueMicrotask` debe propagar
    // los fallos como excepciones no capturadas, y sin esto quedarían tragados
    // dentro de la promesa y sin rastro en la consola.
    void Promise.resolve()
      .then(callback)
      .catch((error: unknown) => {
        setTimeout(() => {
          throw error;
        }, 0);
      });
  };
}

// `globalThis` en sí, por si alguna dependencia lo espera.
if (typeof raiz.globalThis === 'undefined') {
  raiz.globalThis = raiz;
}

/**
 * Registro de fallos, en memoria.
 *
 * En un televisor no hay consola que abrir, y React renderiza de forma
 * asíncrona: un error dentro de un componente no lo atrapa ningún `try` del
 * arranque, y para cuando el inspector remoto se conecta ya pasó. Guardarlos
 * aquí permite leerlos después, cuando se pueda.
 *
 * También es lo que alimenta la pantalla de error: sin ella, un fallo se ve
 * igual que un televisor colgado.
 */
const registro: string[] = [];
raiz.__pulseErrors = registro;

/**
 * Ruido conocido que no es un fallo.
 *
 * `ResizeObserver loop limit exceeded` lo emite el propio navegador cuando una
 * animación mide y redibuja en el mismo fotograma; framer-motion lo provoca en
 * cada transición y no rompe nada. Sin filtrarlo, la pantalla de error tapaba
 * una aplicación que funcionaba perfectamente.
 */
const RUIDO = /ResizeObserver loop/i;

function anotar(origen: string, detalle: unknown): void {
  const texto =
    detalle instanceof Error
      ? `${detalle.name}: ${detalle.message}\n${detalle.stack ?? ''}`
      : String(detalle);

  if (RUIDO.test(texto)) return;

  registro.push(`[${origen}] ${texto}`);

  const root = document.getElementById('root');
  if (!root || root.children.length > 0) return;

  root.innerHTML =
    '<div style="position:fixed;inset:0;background:#0B0B0F;color:#FF8A94;' +
    'font:15px/1.45 monospace;padding:5vh 5vw;overflow:auto;z-index:99999">' +
    '<div style="color:#F7F7FA;font-size:24px;font-weight:800;margin-bottom:14px;' +
    'font-family:sans-serif">Pulse no pudo arrancar</div>' +
    '<div style="white-space:pre-wrap;word-break:break-word">' +
    registro.join('\n\n').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c) +
    '</div></div>';
}

window.addEventListener('error', (event) => anotar('error', event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => anotar('promesa', event.reason));

// React informa de los fallos de render por aquí, no lanzando: sin esta captura
// el error existe pero no lo ve nadie.
const errorOriginal = console.error.bind(console);
console.error = (...args: unknown[]) => {
  anotar('console', args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' '));
  errorOriginal(...args);
};
