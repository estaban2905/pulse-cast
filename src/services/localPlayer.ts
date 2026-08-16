import { findTrack, listTracks, type CatalogTrack } from './catalogApi';

/**
 * El reproductor del televisor.
 *
 * La primera versión de esta app no tenía: dependía del teléfono para todo, y
 * eso convertía una aplicación de televisor en un cartel. Una app de TV se abre
 * con el mando y funciona sola, como cualquier otra del televisor.
 *
 * El teléfono sigue pudiendo enviar música —eso no se pierde— pero ya no hace
 * falta para nada.
 */

let audio: HTMLAudioElement | null = null;

function elemento(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  return audio;
}

export interface EstadoLocal {
  cola: string[];
  indice: number;
  pista: CatalogTrack | null;
  reproduciendo: boolean;
  posicion: number;
  duracion: number;
  volumen: number;
  aleatorio: boolean;
  repetir: 'off' | 'all' | 'one';
}

type Escucha = (estado: EstadoLocal) => void;

const estado: EstadoLocal = {
  cola: [],
  indice: 0,
  pista: null,
  reproduciendo: false,
  posicion: 0,
  duracion: 0,
  volumen: 1,
  aleatorio: false,
  repetir: 'off'
};

const escuchas = new Set<Escucha>();
const avisar = () => escuchas.forEach((f) => f({ ...estado }));

export function suscribir(f: Escucha): () => void {
  escuchas.add(f);
  f({ ...estado });
  return () => escuchas.delete(f);
}

function conectar(): HTMLAudioElement {
  const el = elemento();
  if (el.dataset.listo) return el;
  el.dataset.listo = '1';

  el.addEventListener('timeupdate', () => {
    estado.posicion = el.currentTime;
    avisar();
  });
  el.addEventListener('loadedmetadata', () => {
    estado.duracion = Number.isFinite(el.duration) ? el.duration : estado.pista?.duration ?? 0;
    avisar();
  });
  el.addEventListener('play', () => {
    estado.reproduciendo = true;
    avisar();
  });
  el.addEventListener('pause', () => {
    estado.reproduciendo = false;
    avisar();
  });
  el.addEventListener('ended', () => void siguiente(true));

  return el;
}

async function cargar(indice: number, arrancar: boolean): Promise<void> {
  const id = estado.cola[indice];
  if (!id) return;

  const pista = await findTrack(id);
  if (!pista) return;

  estado.indice = indice;
  estado.pista = pista;
  estado.posicion = 0;
  estado.duracion = pista.duration;

  const el = conectar();
  el.src = pista.streamUrl;
  el.load();
  if (arrancar) void el.play().catch(() => undefined);
  avisar();
}

/** Empieza a reproducir una lista desde una posición concreta. */
export async function reproducir(cola: string[], desde = 0): Promise<void> {
  estado.cola = cola;
  await cargar(desde, true);
}

/**
 * Deja la cola lista y la primera canción cargada, **sin sonar**.
 *
 * Que una aplicación empiece a dar música sola al encender el televisor es
 * agresivo. Así al abrirla ya se ve la carátula y basta pulsar OK.
 */
export async function preparar(cola: string[]): Promise<void> {
  estado.cola = cola;
  await cargar(0, false);
}

export function alternar(): void {
  const el = conectar();
  if (el.paused) void el.play().catch(() => undefined);
  else el.pause();
}

/**
 * `automatico` distingue el final de una canción de una pulsación.
 *
 * Solo en el primer caso manda `repetir: 'one'`: quien pulsa «siguiente»
 * espera la siguiente canción, no repetir la misma.
 */
export async function siguiente(automatico = false): Promise<void> {
  if (automatico && estado.repetir === 'one') {
    await cargar(estado.indice, true);
    return;
  }

  const ultimo = estado.cola.length - 1;
  if (estado.aleatorio && estado.cola.length > 1) {
    let n = estado.indice;
    while (n === estado.indice) n = Math.floor(Math.random() * estado.cola.length);
    await cargar(n, true);
    return;
  }

  if (estado.indice < ultimo) {
    await cargar(estado.indice + 1, true);
  } else if (estado.repetir === 'all') {
    await cargar(0, true);
  } else {
    conectar().pause();
  }
}

export async function anterior(): Promise<void> {
  // Igual que en cualquier reproductor: si ya avanzó, «anterior» vuelve al
  // principio de la canción antes de cambiar de pista.
  if (estado.posicion > 4) {
    conectar().currentTime = 0;
    return;
  }
  await cargar(estado.indice > 0 ? estado.indice - 1 : estado.cola.length - 1, true);
}

export function saltar(segundos: number): void {
  const el = conectar();
  el.currentTime = Math.max(0, Math.min(segundos, estado.duracion || segundos));
}

export function volumen(v: number): void {
  estado.volumen = Math.max(0, Math.min(1, v));
  conectar().volume = estado.volumen;
  avisar();
}

export function alternarAleatorio(): void {
  estado.aleatorio = !estado.aleatorio;
  avisar();
}

export function ciclarRepetir(): void {
  estado.repetir = estado.repetir === 'off' ? 'all' : estado.repetir === 'all' ? 'one' : 'off';
  avisar();
}

/** Arranca con todo el catálogo, para que abrir la app ya suene algo. */
export async function arrancarCatalogo(): Promise<string[]> {
  const pistas = await listTracks();
  return pistas.map((p) => p.id);
}
