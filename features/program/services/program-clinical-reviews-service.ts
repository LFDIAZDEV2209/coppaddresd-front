import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { ClinicalReview, PaginatedResult } from "../types";

const PATH = `${env.apiUrl}/api/v1/program/xp-rules/clinical-pending`;

// --- Cola de revisiones clínicas pendientes ---

export async function fetchClinicalReviews(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<PaginatedResult<ClinicalReview>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiFetch<PaginatedResult<ClinicalReview>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

// --- Decidir (aprobar / rechazar) ---

export async function decideClinicalReview(
  id: string,
  approve: boolean,
): Promise<ClinicalReview> {
  return apiFetch<ClinicalReview>(`${PATH}/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ approve }),
  });
}
