import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  Weakness,
  PaginatedWeaknessesResult,
  WeaknessTransitionStatus,
} from "../types/weaknesses";

const PATH = `${env.apiUrl}/api/v1/program/weaknesses/open`;

// --- Cola clínica de debilidades abiertas ---

export async function fetchOpenWeaknesses(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<PaginatedWeaknessesResult> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiFetch<PaginatedWeaknessesResult>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

// --- Transición de estado ---

export async function updateWeaknessStatus(
  id: string,
  status: WeaknessTransitionStatus,
): Promise<Weakness> {
  return apiFetch<Weakness>(
    `${env.apiUrl}/api/v1/program/weaknesses/${id}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
}
