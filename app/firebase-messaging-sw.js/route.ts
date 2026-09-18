/**
 * Service worker de Firebase Cloud Messaging, servido dinámicamente en
 * `/firebase-messaging-sw.js` (scope raíz). Se usa un Route Handler en lugar de
 * un archivo estático en `public/` porque la config pública de Firebase debe
 * leerse de `NEXT_PUBLIC_FIREBASE_*` en runtime; un archivo de `public/` no
 * recibe reemplazo de variables de entorno de Next.
 *
 * El script generado:
 * - Carga el SDK compat de FCM desde el CDN oficial (versión = dependencia npm).
 * - Registra un handler propio de `notificationclick` ANTES de
 *   `firebase.messaging()`: el handler del SDK consume los clicks que traen
 *   `fcmOptions.link` e ignora el resto, así que el deep link de citas se
 *   resuelve acá con el helper compartido (embebido vía `.toString()`).
 * - Muestra en segundo plano los pushes data-only (si el push trae
 *   `notification`, el SDK ya la mostró y no se duplica).
 *
 * Sin config el script es un no-op y el cliente ni siquiera lo registra
 * (`getWebPushConfig()` devuelve null → la UI oculta la activación).
 */

import { resolvePushRoute } from "@/lib/notifications/payload-route";

// La config debe reevaluarse en cada request (no cachear el script en build).
export const dynamic = "force-dynamic";

// Debe coincidir con la versión de `firebase` en package.json: los scripts
// compat del mismo release viven en gstatic.
const FIREBASE_COMPAT_VERSION = "12.19.0";

interface WebPushEnvConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

function readWebPushConfig(): WebPushEnvConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "",
  };
}

export async function GET() {
  const config = readWebPushConfig();
  const configured = Object.values(config).every((value) => value.length > 0);

  const body = configured
    ? buildServiceWorker(config)
    : "// FCM no configurado: define NEXT_PUBLIC_FIREBASE_* (ver .env.example).\n";

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

function buildServiceWorker(config: WebPushEnvConfig): string {
  return `/* Generado por app/firebase-messaging-sw.js/route.ts — no editar a mano. */
importScripts(
  "https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-messaging-compat.js"
);

firebase.initializeApp(${JSON.stringify(config)});

// Deep link compartido con el cliente (lib/notifications/payload-route.ts).
const resolvePushRoute = ${resolvePushRoute.toString()};

function extractPushData(raw) {
  if (!raw || typeof raw !== "object") return {};
  // Las notificaciones mostradas por el SDK envuelven el payload original en
  // data.FCM_MSG; las mostradas acá (data-only) llevan el data directo.
  const wrapped = raw.FCM_MSG;
  if (
    wrapped &&
    typeof wrapped === "object" &&
    wrapped.data &&
    typeof wrapped.data === "object"
  ) {
    return wrapped.data;
  }
  return raw;
}

async function openOrFocus(route) {
  const target = new URL(route, self.location.origin).href;
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of windows) {
    try {
      await client.focus();
      if ("navigate" in client) {
        const navigated = await client.navigate(target);
        if (navigated) return navigated;
      }
    } catch {
      // Cliente no navegable: se prueba el siguiente o se abre uno nuevo.
    }
  }
  return self.clients.openWindow(target);
}

// Se registra ANTES de firebase.messaging() para tener prioridad: el handler
// del SDK llamaría stopImmediatePropagation() y cerraría sin abrir destino
// cuando el payload no trae fcmOptions.link.
self.addEventListener("notificationclick", (event) => {
  const data = extractPushData(event.notification && event.notification.data);
  const route = resolvePushRoute(data);
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(openOrFocus(route));
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Con \`notification\` el SDK ya la mostró; volver a mostrarla duplicaría el aviso.
  if (payload && payload.notification) return;
  const data = (payload && payload.data) || {};
  const title = data.title || "CoppAddresd";
  const body = data.body || data.message || "";
  return self.registration.showNotification(title, {
    body: body,
    icon: "/LogoIndividual.png",
    data: data,
    tag: data.tag || undefined,
  });
});
`;
}
