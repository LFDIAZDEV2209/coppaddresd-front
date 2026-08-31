import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  Intervention,
  PaginatedInterventionsResult,
  UpdateInterventionStatusInput,
} from "../types/interventions";

const BASE = `${env.apiUrl}/api/v1/program/interventions`;

/** Cola clínica de intervenciones abiertas (Program.Adapt). */
export async function fetchOpenInterventions(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<PaginatedInterventionsResult> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiFetch<PaginatedInterventionsResult>(
    `${BASE}/open?${params.toString()}`,
    { signal },
  );
}

/** Transición de estado de una intervención (Program.Adapt). */
export async function updateInterventionStatus(
  id: string,
  input: UpdateInterventionStatusInput,
): Promise<Intervention> {
  return apiFetch<Intervention>(`${BASE}/${id}/status`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
