import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

/**
 * Sustituye `clamp()` por el valor en `vw`.
 *
 * El televisor lleva Chromium 69 y `clamp()` llegó en el 79: la regla entera se
 * descarta como inválida y el texto cae a los 16px por defecto del navegador.
 * En la pantalla se veía todo diminuto y amontonado en el centro.
 *
 * `vw` sí funciona, y es lo correcto aquí: la aplicación siempre se ve a
 * 1920x1080. El mínimo legible para pantallas pequeñas se resuelve con una
 * media query en `index.css`, que Chromium 69 sí entiende.
 */
const patron = /clamp\(\s*[^,]+,\s*([^,]+?)\s*,\s*[^)]+\)/g;

const ficheros = [];
for await (const f of glob('src/**/*.{ts,tsx,css}')) ficheros.push(f);

let total = 0;
for (const fichero of ficheros) {
  const antes = await readFile(fichero, 'utf8');
  const despues = antes.replace(patron, (_, medio) => medio.trim());
  if (antes !== despues) {
    const n = (antes.match(patron) ?? []).length;
    total += n;
    await writeFile(fichero, despues, 'utf8');
    console.log(`  ${fichero}: ${n}`);
  }
}
console.log(`\nSustituidos ${total} usos de clamp().`);
