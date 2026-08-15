import type { LyricLine } from '../types/player';

/**
 * Letras, pedidas a Pulse API.
 *
 * El receptor no habla con ningún proveedor externo: pregunta por el
 * identificador de la pista y el servidor ya tiene la letra guardada. Por eso
 * aquí no hay nada que interprete el formato LRC — llega en líneas.
 *
 * El origen de esta página tiene que estar en `CORS_ORIGINS` del API. Si falta,
 * el fallo es silencioso de la peor manera: el servidor responde 200 y el
 * dispositivo descarta la respuesta antes de que este código la vea.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://pulse-api-mq9p.onrender.com/v1').replace(/\/$/, '');

/** Lo que devuelve `GET /tracks/:id/lyrics`. */
interface LyricsResponse {
  status: 'synced' | 'plain' | 'instrumental' | 'missing';
  source: string;
  lines: Array<{ time: number; text: string }>;
}

export interface Lyrics {
  /** Cierto solo cuando hay marcas de tiempo y se puede resaltar el verso. */
  synced: boolean;
  lines: LyricLine[];
}

export const noLyrics: Lyrics = { synced: false, lines: [] };

/**
 * Una copia por pista, para toda la sesión.
 *
 * La TV se queda encendida horas y una playlist repite canciones; sin esto,
 * volver a una ya escuchada saldría otra vez a la red.
 */
const cache = new Map<string, Lyrics>();

export async function fetchLyrics(trackId: string, signal?: AbortSignal): Promise<Lyrics> {
  const hit = cache.get(trackId);
  if (hit) return hit;

  try {
    const response = await fetch(`${API_URL}/tracks/${encodeURIComponent(trackId)}/lyrics`, {
      headers: { Accept: 'application/json' },
      signal
    });

    if (!response.ok) {
      // Un 404 es «esa pista no existe» y un 503, «el proveedor no contesta».
      // Ninguno de los dos se cachea como «esta canción no tiene letra».
      return noLyrics;
    }

    const payload = (await response.json()) as LyricsResponse;

    const lyrics: Lyrics = {
      synced: payload.status === 'synced',
      // El API habla de `time`; esta interfaz, de `t`. La traducción vive aquí
      // y no en las pantallas, que no tienen por qué conocer el contrato.
      lines: payload.lines.map((line) => ({ t: line.time, text: line.text }))
    };

    cache.set(trackId, lyrics);
    return lyrics;
  } catch {
    // Incluye el aborto por cambio de canción: quien llama ya no quiere esto.
    return noLyrics;
  }
}
