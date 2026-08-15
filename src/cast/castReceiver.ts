/**
 * Puente con el Chromecast.
 *
 * Este archivo es lo único que sabe que existe Google Cast. Todo lo demás
 * —contexto, modos, visualizador— recibe un estado normal y no se entera de
 * dónde salió, que es lo que permite abrir esta misma página en un navegador
 * para diseñarla sin un Chromecast delante.
 *
 * Los tipos son locales y mínimos a propósito. `@types/chromecast-caf-receiver`
 * existe, pero declara globales que chocan con `lib.dom` y arrastra una
 * configuración de `types` en el tsconfig; describir aquí las cuatro cosas que
 * de verdad se usan sale más barato y no puede romper el build.
 */

export interface CastMediaInfo {
  trackId: string | null;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  duration: number;
}

export interface CastPlaybackState {
  isPlaying: boolean;
  /** Segundos. Lo manda el reproductor del dispositivo, no un contador nuestro. */
  position: number;
}

interface ReceiverHandlers {
  onMedia: (media: CastMediaInfo) => void;
  onState: (state: CastPlaybackState) => void;
  /** El emisor se desconectó: la TV debe volver a un estado de reposo. */
  onEnded: () => void;
}

/* ---------------------------------------------------------------------------
 * Forma mínima del SDK. Solo lo que se llama de verdad.
 * ------------------------------------------------------------------------ */

interface CafMetadata {
  title?: string;
  artist?: string;
  albumName?: string;
  images?: Array<{ url?: string }>;
}

interface CafMediaInformation {
  contentId?: string;
  duration?: number;
  customData?: { trackId?: string };
  metadata?: CafMetadata;
}

interface CafLoadRequest {
  media?: CafMediaInformation;
}

interface CafPlayerManager {
  addEventListener(type: string, handler: (event: unknown) => void): void;
  setMessageInterceptor(type: string, handler: (request: CafLoadRequest) => CafLoadRequest): void;
  getCurrentTimeSec(): number;
  getMediaInformation(): CafMediaInformation | null;
}

interface CafReceiverContext {
  getPlayerManager(): CafPlayerManager;
  start(options?: Record<string, unknown>): void;
  addEventListener(type: string, handler: (event: unknown) => void): void;
}

interface CafNamespace {
  framework: {
    CastReceiverContext: { getInstance(): CafReceiverContext };
    events: { EventType: Record<string, string> };
    system: { EventType: Record<string, string> };
  };
}

declare global {
  interface Window {
    cast?: CafNamespace;
  }
}

/**
 * Cierto solo cuando la página corre **dentro de un Chromecast**.
 *
 * No basta con mirar si existe `window.cast`. El SDK se carga desde `gstatic`
 * con una etiqueta `<script>` normal y define ese objeto en **cualquier**
 * navegador: comprobar su presencia daba cierto en un móvil y en el navegador
 * de un televisor, así que la página entraba en modo Cast, se quedaba esperando
 * una canción que nunca llegaba, y nunca llegaba a pedir código de
 * emparejamiento. Desde fuera se veía como una pantalla de reposo eterna.
 *
 * `CrKey` es la marca que Google pone en el user-agent de sus dispositivos de
 * Cast, y es lo que de verdad los distingue.
 */
export const isCastDevice = (): boolean =>
Boolean(window.cast?.framework) && /\bCrKey\//i.test(navigator.userAgent);

const emptyMedia: CastMediaInfo = {
  trackId: null,
  title: '',
  artist: '',
  album: '',
  coverUrl: null,
  duration: 0
};

function readMedia(media: CafMediaInformation | null | undefined): CastMediaInfo {
  if (!media) return emptyMedia;

  const metadata = media.metadata ?? {};
  return {
    // `customData.trackId` es lo que manda Pulse Mobile y lo que permite pedir
    // la letra. Si algún día llega una carga desde otro emisor, `contentId`
    // sirve de recambio para no quedarse sin nada.
    trackId: media.customData?.trackId ?? media.contentId ?? null,
    title: metadata.title ?? 'Reproduciendo',
    artist: metadata.artist ?? '',
    album: metadata.albumName ?? '',
    coverUrl: metadata.images?.[0]?.url ?? null,
    duration: media.duration ?? 0
  };
}

/**
 * Arranca el receptor y avisa de cada cambio.
 *
 * Devuelve `false` si no hay SDK, para que quien llama sepa que tiene que
 * pintar el modo de demostración en lugar de esperar una carga que no llegará.
 */
export function startCastReceiver(handlers: ReceiverHandlers): boolean {
  const framework = window.cast?.framework;
  if (!framework) return false;

  const context = framework.CastReceiverContext.getInstance();
  const player = context.getPlayerManager();
  const events = framework.events.EventType;

  // El interceptor de LOAD es el único sitio donde se ve la petición completa
  // —con su `customData`— antes de que el reproductor la consuma. Devuelve la
  // petición intacta: aquí solo se mira, no se modifica.
  player.setMessageInterceptor('LOAD', (request) => {
    handlers.onMedia(readMedia(request.media));
    return request;
  });

  const pushState = (isPlaying: boolean) => {
    handlers.onState({ isPlaying, position: player.getCurrentTimeSec() || 0 });
  };

  player.addEventListener(events.PLAYING ?? 'PLAYING', () => pushState(true));
  player.addEventListener(events.PAUSE ?? 'PAUSE', () => pushState(false));

  // `TIME_UPDATE` llega varias veces por segundo mientras suena; es lo que
  // mantiene la letra en su sitio sin que aquí haya ningún temporizador.
  player.addEventListener(events.TIME_UPDATE ?? 'TIME_UPDATE', () => {
    handlers.onState({ isPlaying: true, position: player.getCurrentTimeSec() || 0 });
  });

  // Cambiar de canción no siempre pasa por LOAD —una cola gestionada por el
  // emisor cambia la información de medios sin recargar—, así que también se
  // escucha el cambio directo.
  player.addEventListener(events.MEDIA_INFORMATION_CHANGED ?? 'MEDIA_INFORMATION_CHANGED', () => {
    handlers.onMedia(readMedia(player.getMediaInformation()));
  });

  player.addEventListener(events.MEDIA_FINISHED ?? 'MEDIA_FINISHED', () => pushState(false));

  context.addEventListener(framework.system.EventType.SENDER_DISCONNECTED ?? 'SENDER_DISCONNECTED', () => {
    handlers.onEnded();
  });

  context.start();
  return true;
}
