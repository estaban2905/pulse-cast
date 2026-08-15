# Pulse TV

Receptor de Google Cast de Pulse Music. Es lo que se ve en el televisor cuando
alguien envía una canción desde la app: carátula, **letra sincronizada** y un
visualizador.

Una página estática. No tiene servidor, ni base de datos, ni sesión.

## Cómo encaja

```
Pulse Mobile  ──envía──>  Chromecast  ──carga──>  esta página
                              │
                              └── reproduce el MP3 desde Cloudflare R2
                                        │
esta página  ──GET /tracks/:id/lyrics──>  Pulse API
```

El audio **no pasa por aquí**. Lo reproduce el propio Chromecast desde R2; esta
página solo mira y pinta. Por eso su único trabajo de red es pedir la letra.

El identificador de la canción llega dentro de la carga, en
`customData.trackId`, que es lo que la app móvil ya enviaba desde antes de que
esto existiera. No hubo que tocar la app para esto.

## Lo que decide qué se ve

No hay menús. Un Chromecast no tiene puntero ni teclado, así que un botón en
esta pantalla sería un botón que nadie puede pulsar; se manda todo desde el
teléfono. El modo se elige solo:

| Situación | Pantalla |
|---|---|
| Hay letra | Letra sincronizada, verso a verso |
| No hay letra | Carátula grande |
| Nadie ha enviado nada | Reposo, con visualizador tenue |

## Desarrollo

```powershell
npm.cmd install
npm.cmd run dev
```

Se abre en el navegador **sin Chromecast**: al no existir `window.cast`, entra
en modo de demostración con una canción de ejemplo y la letra avanzando. Sirve
para trabajar el diseño; no prueba la integración con Cast.

## Publicar en GitHub Pages

El flujo de trabajo de [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
lo publica en cada empujón a `main`. Una sola vez, en el repositorio:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Variables → Actions**, añade `VITE_API_URL` con la URL de la API.

Queda servido en `https://<usuario>.github.io/pulse-cast/`.

Dos cosas que rompen esto y no avisan:

- **`base` en [`vite.config.ts`](vite.config.ts).** Pages sirve desde un
  subdirectorio, no desde la raíz. Sin `base`, el HTML pide `/assets/…` en lugar
  de `/pulse-cast/assets/…` y el televisor enseña una pantalla negra sin ningún
  mensaje. El flujo de trabajo lo deriva del nombre del repositorio.
- **`public/.nojekyll`.** Pages pasa todo por Jekyll, que ignora en silencio
  cualquier archivo o carpeta que empiece por `_`. Ese archivo vacío lo apaga.

## Registrar el receptor en Google

Sin esto, el Chromecast no sabe que esta página existe.

1. [Cast Developer Console](https://cast.google.com/publish) — tiene una cuota
   de registro de **5 USD**, de pago único.
2. **New Application → Custom Receiver**, con la URL de Pages de arriba.
   Te devuelve un **Application ID**.
3. Registra el número de serie de tu Chromecast en *Cast Receiver Devices*.
   Hasta publicar la aplicación, solo los dispositivos registrados pueden
   abrirla, y el dispositivo tarda unos minutos en enterarse.
4. En `pulse-mobile/app.json`, cambia `receiverAppId` por el tuyo y reconstruye
   el APK.

> [!IMPORTANT]
> El origen de esta página tiene que estar en `CORS_ORIGINS` de la API:
> `https://<usuario>.github.io`, solo el origen, sin la ruta del repositorio.
> El Chromecast pide la letra desde aquí, y si falta, el fallo es del peor tipo:
> la API responde `200` y el dispositivo descarta la respuesta antes de que este
> código la vea. En pantalla no se ve un error, se ve una canción sin letra.

## Por qué el visualizador no sigue al audio

Porque no puede. El Chromecast reproduce el MP3 internamente y no expone la
señal a la página, así que no hay análisis de frecuencia posible. La animación
sigue al estado de reproducción y a un pulso supuesto —`audioSim`—, y es
honesta consigo misma: se mueve con la música, no *según* la música.

## Verificación

```powershell
npm.cmd run typecheck
npm.cmd run build
```
