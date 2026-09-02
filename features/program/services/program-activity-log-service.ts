import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { ActivityLogEntry, PaginatedResult } from "../types";

const PATH = `${env.apiUrl}/api/v1/program/activity-log`;

/** Filtros de la bitácora de actividad. */
export interface ActivityLogFilters {
  table?: string;
  action?: string;
  /** Fecha ISO (inclusive). */
  from?: string;
  /** Fecha ISO (inclusive). */
  to?: string;
  /** Email del actor (coincidencia parcial). */
  actor?: string;
}

/**
 * Lista la bitácora de actividad del módulo programa.
 * GET /api/v1/program/activity-log
 */
export async function fetchActivityLog(
  page: number,
  pageSize: number,
  filters: ActivityLogFilters,
  signal?: AbortSignal,
): Promise<PaginatedResult<ActivityLogEntry>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters.table) params.set("table", filters.table);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.actor) params.set("actor", filters.actor);

  return apiFetch<PaginatedResult<ActivityLogEntry>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}
