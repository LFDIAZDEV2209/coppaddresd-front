/**
 * Lógica pura de la experiencia de llamada: clasificación de la causa de fin
 * (red vs consulta finalizada por el profesional vs ingreso no permitido) y
 * mapeo de códigos de error de Twilio a copy accionable. Sin dependencias de
 * React para poder testearse y reutilizarse en la UI.
 */

import type { AppointmentStatus } from "../types";

export type RoomEndCause = "network" | "session-ended" | "window-closed";

export interface RoomEndContext {
  appointmentStatus: AppointmentStatus | null;
  /** activeSessionStatus de GET /room (p. ej. "Ended"). */
  sessionStatus: string | null;
  /** status de GET /room (p. ej. "Active", "Ended"). */
  roomStatus: string | null;
}

/**
 * Clasifica por qué terminó (o se interrumpió) la llamada antes de decidir la
 * UI de fin:
 * - `session-ended`: la cita ya está Completed/Cancelled/NoShow o la sesión/sala
 *   quedó Ended (la finalizó el profesional o el webhook de Twilio).
 * - `window-closed`: la cita no admite ingreso (estado fuera de Confirmada o En
 *   curso). La ventana horaria solo restringe al paciente, no al personal.
 * - `network`: todo lo demás (caída de red con consulta vigente).
 */
export function classifyRoomEnd(context: RoomEndContext): RoomEndCause {
  const { appointmentStatus, sessionStatus, roomStatus } = context;

  if (
    appointmentStatus === "Completed" ||
    appointmentStatus === "Cancelled" ||
    appointmentStatus === "NoShow"
  ) {
    return "session-ended";
  }
  if (sessionStatus === "Ended" || roomStatus === "Ended") {
    return "session-ended";
  }
  if (
    appointmentStatus !== "Confirmed" &&
    appointmentStatus !== "InProgress"
  ) {
    return "window-closed";
  }
  return "network";
}

/** Extrae el código numérico de un error del SDK de Twilio (si lo trae). */
export function twilioErrorCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const code = Number((error as { code?: unknown }).code);
  return Number.isFinite(code) ? code : null;
}

/**
 * Mapea códigos comunes del SDK a la key i18n (texto en español) del mensaje
 * accionable. `null` cuando no hay un mapeo específico.
 */
export function mapTwilioErrorKey(error: unknown): string | null {
  switch (twilioErrorCode(error)) {
    case 53105:
      return "La sala alcanzó el máximo de participantes.";
    case 20101:
    case 20104:
      return "El acceso a la sala venció. Volvé a intentar la conexión.";
    case 53000:
    case 53405:
      return "Hubo un problema de red o de cámara/micrófono. Revisá tu conexión e intentá de nuevo.";
    default:
      return null;
  }
}
