import type { AppointmentDto } from "../types";

/**
 * Ventana de reapertura de una consulta completada (F5).
 *
 * La gracia efectiva la resuelve el backend por organización/clínica y llega
 * en el detalle de la cita como `reopenGraceMinutes` (default 60, rango
 * 5–1440). El ERP no duplica el valor: solo compara contra `completedAt`.
 *
 * Fail-closed: si el payload no trae el campo (backend viejo o listado sin
 * enriquecer) o la cita no está `Completed`/sin `completedAt`, el botón de
 * reapertura no se muestra. Nunca se asume un default local.
 */
export function canReopenWithinGrace(
  appointment: Pick<
    AppointmentDto,
    "status" | "completedAt" | "reopenGraceMinutes"
  >,
  now: number,
): boolean {
  if (appointment.status !== "Completed") return false;
  if (appointment.completedAt == null) return false;
  const graceMinutes = appointment.reopenGraceMinutes;
  if (typeof graceMinutes !== "number" || !Number.isFinite(graceMinutes)) {
    return false;
  }
  const elapsed = now - new Date(appointment.completedAt).getTime();
  return elapsed < graceMinutes * 60_000;
}
