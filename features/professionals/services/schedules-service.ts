/**
 * Horarios semanales de atención del profesional.
 * Recurso dedicado (design.md decisión 6): los horarios son un recurso
 * separado del empleado con su propio endpoint, por eso viven aquí y no en
 * employees-service.ts.
 *
 * Contrato del backend (§Gestión de personas, coppAddresdBack/AGENTS.md):
 * - GET  /api/v1/professionals/{id}/schedules → ProfessionalScheduleDto[]
 * - PUT  /api/v1/professionals/{id}/schedules (body { schedules }) → 204;
 *   reemplazo total, máx. 7 filas, weekday 1–7 ISO único, endTime > startTime.
 * - {id} es el id de la extensión profesional (erp.professionals), no del
 *   empleado núcleo.
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";
import type { ProfessionalScheduleDto } from "@/features/professionals/types/schedule";

/** Lee los horarios semanales de atención de un profesional. */
export async function getSchedules(
  professionalId: string,
): Promise<ProfessionalScheduleDto[]> {
  return apiFetch<ProfessionalScheduleDto[]>(
    `${env.apiUrl}/api/v1/professionals/${professionalId}/schedules`,
  );
}

/** Reemplaza los horarios semanales de atención (PUT total-replace). */
export async function updateSchedules(
  professionalId: string,
  schedules: ProfessionalScheduleDto[],
): Promise<void> {
  await apiFetch<void>(
    `${env.apiUrl}/api/v1/professionals/${professionalId}/schedules`,
    {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    },
  );
}
