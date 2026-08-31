import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  Adaptation,
  AdaptationDecisionAction,
  PaginatedAdaptationsResult,
  AdaptationStatus,
} from "../types/adaptations";

const PATH = `${env.apiUrl}/api/v1/program/adaptations`;

// --- Cola de recomendaciones de adaptación ---

export async function fetchAdaptations(
  page: number,
  pageSize: number,
  status?: AdaptationStatus,
  signal?: AbortSignal,
): Promise<PaginatedAdaptationsResult> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status) {
    params.set("status", status);
  }

  return apiFetch<PaginatedAdaptationsResult>(`${PATH}?${params.toString()}`, {
    signal,
  });
}

// --- Decisión clínica (Approve / Reject) ---

export async function decideAdaptation(
  id: string,
  decision: AdaptationDecisionAction,
  note?: string,
): Promise<Adaptation> {
  return apiFetch<Adaptation>(`${PATH}/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, note: note ?? null }),
  });
}
