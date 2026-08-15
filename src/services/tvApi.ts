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
  /**
   * Si alguien ya reclamó esta pantalla.
   *
   * Es lo que impide rotar la sesión de una TV emparejada. Sin esta marca, el
   * código —que caducó a los dos minutos y cuya fecha queda en el pasado para
   * siempre— hacía que la pantalla tirara su token y se desemparejara sola cada
   * dos minutos, sin que el usuario tocara nada.
   */
  paired?: boolean;
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
  /** `reason` se enseña en pantalla: en un televisor no hay consola que abrir. */
  | { status: 'offline'; reason: string };

/** Lo último que se supo, para poder enseñarlo en pantalla. */
export let lastDiagnostic = 'iniciando…';

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

  // Un código caducado y **sin reclamar** no sirve de nada: se pide otro. Que
  // rote cada dos minutos es además lo correcto — un código en pantalla es,
  // mientras vive, la llave para vincular ese televisor a cualquier cuenta.
  //
  // La condición de `paired` no es un detalle: sin ella, una pantalla ya
  // emparejada también rotaba —su código caducó hace rato y esa fecha se queda
  // en el pasado para siempre—, así que se desemparejaba sola cada dos minutos.
  if (session && !session.paired && Date.parse(session.expiresAt) < Date.now()) {
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

    if (!response.ok) {
      return { status: 'offline', reason: `El servidor respondió ${response.status} al preguntar` };
    }

    const payload = (await response.json()) as {
      paired: boolean;
      nowPlaying: NowPlaying | null;
    };

    if (!payload.paired) return { status: 'pairing', code: session.code };

    // Se anota en cuanto se sabe: a partir de aquí esta pantalla no rota más,
    // por muy caducado que esté el código con el que se emparejó.
    if (!session.paired) writeStored({ ...session, paired: true });

    if (!payload.nowPlaying) return { status: 'idle' };
    return { status: 'playing', nowPlaying: payload.nowPlaying };
  } catch (error) {
    // Sin red: se conserva la sesión y se avisa. Borrarla obligaría a volver a
    // vincular por un corte de wifi de diez segundos.
    //
    // El motivo viaja hasta la pantalla porque este es exactamente el punto
    // donde un origen que falta en `CORS_ORIGINS` se ve igual que un cable
    // desenchufado, y desde el sofá no hay forma de distinguirlos.
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    lastDiagnostic = reason;
    return { status: 'offline', reason };
  }
}

export type Orden =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'seek'
  | 'shuffle'
  | 'repeat'
  | 'volume';

/**
 * Le pide algo al teléfono.
 *
 * El televisor no manda sobre la reproducción: la cola, el orden y la canción
 * siguiente los decide el teléfono. Esto solo transmite la pulsación, y por eso
 * los botones del mando funcionan aunque el audio lo esté sirviendo la TV.
 *
 * Los fallos se tragan a propósito: que una pausa no llegue no puede dejar la
 * pantalla rota, y la siguiente pulsación lo intentará de nuevo.
 */
export async function enviarOrden(action: Orden, value?: number): Promise<void> {
  const session = readStored();
  if (!session) return;

  try {
    await fetch(`${API_URL}/tv/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pulse-Tv-Token': session.token },
      body: JSON.stringify(value === undefined ? { action } : { action, value })
    });
  } catch {
    // Sin red la orden se pierde. Reintentar sola sería peor: una pausa que
    // llega diez segundos tarde para el usuario ya no es una pausa.
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
