import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

/**
 * Repara texto que se guardó con la codificación equivocada.
 *
 * PowerShell 5.1 lee un archivo UTF-8 sin BOM como si fuera Windows-1252, así
 * que `canción` acaba escrito como `canciÃ³n`. Si además solo se reescribió
 * parte del archivo, el resultado tiene las dos codificaciones mezcladas y no
 * sirve reinterpretarlo entero: hay que sustituir las secuencias rotas una a
 * una.
 */
const ROTAS = [
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
  ['Ã�', 'Á'], ['Ã‰', 'É'], ['Ã�', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'],
  ['Ã±', 'ñ'], ['Ã‘', 'Ñ'], ['Ã¼', 'ü'],
  ['â€¦', '…'], ['â€œ', '“'], ['â€', '”'], ['â€™', '’'], ['â€”', '—'], ['â€“', '–'],
  ['Â«', '«'], ['Â»', '»'], ['Â·', '·'], ['Âº', 'º'], ['Âª', 'ª'], ['Â¿', '¿'], ['Â¡', '¡'],
  ['â—€', '◀'], ['â–¶', '▶'], ['â™ª', '♪'], ['â†’', '→']
];

const ficheros = [];
for await (const f of glob('src/**/*.{ts,tsx,css}')) ficheros.push(f);

let arreglados = 0;
for (const fichero of ficheros) {
  const antes = await readFile(fichero, 'utf8');
  let despues = antes;
  for (const [rota, buena] of ROTAS) despues = despues.split(rota).join(buena);

  // `Â` suelto delante de un espacio es residuo del mismo problema.
  despues = despues.replace(/Â(?=\s)/g, '');

  if (antes === despues) continue;
  await writeFile(fichero, despues, 'utf8');
  console.log(`  reparado: ${fichero}`);
  arreglados += 1;
}

console.log(`\n${arreglados} archivos reparados.`);
