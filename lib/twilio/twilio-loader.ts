/**
 * Carga bajo demanda del SDK de Twilio Video v2 desde el CDN oficial y expone
 * su namespace global tipado. El SDK no es una dependencia npm (paquete
 * deprecado por Twilio); se inyecta una única vez y se cachea en memoria para
 * todas las salas de la sesión.
 */

const SDK_URL = "https://sdk.twilio.com/js/video/releases/2.36.0/twilio-video.min.js";

let sdkPromise: Promise<TwilioVideo.Video> | null = null;

export function loadTwilioVideo(): Promise<TwilioVideo.Video> {
  if (!sdkPromise) {
    sdkPromise = injectScript(SDK_URL).then(() => {
      const sdk = (window as unknown as { Twilio?: { Video?: TwilioVideo.Video } })
        .Twilio?.Video;
      if (!sdk) {
        sdkPromise = null;
        throw new Error("El SDK de Twilio Video no se cargó correctamente.");
      }
      return sdk;
    });
  }
  return sdkPromise;
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo descargar el SDK de video."));
    document.head.appendChild(script);
  });
}