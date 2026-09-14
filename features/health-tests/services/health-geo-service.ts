import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";

const PATH = `${env.apiUrl}/api/v1/health-tests/geo`;

export interface HealthGeoCity {
  cityId: string | null;
  name: string;
  stateAbbr: string | null;
  count: number;
  /** Pacientes con evaluación completada (base del % de riesgo). */
  evaluatedCount: number;
  highRiskPct: number | null;
  avgScore: number | null;
  mapX: number | null;
  mapY: number | null;
}

export interface HealthGeoAlert {
  patientId: string;
  name: string;
  reason: string;
  score: number | null;
  severity: string | null;
}

export interface HealthGeoDto {
  cities: HealthGeoCity[];
  alerts: HealthGeoAlert[];
  totalPatients: number;
  avgScore: number | null;
  highRiskCount: number;
}

export async function fetchHealthGeo(
  signal?: AbortSignal,
): Promise<HealthGeoDto> {
  return apiFetch<HealthGeoDto>(PATH, { signal });
}
