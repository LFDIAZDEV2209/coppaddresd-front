/**
 * Servicio SOS (borrador de bandeja ERP — Misión SOS Panic).
 *
 * Endpoints del design D8 (`openspec/changes/sos-panic-real`):
 * - `POST /api/v1/sos/alerts/{id}/attend` → `aud=erp`, permiso
 *   `Sos.Alerts.Manage` + scope clínico; el backend aplica anti-IDOR
 *   (REQ-SOS-05) respondiendo 404/403 NO revelador.
 * - `GET /api/v1/sos/alerts/{id}` → staff con scope.
 * - `GET /api/v1/sos/alerts` → ASUNCIÓN del borrador (listado staff paginado
 *   con filtro por estado); alinear con los agentes principales del backend
 *   antes de wire-up final.
 *
 * El frontend NUNCA activa ni cancela alertas: eso es exclusivo de la app
 * móvil (`aud=app`). Este servicio solo consulta y ATENDE.
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";
import type {
  PaginatedSosAlertsResult,
  SosAlertDto,
  SosAlertStatus,
} from "../types";

const SOS_PATH = `${env.apiUrl}/api/v1/sos`;

export interface SosAlertsQuery {
  status?: SosAlertStatus | null;
  page?: number;
  pageSize?: number;
}

/** Listado paginado de alertas para el staff ERP (borrador, ver comentario). */
export async function fetchSosAlerts(
  query: SosAlertsQuery = {},
): Promise<PaginatedSosAlertsResult> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));
  return apiFetch<PaginatedSosAlertsResult>(
    `${SOS_PATH}/alerts?${params.toString()}`,
  );
}

/** Detalle de una alerta (staff con alcance clínico sobre el paciente). */
export async function fetchSosAlert(id: string): Promise<SosAlertDto> {
  return apiFetch<SosAlertDto>(`${SOS_PATH}/alerts/${id}`);
}

/**
 * Atiende la alerta (Activa → Atendida). Transición terminal: el backend
 * registra actor y marca de tiempo; 404/403 no revelador fuera de scope.
 * `apiFetch` lanza `ApiError` tipada — la UI nunca filtra el motivo exacto.
 */
export async function attendSosAlert(id: string): Promise<SosAlertDto> {
  return apiFetch<SosAlertDto>(`${SOS_PATH}/alerts/${id}/attend`, {
    method: "POST",
  });
}
