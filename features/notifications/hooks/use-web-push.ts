"use client";

/**
 * Estado y acciones del push web para la UI (panel de notificaciones del
 * topbar). Encapsula:
 * - Estado derivado de la config (presente/ausente), soporte del navegador y
 *   permiso actual (`granted` / `denied` / `default`).
 * - Activación bajo gesto del usuario (`enable`).
 * - Re-registro silencioso del token cuando el permiso ya está concedido.
 * - Deep link de los mensajes en primer plano (router.push).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePushRoute } from "@/lib/notifications/payload-route";
import {
  getWebPushConfig,
  isWebPushSupported,
  registerWebPush,
  subscribeToForegroundPush,
  syncWebPushRegistration,
} from "@/lib/notifications/web-push";

export type WebPushUiState =
  | "missing-config"
  | "unsupported"
  | "default"
  | "working"
  | "granted"
  | "denied"
  | "error";

export interface WebPushController {
  state: WebPushUiState;
  /** Activa el push: pide permiso y registra el token (llamar desde un click). */
  enable: () => Promise<void>;
}

/**
 * Estado inicial sin efectos: en SSR devuelve "default" (el panel recién se
 * monta al abrir el dropdown, no hay HTML que hidratar) y en el navegador lee
 * config, soporte y permiso actual.
 */
function getInitialWebPushState(): WebPushUiState {
  if (typeof window === "undefined") return "default";
  if (!getWebPushConfig()) return "missing-config";
  if (!isWebPushSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "default";
}

export function useWebPush(): WebPushController {
  const router = useRouter();
  const [state, setState] = useState<WebPushUiState>(getInitialWebPushState);

  // Re-registro silencioso del token si el permiso ya estaba concedido
  // (rotación de token / login nuevo). No toca el estado: es best-effort.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getWebPushConfig() || !isWebPushSupported()) return;
    if (Notification.permission === "granted") {
      void syncWebPushRegistration();
    }
  }, []);

  // Deep link de pushes recibidos con la pestaña visible.
  useEffect(() => {
    return subscribeToForegroundPush((payload) => {
      router.push(resolvePushRoute(payload.data));
    });
  }, [router]);

  const enable = useCallback(async () => {
    setState("working");
    const result = await registerWebPush();

    switch (result.status) {
      case "registered":
        setState("granted");
        break;
      case "denied":
        setState("denied");
        break;
      case "unsupported":
        setState("unsupported");
        break;
      case "missing-config":
        setState("missing-config");
        break;
      default:
        setState("error");
    }
  }, []);

  return { state, enable };
}
