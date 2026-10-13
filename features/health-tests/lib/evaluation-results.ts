import type { RiskLevel } from "../types";

/** La severidad procede del instrumento; un puntaje crudo no define riesgo. */
export function riskFromSeverity(severity: string | null | undefined, qualifier?: string | null): RiskLevel {
  // Compatibilidad con resultados históricos guardados con low sin rangos.
  if (qualifier?.trim().toLowerCase() === "sin clasificar") return "sin-evaluar";
  const levels: Record<string, RiskLevel> = {
    low: "bajo", moderate: "moderado", high: "alto", critical: "critico",
  };
  return levels[severity ?? ""] ?? "sin-evaluar";
}

/** Orden cronológico independiente del orden de paginación de la API. */
export function completedInDateOrder<T extends {
  status: string; startedAt: string; completedAt: string | null;
}>(evaluations: T[]): T[] {
  return evaluations.filter((evaluation) => evaluation.status === "completed")
    .sort((a, b) => Date.parse(a.completedAt ?? a.startedAt) - Date.parse(b.completedAt ?? b.startedAt));
}
