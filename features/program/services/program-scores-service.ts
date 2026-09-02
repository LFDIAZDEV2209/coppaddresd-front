import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ScoresResponse,
  HealthScore,
  TransformationScore,
  IndicatorDetail,
} from "../types/scores";

const PATH = `${env.apiUrl}/api/v1/program/scores/calculate`;

// --- Payload crudo del backend (snake_case, SPEC §13.7.1) ---

interface RawIndicatorDetail {
  baseline: number;
  current: number;
  unit: string;
  delta: number;
  delta_pct: number;
  favorable: boolean;
  score: number;
}

interface RawHealthScore {
  current: number;
  previous: number | null;
  trend: string;
  dimensions: Partial<Record<string, number>> | null;
}

interface RawTransformationScore {
  current: number;
  previous: number | null;
  trend: string;
  week: number;
  detail: Record<string, RawIndicatorDetail> | null;
}

interface RawScoresResponse {
  health_score?: RawHealthScore | null;
  transformation_score?: RawTransformationScore | null;
}

// --- Normalización snake_case → camelCase ---

function mapIndicatorDetail(raw: RawIndicatorDetail): IndicatorDetail {
  return {
    baseline: raw.baseline,
    current: raw.current,
    unit: raw.unit,
    delta: raw.delta,
    deltaPct: raw.delta_pct,
    favorable: raw.favorable,
    score: raw.score,
  };
}

function mapHealthScore(raw: RawHealthScore): HealthScore {
  const d = raw.dimensions ?? {};
  return {
    current: raw.current,
    previous: raw.previous,
    trend: raw.trend,
    dimensions: {
      adherence: d.adherence ?? 0,
      clinical: d.clinical ?? 0,
      nutrition: d.nutrition ?? 0,
      psychology: d.psychology ?? 0,
      exercise: d.exercise ?? 0,
    },
  };
}

function mapTransformationScore(raw: RawTransformationScore): TransformationScore {
  const detail: Record<string, IndicatorDetail> = {};
  for (const [code, value] of Object.entries(raw.detail ?? {})) {
    if (value) {
      detail[code] = mapIndicatorDetail(value);
    }
  }
  return {
    current: raw.current,
    previous: raw.previous,
    trend: raw.trend,
    week: raw.week,
    detail,
  };
}

/**
 * Normaliza el payload del backend (snake_case) al shape camelCase del ERP.
 * Lanza si el payload no trae los dos índices esperados.
 */
export function mapScoresResponse(raw: RawScoresResponse): ScoresResponse {
  if (!raw?.health_score || !raw?.transformation_score) {
    throw new Error(
      "La respuesta del servidor no contiene los scores esperados.",
    );
  }
  return {
    healthScore: mapHealthScore(raw.health_score),
    transformationScore: mapTransformationScore(raw.transformation_score),
  };
}

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

  const raw = await apiFetch<RawScoresResponse>(PATH, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

  return mapScoresResponse(raw);
}
