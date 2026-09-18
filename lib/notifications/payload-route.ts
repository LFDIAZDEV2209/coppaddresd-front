/**
 * Resolución pura de la ruta a abrir a partir del `data` de una notificación
 * push (FCM). Vive en un módulo propio para reutilizarla en dos contextos:
 *
 * - Cliente (mensaje en primer plano): `router.push(resolvePushRoute(data))`.
 * - Service worker (click con la app en segundo plano): el route handler que
 *   sirve `firebase-messaging-sw.js` serializa esta función con `.toString()`.
 *
 * Convención de payload del backend (FcmClient + NotificationPushCommands):
 * `data.appointmentId` (o `appointment_id`) y `data.screen` ∈ {appointment, room}.
 * Si el payload no trae ids, se cae al listado de citas.
 */

export interface PushPayloadData {
  appointmentId?: unknown;
  appointment_id?: unknown;
  roomId?: unknown;
  room_id?: unknown;
  screen?: unknown;
  [key: string]: unknown;
}

/**
 * Devuelve la ruta del ERP asociada al payload del push.
 *
 * IMPORTANTE: mantener esta función AUTOCONTENIDA (sin referencias a otros
 * módulos ni constantes externas) — el service worker la embebe con
 * `.toString()` y cualquier referencia externa rompería el script.
 */
export function resolvePushRoute(data?: PushPayloadData | null): string {
  const source =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const firstId = (...values: unknown[]): string => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
    return "";
  };

  const appointmentId = firstId(source.appointmentId, source.appointment_id);
  const roomId = firstId(source.roomId, source.room_id);
  const screen =
    typeof source.screen === "string" ? source.screen.trim().toLowerCase() : "";

  if (screen === "room" || roomId.length > 0) {
    const id = roomId.length > 0 ? roomId : appointmentId;
    if (id.length > 0) {
      return `/appointments/room/${encodeURIComponent(id)}`;
    }
  }

  if (appointmentId.length > 0) {
    return `/appointments/citas/${encodeURIComponent(appointmentId)}`;
  }

  // Respaldo: sin ids no hay destino concreto (p. ej. push de chat).
  return "/appointments";
}
