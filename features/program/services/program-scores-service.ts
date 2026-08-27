import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { ScoresResponse } from "../types/scores";

const PATH = `${env.apiUrl}/api/v1/program/scores/calculate`;

/**
 * Calcula los scores de un paciente.
 * POST /api/v1/program/scores/calculate
 * Body: { patientId, periodEndLocalDate? }
 */
export async function calculateScores(
  patientId: string,
  periodEndLocalDate?: string,
  signal?: AbortSignal,
): Promise<ScoresResponse> {
  const body: Record<string, string> = { patientId };
  if (periodEndLocalDate) {
    body.periodEndLocalDate = periodEndLocalDate;
  }

  return apiFetch<ScoresResponse>(PATH, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}
