/** Interfaces de scores del programa — espejo de los DTOs del backend. */

/** Detalle de un indicador del Índice de Transformación. */
export interface IndicatorDetail {
  baseline: number;
  current: number;
  unit: string;
  delta: number;
  deltaPct: number;
  favorable: boolean;
  score: number;
}

/** Índice de Salud: puntaje actual, anterior, tendencia y 5 dimensiones. */
export interface HealthScore {
  current: number;
  previous: number | null;
  trend: string;
  dimensions: HealthScoreDimensions;
}

/** Las 5 dimensiones del Índice de Salud (0..100). */
export interface HealthScoreDimensions {
  adherence: number;
  clinical: number;
  nutrition: number;
  psychology: number;
  exercise: number;
}

/** Índice de Transformación: puntaje actual, anterior, tendencia, semana y detalle. */
export interface TransformationScore {
  current: number;
  previous: number | null;
  trend: string;
  week: number;
  detail: Record<string, IndicatorDetail>;
}

/** Respuesta completa del endpoint de scores. */
export interface ScoresResponse {
  healthScore: HealthScore;
  transformationScore: TransformationScore;
}
