import { spawnSync } from 'node:child_process';
import { cp, glob, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Compila y arma la carpeta que Tizen empaqueta.
 *
 * No firma ni genera el `.wgt`: eso lo hace el comando `tizen`, que necesita un
 * certificado de Samsung y por tanto la máquina de quien publica.
 *
 * Lo que sí resuelve son las dos cosas que se fallan por despiste:
 *
 * - **La base tiene que ser relativa.** En GitHub Pages el sitio cuelga de
 *   `/pulse-cast/`, pero dentro del paquete el `index.html` está en la raíz. Con
 *   la base de Pages, el televisor pediría `/pulse-cast/assets/…`, no lo
 *   encontraría, y enseñaría una pantalla negra sin ningún mensaje.
 * - **`config.xml` y el icono van en la raíz** del paquete, junto al
 *   `index.html`, no en una subcarpeta.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');
const out = join(root, 'tizen-build');

console.log('Compilando con base relativa…');
const build = spawnSync('npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  // `PULSE_CAST_TIZEN` es lo que apaga los módulos ES. Ver `vite.config.ts`: un
  // `<script type="module">` cargado desde `file://` lo bloquea CORS y el
  // televisor se queda con la pantalla negra, sin ningún error a la vista.
  env: { ...process.env, PULSE_CAST_BASE: './', PULSE_CAST_TIZEN: '1' }
});

if (build.status !== 0) {
  console.error('La compilación falló.');
  process.exit(build.status ?? 1);
}

/*
 * Quitar `type="module"` del HTML.
 *
 * Vite lo emite siempre, mande lo que mande el formato de salida. Pero el
 * bundle ya es un script clásico —`iife`— y, sobre todo, un módulo ES cargado
 * desde `file://` lo bloquea CORS: el televisor no ejecuta nada, no imprime
 * ningún error, y la pantalla se queda negra. `crossorigin` sobra por lo mismo.
 *
 * Se hace aquí y no con un plugin porque es una línea y solo afecta al paquete
 * de Tizen; el sitio de GitHub Pages sí quiere módulos.
 */
const indexPath = join(dist, 'index.html');
const html = await readFile(indexPath, 'utf8');

/*
 * `defer` no es opcional al quitar `type="module"`.
 *
 * Un script de módulo se aplaza solo: no corre hasta que el documento está
 * completo. Un script clásico en `<head>` corre de inmediato, antes de que
 * exista el `<body>` — y entonces `getElementById("root")` devuelve `null`,
 * React no monta nada, y **no se lanza ningún error**.
 *
 * El resultado es una pantalla negra con el registro de fallos vacío, que es el
 * peor sitio donde buscar: parece que no se ejecuta el código cuando en
 * realidad se ejecuta perfectamente y no encuentra dónde pintar.
 */
const classic = html
  .replace(/\s+crossorigin/g, '')
  .replace(/<script\s+type="module"\s+src=/g, '<script defer src=');

await writeFile(indexPath, classic, 'utf8');

// Se busca dentro de una etiqueta `<script>`, no en todo el texto: el propio
// `index.html` explica en un comentario por qué el SDK va sin módulo, y esa
// mención hacía saltar la comprobación contra un HTML que estaba bien.
if (/<script[^>]*type="module"/.test(classic)) {
  console.error('El HTML sigue con type="module"; en el televisor daría pantalla negra.');
  process.exit(1);
}

/*
 * Colores en `rgba()` clásico.
 *
 * Tailwind emite `rgb(255 255 255 / 0.1)` —sintaxis de CSS Color 4—. Un
 * navegador que no la interprete descarta la declaración entera, y un botón que
 * debía ser translúcido se queda sin fondo o hereda uno sólido. En pantalla se
 * ve como cápsulas blancas macizas donde debería haber controles discretos.
 *
 * `rgba(255,255,255,0.1)` significa exactamente lo mismo y lo entiende
 * cualquier navegador desde hace quince años.
 */
const MODERNO = /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+%?)\s*\)/g;

// El CSS acaba **dentro del JS**: con un solo bundle `iife`, Vite lo inyecta en
// tiempo de ejecución en lugar de emitir un `.css` aparte. Por eso se recorren
// los dos.
for await (const fichero of glob(join(dist, 'assets', '*.{css,js}'))) {
  const antes = await readFile(fichero, 'utf8');
  const despues = antes.replace(MODERNO, (_, r, g, b, a) => {
    const alfa = a.endsWith('%') ? Number(a.slice(0, -1)) / 100 : a;
    return `rgba(${r},${g},${b},${alfa})`;
  });
  if (antes !== despues) {
    const cuantos = (antes.match(MODERNO) ?? []).length;
    await writeFile(fichero, despues, 'utf8');
    console.log(`  ${cuantos} colores convertidos a rgba(): ${fichero.split(/[\\/]/).pop()}`);
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await cp(dist, out, { recursive: true });
await cp(join(root, 'tizen', 'config.xml'), join(out, 'config.xml'));
await cp(join(root, 'tizen', 'icon.png'), join(out, 'icon.png'));

const files = await readdir(out);
console.log('');
console.log(`Listo: ${out}`);
console.log(`Contenido: ${files.join(', ')}`);
console.log('');
console.log('Con Tizen Studio instalado y el televisor en modo desarrollador:');
console.log('');
console.log('  tizen certificate -a Pulse -f pulse -p 1234');
console.log('  tizen security-profiles add -n pulse -a ~/tizen-studio-data/keystore/author/pulse.p12 -p 1234');
console.log('  tizen package -t wgt -s pulse -- tizen-build');
console.log('  tizen install -n tizen-build/PulseMusic1.wgt -t <nombre-de-tu-tv>');
