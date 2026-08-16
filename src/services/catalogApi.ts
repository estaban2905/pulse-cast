/**
 * El catálogo, para poder ponerle cara a un identificador.
 *
 * El teléfono informa de qué suena mandando solo el `trackId`; el título, el
 * artista y la carátula hay que buscarlos. Se descarga una vez al arrancar y se
 * indexa en memoria: un televisor está horas encendido y sería absurdo volver a
 * pedir un catálogo entero en cada canción.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://pulse-api-mq9p.onrender.com/v1').replace(/\/$/, '');

export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number;
  /**
   * El MP3, firmado y listo para sonar **en el televisor**.
   *
   * Es lo que convierte esta pantalla en algo útil: sin esto la TV solo dibuja
   * lo que suena en el teléfono, y el sonido sigue saliendo por el altavoz del
   * teléfono, que es exactamente lo que nadie quiere al enviar música a una
   * televisión.
   */
  streamUrl: string;
}

interface RawCatalog {
  artists: Array<{ id: string; name: string }>;
  albums: Array<{ id: string; title: string; coverUrl: string }>;
  tracks: Array<{
    id: string;
    title: string;
    artistId: string;
    albumId: string;
    duration: number;
    coverUrl?: string;
    streamUrl: string;
  }>;
}

let index: Map<string, CatalogTrack> | null = null;
let loading: Promise<Map<string, CatalogTrack>> | null = null;

async function load(): Promise<Map<string, CatalogTrack>> {
  const response = await fetch(`${API_URL}/catalog`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`El catálogo respondió ${response.status}`);

  const catalog = (await response.json()) as RawCatalog;

  const artists = new Map(catalog.artists.map((artist) => [artist.id, artist.name]));
  const albums = new Map(catalog.albums.map((album) => [album.id, album]));

  const built = new Map<string, CatalogTrack>();
  for (const track of catalog.tracks) {
    const album = albums.get(track.albumId);
    built.set(track.id, {
      id: track.id,
      title: track.title,
      artist: artists.get(track.artistId) ?? '',
      album: album?.title ?? '',
      // La pista puede traer portada propia; si no, hereda la del álbum.
      coverUrl: track.coverUrl ?? album?.coverUrl ?? '',
      duration: track.duration,
      streamUrl: track.streamUrl
    });
  }

  index = built;
  return built;
}

/**
 * Busca una pista. Descarga el catálogo la primera vez.
 *
 * Las llamadas simultáneas comparten la misma descarga: al arrancar, la pantalla
 * puede preguntar por la canción antes de que termine la primera carga.
 */
/**
 * Todo el catálogo, para que el televisor pueda navegarlo con el mando.
 *
 * `/catalog` es público: la app de TV no necesita cuenta ni teléfono para dejar
 * elegir música, que es lo que se espera de una aplicación de televisor.
 */
export async function listTracks(): Promise<CatalogTrack[]> {
  if (index) return [...index.values()];

  loading ??= load().finally(() => {
    loading = null;
  });

  try {
    return [...(await loading).values()];
  } catch {
    return [];
  }
}

export async function findTrack(trackId: string): Promise<CatalogTrack | null> {
  if (index) return index.get(trackId) ?? null;

  loading ??= load().finally(() => {
    loading = null;
  });

  try {
    return (await loading).get(trackId) ?? null;
  } catch {
    return null;
  }
}
