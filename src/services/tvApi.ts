/**
 * El canal para televisores que no hablan Google Cast.
 *
 * Samsung y LG no lo implementan, así que ahí esta pantalla no puede *recibir*
 * la canción: tiene que ir a buscarla. Enseña un código, el teléfono lo reclama,
 * y a partir de ahí pregunta qué está sonando en esa cuenta.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://pulse-api-mq9p.onrender.com/v1').replace(/\/$/, '');

/**
 * Dónde se recuerda la pantalla.
 *
 * Sin esto, apagar el televisor obligaría a vincularlo otra vez cada mañana. El
 * token no caduca al emparejar, así que la vinculación sobrevive a reinicios.
 */
const STORAGE_KEY = 'pulse.tv.session.v1';

interface StoredSession {
  token: string;
  /** Se guarda para poder seguir enseñándolo tras recargar la página. */
  code: string;
  /** Cuándo deja de servir el código. Pasado eso se pide uno nuevo. */
  expiresAt: string;
}

export interface NowPlaying {
  trackId: string;
  positionMs: number;
  isPlaying: boolean;
  /** Cuándo lo informó el teléfono. Con esto se extrapola entre dos consultas. */
  reportedAt: string;
}

export type TvState =
  | { status: 'pairing'; code: string }
  | { status: 'idle' }
  | { status: 'playing'; nowPlaying: NowPlaying }
  | { status: 'offline' };

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStored(session: StoredSession | null): void {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento la pantalla funciona igual; solo pedirá código otra vez
    // al recargar, que es molesto pero no impide nada.
  }
}

async function createSession(): Promise<StoredSession> {
  const response = await fetch(`${API_URL}/tv/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: 'Televisor' })
  });

  if (!response.ok) throw new Error(`El servidor respondió ${response.status}`);

  const payload = (await response.json()) as { token: string; code: string; expiresAt: string };
  const session: StoredSession = {
    token: payload.token,
    code: payload.code,
    expiresAt: payload.expiresAt
  };
  writeStored(session);
  return session;
}

/**
 * Una vuelta completa: se asegura de tener sesión, pregunta, y decide qué
 * enseñar.
 *
 * Toda la lógica de recuperación vive aquí para que la pantalla solo tenga que
 * pintar el estado que recibe. Los tres casos que importan son: nadie me ha
 * reclamado todavía, ya soy de alguien pero no suena nada, y esto es lo que
 * suena.
 */
export async function pollTv(): Promise<TvState> {
  let session = readStored();

  // Un código caducado y sin reclamar no sirve de nada: se pide otro. Que rote
  // cada dos minutos es además lo correcto — un código en pantalla es, mientras
  // vive, la llave para vincular ese televisor a cualquier cuenta.
  if (session && Date.parse(session.expiresAt) < Date.now()) {
    session = null;
  }

  try {
    if (!session) session = await createSession();

    const response = await fetch(`${API_URL}/tv/now-playing`, {
      headers: { Accept: 'application/json', 'X-Pulse-Tv-Token': session.token }
    });

    // 401 es la pantalla desvinculada desde el teléfono. Se olvida y se empieza
    // de cero, que es exactamente lo que el usuario acaba de pedir.
    if (response.status === 401) {
      writeStored(null);
      const fresh = await createSession();
      return { status: 'pairing', code: fresh.code };
    }

    if (!response.ok) return { status: 'offline' };

    const payload = (await response.json()) as {
      paired: boolean;
      nowPlaying: NowPlaying | null;
    };

    if (!payload.paired) return { status: 'pairing', code: session.code };
    if (!payload.nowPlaying) return { status: 'idle' };
    return { status: 'playing', nowPlaying: payload.nowPlaying };
  } catch {
    // Sin red: se conserva la sesión y se avisa. Borrarla obligaría a volver a
    // vincular por un corte de wifi de diez segundos.
    return { status: 'offline' };
  }
}

/** Posición real ahora, extrapolada desde el último aviso del teléfono. */
export function currentPosition(nowPlaying: NowPlaying): number {
  const base = nowPlaying.positionMs / 1000;
  if (!nowPlaying.isPlaying) return base;

  const elapsed = (Date.now() - Date.parse(nowPlaying.reportedAt)) / 1000;
  // Un reloj de televisor puede ir desfasado respecto al del servidor. Si la
  // resta sale negativa, se ignora en vez de retroceder la letra.
  return base + Math.max(0, elapsed);
}
