import type {
  ClinicalIndicator,
  HealthAlert,
  PatientMasterRow,
  PatientProfile,
  PatientTestResult,
  PatientTypification,
  RiskLevel,
  TestCategory,
} from "../types";

/**
 * Lógica de dominio del módulo de Tests de Salud.
 *
 * Hoy se alimenta de mock data; mañana estas mismas funciones reciben los
 * DTOs del backend. La tipificación y los umbrales están declarados aquí
 * (único lugar) para que sea trivial moverlos a reglas de servidor.
 */

export const CATEGORY_LABELS: Record<TestCategory, string> = {
  "historia-clinica": "Historia clínica",
  nutricion: "Nutrición",
  movimiento: "Movimiento",
  sueno: "Sueño",
  adherencia: "Adherencia",
  "salud-mental": "Salud mental",
  cardiometabolico: "Cardiometabólico",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  bajo: "Bajo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
  "sin-evaluar": "Sin evaluar",
};

export const RISK_ORDER: RiskLevel[] = ["bajo", "moderado", "alto", "critico"];

export function riskSeverity(risk: RiskLevel): number {
  return RISK_ORDER.indexOf(risk);
}

/** Riesgo global = el peor nivel entre los tests evaluados. */
export function patientRisk(results: PatientTestResult[]): RiskLevel {
  const evaluated = results.filter((r) => r.score !== null);
  if (evaluated.length === 0) return "sin-evaluar";
  let worst: RiskLevel = "bajo";
  for (const r of evaluated) {
    if (riskSeverity(r.risk) > riskSeverity(worst)) worst = r.risk;
  }
  return worst;
}

/** Interpretación del score normalizado 0-100 según la dirección del indicador. */
export function interpretScore(
  score: number,
  indicator: ClinicalIndicator,
): { label: string; risk: RiskLevel } {
  for (const range of indicator.ranges) {
    if (score >= range.min && score <= range.max) {
      return { label: range.label, risk: range.risk };
    }
  }
  return { label: "Fuera de rango", risk: "sin-evaluar" };
}

/**
 * Tipificación del paciente según completitud de la batería y resultados.
 * Reglas declarativas (mock) — mismas categorías que maneja el ERP.
 */
export function typifyPatient(patient: PatientProfile): PatientTypification {
  const results = patient.results;
  const completed = results.filter((r) => r.state === "completado");
  const inProgress = results.filter((r) => r.state === "en-progreso");

  if (completed.length === 0 && inProgress.length === 0) {
    return "sin-informacion";
  }
  if (completed.length < 5) {
    return "evaluacion-incompleta";
  }

  const risk = patientRisk(results);
  if (risk === "critico" || risk === "alto") return "alto-riesgo";
  if (risk === "moderado") return "riesgo-moderado";
  return "bajo-riesgo";
}

export function typificationLabel(t: PatientTypification): string {
  const labels: Record<PatientTypification, string> = {
    "evaluacion-completa": "Evaluación completa",
    "evaluacion-incompleta": "Evaluación incompleta",
    "bajo-riesgo": "Bajo riesgo",
    "riesgo-moderado": "Riesgo moderado",
    "alto-riesgo": "Alto riesgo",
    "seguimiento-prioritario": "Seguimiento prioritario",
    "sin-informacion": "Sin información",
  };
  return labels[t];
}

/** Prioridad de seguimiento de un paciente pendiente (regla declarativa). */
export function pendingPriority(
  patient: PatientProfile,
): "alta" | "media" | "baja" {
  const risk = patientRisk(patient.results);
  const days = daysBetween(patient.assignedAt, new Date().toISOString());
  if (risk === "alto" || risk === "critico" || days > 21) return "alta";
  if (risk === "moderado" || days > 10) return "media";
  return "baja";
}

/** Suma de alertas activas o en revisión de un paciente. */
export function activeAlertCount(
  patientId: string,
  alerts: HealthAlert[],
): number {
  return alerts.filter(
    (a) =>
      a.patientId === patientId &&
      (a.status === "activa" || a.status === "en-revision"),
  ).length;
}

export function buildMasterRow(
  patient: PatientProfile,
  alerts: HealthAlert[],
): PatientMasterRow {
  const assignedCount = patient.results.length;
  const completedCount = patient.results.filter(
    (r) => r.state === "completado",
  ).length;
  const pendingCount = patient.results.filter(
    (r) => r.state === "pendiente" || r.state === "vencido",
  ).length;
  const inProgressCount = patient.results.filter(
    (r) => r.state === "en-progreso",
  ).length;
  const completedDates = patient.results
    .map((r) => r.completedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const lastEvaluation = completedDates.length
    ? completedDates[completedDates.length - 1]
    : null;

  return {
    patient,
    assignedCount,
    completedCount,
    pendingCount,
    inProgressCount,
    progressPercent:
      assignedCount === 0
        ? 0
        : Math.round((completedCount / assignedCount) * 100),
    risk: patientRisk(patient.results),
    alertCount: activeAlertCount(patient.id, alerts),
    lastEvaluation,
    overall: typifyPatient(patient),
  };
}

/** Cobertura: % de pacientes con el test completado (0-100). */
export function coveragePercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

/** Score promedio 0-100 de un conjunto de resultados evaluados. */
export function averageScore(results: PatientTestResult[]): number {
  const scores = results
    .map((r) => r.score)
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length);
}

/** Formatea un score como porcentaje entero con signo para comparaciones. */
export function formatDelta(a: number, b: number): string {
  const delta = a - b;
  return `${delta >= 0 ? "+" : ""}${delta}%`;
}
