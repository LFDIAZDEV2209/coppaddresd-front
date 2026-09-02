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

function normalizeAdaptation(raw: Adaptation & Record<string, unknown>): Adaptation {
  const anyRaw = raw as Record<string, unknown>;
  const name =
    (anyRaw.patient_name as string | null | undefined) ??
    (anyRaw.patientName as string | null | undefined) ??
    (anyRaw.PatientName as string | null | undefined) ??
    null;
  const trimmed = typeof name === "string" ? name.trim() : null;
  return {
    ...raw,
    patient_name: trimmed && trimmed.length > 0 ? trimmed : null,
    patientName: trimmed && trimmed.length > 0 ? trimmed : null,
  };
}

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

  const result = await apiFetch<PaginatedAdaptationsResult>(`${PATH}?${params.toString()}`, {
    signal,
  });
  return {
    ...result,
    data: (result.data ?? []).map((a) => normalizeAdaptation(a as Adaptation & Record<string, unknown>)),
  };
}

// --- Decisión clínica (Approve / Reject) ---

export async function decideAdaptation(
  id: string,
  decision: AdaptationDecisionAction,
  note?: string,
): Promise<Adaptation> {
  const raw = await apiFetch<Adaptation & Record<string, unknown>>(`${PATH}/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, note: note ?? null }),
  });
  return normalizeAdaptation(raw);
}
