import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dos destinos con reglas distintas.
 *
 * **GitHub Pages** sirve el sitio desde `/pulse-cast/`, así que `base` no puede
 * ser `/`: sin eso el HTML pide `/assets/…` y el resultado es una página en
 * blanco con dos 404 que en un televisor no se ven por ninguna parte.
 *
 * **El paquete de Tizen** se abre desde el sistema de archivos del televisor, y
 * ahí cambian dos cosas más:
 *
 * - Las rutas tienen que ser relativas, porque el `index.html` está en la raíz
 *   del paquete y no colgando de `/pulse-cast/`.
 * - **No puede haber módulos ES.** Vite emite `<script type="module">` por
 *   defecto, y un módulo cargado desde `file://` lo bloquea CORS: el navegador
 *   no ejecuta nada, no imprime error visible, y la pantalla se queda negra.
 *   Por eso el paquete se compila como un único script clásico.
 */
const forTizen = process.env.PULSE_CAST_TIZEN === '1';

export default defineConfig({
  plugins: [react()],
  base: process.env.PULSE_CAST_BASE ?? '/pulse-cast/',
  build: {
    // El televisor lleva un Chromium de 2019. `es2015` evita que Vite emita
    // sintaxis que ese motor no entiende, que se manifestaría —otra vez— como
    // una pantalla negra sin ningún mensaje.
    target: forTizen ? 'es2015' : 'es2019',

    // La precarga de módulos no tiene sentido sin módulos, y añade etiquetas
    // que en `file://` solo pueden fallar.
    modulePreload: forTizen ? false : undefined,

    rollupOptions: forTizen
      ? {
          output: {
            format: 'iife',
            // Un solo archivo: `iife` no admite trozos separados, y además
            // evita cualquier carga diferida sobre `file://`.
            inlineDynamicImports: true,
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
          }
        }
      : undefined
  }
});
