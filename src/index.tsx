// El primero de todo, antes que React: en el televisor, React llama a
// `queueMicrotask` al evaluarse, y sin el respaldo la aplicación no arranca.
import "./polyfills";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { setupTizen } from "./tizen";

/**
 * Pinta el fallo en la pantalla.
 *
 * En un televisor no hay consola que abrir. Sin esto, cualquier error al
 * arrancar deja la pantalla negra, sin responder ni al botón de atrás —porque
 * el código que lo escucha tampoco llegó a ejecutarse— y es indistinguible de
 * un televisor colgado.
 */
function mostrarFallo(detalle: unknown): void {
  const root = document.getElementById("root");
  if (!root) return;

  const texto =
    detalle instanceof Error
      ? `${detalle.name}: ${detalle.message}\n\n${detalle.stack ?? ""}`
      : String(detalle);

  root.innerHTML =
    '<div style="position:fixed;inset:0;background:#0B0B0F;color:#FF8A94;' +
    'font:15px/1.5 monospace;padding:5vh 5vw;overflow:auto">' +
    '<div style="color:#F7F7FA;font-size:24px;font-weight:800;margin-bottom:14px;' +
    'font-family:sans-serif">Pulse no pudo arrancar</div>' +
    '<div style="white-space:pre-wrap;word-break:break-word">' +
    texto.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c) +
    "</div></div>";
}

// Solo hace algo dentro de un televisor Samsung: le enseña a cerrarse con la
// tecla «atrás» del mando. En cualquier otro sitio no toca nada.
try {
  setupTizen();
} catch (error) {
  mostrarFallo(error);
}

const rootEl = document.getElementById("root");
if (rootEl) {
  try {
    ReactDOM.createRoot(rootEl).render(<App />);
  } catch (error) {
    // Un fallo aquí es casi siempre una función que el navegador del televisor
    // no tiene. Enseñarlo por pantalla convierte media hora de inspector remoto
    // en una lectura de dos segundos.
    mostrarFallo(error);
  }
}

// El render de React es asíncrono: un error dentro de un componente no lo
// atrapa el `try` de arriba, llega por aquí.
window.addEventListener("unhandledrejection", (event) => {
  const root = document.getElementById("root");
  if (root && root.children.length === 0) mostrarFallo(event.reason);
});
