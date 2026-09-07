import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { DashboardKpis } from "../types";

const PATH = `${env.apiUrl}/api/v1/dashboard/kpis`;

/**
 * KPIs reales del Home del ERP: totales y conteos de los últimos N días
 * (pacientes, tests de salud, inventario, tareas de programa) más la serie
 * temporal diaria para la gráfica de actividad. Sin rango, el backend
 * responde con los últimos 30 días.
 */
export async function fetchDashboardKpis(range?: {
  days?: number;
}): Promise<DashboardKpis> {
  const params = new URLSearchParams();
  if (range?.days) {
    params.set("days", String(range.days));
  }
  const query = params.toString();
  return apiFetch<DashboardKpis>(`${PATH}${query ? `?${query}` : ""}`);
}
