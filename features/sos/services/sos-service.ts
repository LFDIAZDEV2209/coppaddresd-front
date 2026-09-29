/**
 * Servicio SOS (bandeja ERP — Misión SOS Panic).
 *
 * Contrato real (`coppAddresdBack/src/CoppAddresd.Api/Controllers/SosController.cs`):
 * - `GET /api/v1/sos/alerts?status&page&pageSize` → `SosAlertsPage`
 *   (`{ data, total, page, pageSize, totalPages }`), staff-only con permiso
 *   `Sos.Alerts.Manage` y scope clínico (D5); filas `SosAlertListItemDto`
 *   sin PII innecesaria.
 * - `POST /api/v1/sos/alerts/{id}/attend` → 200 con el `SosAlertDto` completo;
 *   404/403 NO reveladores fuera de scope (anti-IDOR, REQ-SOS-05) y 409 si
 *   la alerta ya está en estado terminal.
 * - `GET /{id}` → detalle completo (staff con scope).
 *
 * El frontend NUNCA activa ni cancela alertas: eso es exclusivo de la app
 * móvil (`aud=app`). Este servicio solo consulta y ATENDE.
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";
import type { SosAlertDto, SosAlertStatus, SosAlertsPage } from "../types";

const SOS_PATH = `${env.apiUrl}/api/v1/sos`;

export interface SosAlertsQuery {
  status?: SosAlertStatus | null;
  page?: number;
  pageSize?: number;
}

/** Listado paginado de la bandeja SOS staff (filtro por estado validado server-side). */
export async function fetchSosAlerts(
  query: SosAlertsQuery = {},
): Promise<SosAlertsPage> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));
  return apiFetch<SosAlertsPage>(`${SOS_PATH}/alerts?${params.toString()}`);
}

/** Detalle de una alerta (staff con alcance clínico sobre el paciente). */
export async function fetchSosAlert(id: string): Promise<SosAlertDto> {
  return apiFetch<SosAlertDto>(`${SOS_PATH}/alerts/${id}`);
}

/**
 * Atiende la alerta (Activa → Atendida). Transición terminal: el backend
 * registra actor y marca de tiempo y responde 200 con el detalle. La
 * `ApiError` tipada llega a la UI — nunca se filtra el motivo exacto
 * (anti-IDOR: 404 vs 403 son indistinguibles para el usuario).
 */
export async function attendSosAlert(id: string): Promise<SosAlertDto> {
  return apiFetch<SosAlertDto>(`${SOS_PATH}/alerts/${id}/attend`, {
    method: "POST",
  });
}
