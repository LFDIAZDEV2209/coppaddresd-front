"use client";

/**
 * Push web del ERP vía Firebase Cloud Messaging (FCM). El backend (`FcmClient`)
 * envía con FCM desde el MISMO proyecto Firebase que usa la app móvil; acá se
 * obtiene el token del navegador y se registra como dispositivo "web".
 *
 * FLUJO:
 *   1. `registerWebPush()` pide permiso (SIEMPRE dentro de un gesto del
 *      usuario) y obtiene el token FCM con la config pública del proyecto.
 *   2. El token se registra en el backend con
 *      `POST /api/v1/notifications/devices` ({ token, platform: "web" }).
 *   3. `subscribeToForegroundPush()` resuelve el deep link de los mensajes que
 *      llegan con la pestaña visible (el service worker maneja el segundo plano).
 *
 * PRERREQUISITO MANUAL (fuera del alcance del código):
 *   1. En la consola de Firebase (mismo proyecto FCM del backend), agregar una
 *      "App web" y copiar apiKey / projectId / messagingSenderId / appId.
 *   2. En Cloud Messaging → Configuración web → "Certificados push web",
 *      generar el par de claves VAPID y copiar la clave pública.
 *   3. Definir NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID,
 *      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID y
 *      NEXT_PUBLIC_FIREBASE_VAPID_KEY (ver .env.example).
 * Sin esos valores el módulo degrada: `getWebPushConfig()` devuelve null y la
 * UI oculta la activación (nunca se lanza una excepción por config ausente).
 */

import { registerDevice } from "@/features/notifications/services/notifications-service";
import type { PushPayloadData } from "@/lib/notifications/payload-route";

export interface WebPushConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

export type WebPushRegistrationResult =
  | { status: "registered"; token: string }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "missing-config" }
  | { status: "error"; message: string };

export interface ForegroundPushPayload {
  data: PushPayloadData;
  notification?: { title?: string; body?: string };
}

// App con nombre propio: evita colisiones con otras inicializaciones de
// Firebase en la misma página y sobrevive al Fast Refresh de desarrollo.
const FIREBASE_APP_NAME = "coppaddresd-erp-push";

// El registro del token se deduplica a nivel de módulo (doble click / StrictMode).
let registrationPromise: Promise<WebPushRegistrationResult> | null = null;

// El re-registro silencioso (permiso ya concedido) corre una sola vez por sesión.
let syncedThisSession = false;

/** Config pública de Firebase o null si falta cualquier variable requerida. */
export function getWebPushConfig(): WebPushConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) {
    return null;
  }

  return { apiKey, projectId, messagingSenderId, appId, vapidKey };
}

/** Soporte del navegador para service workers + Notification + Push API. */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

/**
 * Pide permiso y registra el token FCM del navegador en el backend.
 * SIEMPRE debe invocarse desde un gesto del usuario (click); de lo contrario
 * el navegador ignora/deniega `Notification.requestPermission()`.
 */
export function registerWebPush(): Promise<WebPushRegistrationResult> {
  if (!registrationPromise) {
    registrationPromise = doRegisterWebPush().finally(() => {
      registrationPromise = null;
    });
  }
  return registrationPromise;
}

async function doRegisterWebPush(): Promise<WebPushRegistrationResult> {
  const config = getWebPushConfig();
  if (!config) return { status: "missing-config" };
  if (!isWebPushSupported()) return { status: "unsupported" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { status: "denied" };

    const token = await getFcmToken(config);
    if (!token) {
      return { status: "error", message: "FCM no devolvió un token." };
    }

    await registerDevice({ token, platform: "web" });
    return { status: "registered", token };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Re-registra el token de forma silenciosa cuando el permiso ya está concedido
 * (rotación de token FCM / login nuevo en el mismo navegador). Best-effort:
 * nunca pide permiso ni lanza; se ejecuta una vez por sesión.
 */
export async function syncWebPushRegistration(): Promise<boolean> {
  if (syncedThisSession) return false;

  const config = getWebPushConfig();
  if (!config || !isWebPushSupported()) return false;
  if (Notification.permission !== "granted") return false;

  syncedThisSession = true;
  try {
    const token = await getFcmToken(config);
    if (!token) return false;
    await registerDevice({ token, platform: "web" });
    return true;
  } catch {
    // Degradación: sin red o sin FCM no se registra; se reintenta en la
    // próxima carga de la app.
    syncedThisSession = false;
    return false;
  }
}

/**
 * Escucha mensajes FCM con la pestaña visible (primer plano). Devuelve la
 * función de limpieza; si no hay config/permiso, no hace nada.
 */
export function subscribeToForegroundPush(
  onPush: (payload: ForegroundPushPayload) => void,
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  void (async () => {
    const config = getWebPushConfig();
    if (!config || !isWebPushSupported()) return;
    if (Notification.permission !== "granted") return;

    try {
      const messaging = await getMessagingInstance(config);
      if (!messaging || cancelled) return;

      const { onMessage } = await import("firebase/messaging");
      if (cancelled) return;

      unsubscribe = onMessage(messaging, (payload) => {
        onPush({
          data: (payload.data ?? {}) as PushPayloadData,
          notification: payload.notification,
        });
      });
    } catch {
      // Degradación: sin FCM no hay mensajes en primer plano.
    }
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
    unsubscribe = null;
  };
}

// --- Internos de Firebase (carga dinámica: el SDK no entra al bundle inicial) ---

async function getMessagingInstance(
  config: WebPushConfig,
): Promise<import("firebase/messaging").Messaging | null> {
  const [{ getApp, getApps, initializeApp }, { getMessaging, isSupported }] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);

  if (!(await isSupported())) return null;

  const app = getApps().some((candidate) => candidate.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(config, FIREBASE_APP_NAME);

  return getMessaging(app);
}

/**
 * Obtiene (o renueva) el token FCM asociado al service worker propio.
 * `serviceWorkerRegistration` explícito: sin esto el SDK registraría su
 * `/firebase-messaging-sw.js` por defecto, que acá es una ruta dinámica.
 */
async function getFcmToken(config: WebPushConfig): Promise<string | null> {
  const messaging = await getMessagingInstance(config);
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/", updateViaCache: "none" },
  );
  await navigator.serviceWorker.ready;

  const { getToken } = await import("firebase/messaging");
  return getToken(messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });
}
