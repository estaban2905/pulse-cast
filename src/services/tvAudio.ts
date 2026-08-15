/**
 * El audio, sonando **en el televisor**.
 *
 * Sin esto, la pantalla solo dibujaba lo que el teléfono estaba reproduciendo y
 * el sonido seguía saliendo por el altavoz del teléfono. Eso no es enviar música
 * a una televisión: es un cartel bonito.
 *
 * Aquí el televisor descarga el MP3 —directamente de Cloudflare, igual que hace
 * la aplicación— y lo reproduce. El teléfono queda como mando: dice qué canción,
 * en qué segundo y si va o está en pausa.
 */

/**
 * A partir de cuánta diferencia se corrige la posición.
 *
 * El teléfono avisa cada pocos segundos y la red no es instantánea, así que
 * siempre hay algo de desfase. Corregir por medio segundo se oiría como un
 * salto continuo; dejar pasar más de dos, como un eco.
 */
const DERIVA_MAX_S = 2;

let audio: HTMLAudioElement | null = null;
let fuenteActual = '';

function elemento(): HTMLAudioElement {
  if (audio) return audio;

  audio = new Audio();
  audio.preload = 'auto';
  // El navegador del televisor bloquea la reproducción automática con sonido si
  // no ha habido interacción. En una app instalada de Tizen no aplica esa
  // restricción, pero dejarlo explícito evita sorpresas en el navegador.
  audio.volume = 1;
  return audio;
}

export interface EstadoRemoto {
  streamUrl: string;
  /** Segundos, ya extrapolados desde el último aviso del teléfono. */
  posicion: number;
  reproduciendo: boolean;
}

/**
 * Pone el audio donde dice el teléfono.
 *
 * Se llama en cada vuelta de consulta. Es idempotente a propósito: cambiar de
 * canción, corregir la posición y arrancar o parar son decisiones que se toman
 * comparando con lo que ya está sonando, no recordando lo que se hizo antes.
 */
export function sincronizar({ streamUrl, posicion, reproduciendo }: EstadoRemoto): void {
  if (!streamUrl) return;

  const el = elemento();

  // Canción nueva: se carga y se sitúa. Comparar por URL y no por identificador
  // cubre además el caso de que el enlace firmado se renueve.
  if (fuenteActual !== streamUrl) {
    fuenteActual = streamUrl;
    el.src = streamUrl;
    el.load();
    // `currentTime` antes de tener metadatos no se aplica; se reintenta en la
    // siguiente vuelta, que llega en dos segundos.
    try {
      el.currentTime = posicion;
    } catch {
      // Todavía sin duración conocida.
    }
  }

  const deriva = Math.abs(el.currentTime - posicion);
  if (deriva > DERIVA_MAX_S && Number.isFinite(el.duration)) {
    el.currentTime = posicion;
  }

  if (reproduciendo && el.paused) {
    void el.play().catch(() => {
      // Un fallo aquí es casi siempre autoplay bloqueado. No se insiste: la
      // siguiente vuelta lo intenta otra vez.
    });
  } else if (!reproduciendo && !el.paused) {
    el.pause();
  }
}

/**
 * Volumen del audio que suena en el televisor, de 0 a 1.
 *
 * Este sí es local y no una orden para el teléfono: el sonido sale de aquí, así
 * que subirlo o bajarlo es cosa de esta pantalla.
 */
export function volumenTv(v: number): void {
  elemento().volume = Math.max(0, Math.min(1, v));
}

/** Silencia y suelta el audio: la pantalla dejó de tener canción que sonar. */
export function detener(): void {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  fuenteActual = '';
}
