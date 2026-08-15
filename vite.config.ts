import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `base` es obligatorio y es el error clásico de GitHub Pages.
 *
 * Pages sirve el sitio en `https://usuario.github.io/pulse-cast/`, no en la
 * raíz del dominio. Sin esto, el HTML pide `/assets/…` en lugar de
 * `/pulse-cast/assets/…`, y el resultado es una página en blanco con dos 404
 * que en la televisión no se ven por ninguna parte.
 *
 * Con un dominio propio, `base` vuelve a ser `/`.
 */
export default defineConfig({
  plugins: [react()],
  base: process.env.PULSE_CAST_BASE ?? '/pulse-cast/',
  build: {
    // El Chromecast lleva un Chrome fijo y algo antiguo. Apuntar a `es2019`
    // evita que Vite emita sintaxis que el dispositivo no entiende y que se
    // manifestaría como una pantalla negra sin ningún mensaje.
    target: 'es2019'
  }
});
