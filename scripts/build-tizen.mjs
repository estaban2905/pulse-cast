import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm, readdir } from 'node:fs/promises';
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
  env: { ...process.env, PULSE_CAST_BASE: './' }
});

if (build.status !== 0) {
  console.error('La compilación falló.');
  process.exit(build.status ?? 1);
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
