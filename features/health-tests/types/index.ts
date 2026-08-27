/**
 * Tipos de dominio del módulo de Tests de Salud (health-tests).
 *
 * Espejo conceptual de la Batería de evaluación inicial de la aplicación de
 * pacientes (antares-paciente/src/data/tests.ts). Esta capa NO conoce el
 * origen de los datos: hoy se alimenta con mock data, mañana con APIs reales
 * (el service es la única frontera que cambia).
 */

/** Categorías clínicas derivadas de los tests reales de la batería inicial. */
export type TestCategory =
  | "historia-clinica"
  | "nutricion"
  | "movimiento"
  | "sueno"
  | "adherencia"
  | "salud-mental"
  | "cardiometabolico";

export type TestState = "completado" | "en-progreso" | "pendiente" | "vencido";

/** Momento de aplicación del test dentro del programa. */
export type ApplicationMoment = "inicial" | "seguimiento" | "ambos";

export interface HealthTest {
  id: string;
  code: string;
  name: string;
  description: string;
  category: TestCategory;
  icon: string;
  /** Puntaje máximo de la escala propia del test (0-100 normalizado). */
  maxScore: number;
  /** Orden dentro de la batería de evaluación inicial (1-9). */
  order: number;
  required: boolean;
  state: "activo" | "inactivo";
  applicationMoment: ApplicationMoment;
  frequency: string;
  priority: "alta" | "media" | "baja";
  version: string;
  timeMinutes: number;
  questionsCount: number;
  sections: string[];
  /** Indicadores que alimenta este test. */
  indicators: string[];
  /** Reglas de alerta declarativas (mock; mañana el backend las aplica). */
  alertRules: AlertRule[];
}

export interface AlertRule {
  indicatorId: string;
  operator: "gte" | "lte";
  threshold: number;
  severity: AlertSeverity;
  message: string;
  recommendedAction: string;
}

export type RiskLevel =
  "bajo" | "moderado" | "alto" | "critico" | "sin-evaluar";

export type PatientTypification =
  | "evaluacion-completa"
  | "evaluacion-incompleta"
  | "bajo-riesgo"
  | "riesgo-moderado"
  | "alto-riesgo"
  | "seguimiento-prioritario"
  | "sin-informacion";

export type PatientStatus = "activo" | "inactivo";

export interface PatientTestResult {
  testId: string;
  state: TestState;
  /** Score normalizado 0-100 (null si el test no se ha completado). */
  score: number | null;
  /** Interpretación clínica del score según el test. */
  interpretation: string;
  risk: RiskLevel;
  /** Fecha de la última respuesta guardada (en progreso) o del completado. */
  updatedAt: string;
  /** Fecha de la última evaluación completada. */
  completedAt: string | null;
  /** Historial de evaluaciones (evolución). */
  history: TestEvaluation[];
  /** Datos particulares del test (subscores, flags, etc.). */
  details: Record<string, string | number | boolean>;
}

export interface TestEvaluation {
  completedAt: string;
  score: number;
  risk: RiskLevel;
}

export interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  gender: "Femenino" | "Masculino";
  age: number;
  clinic: string;
  professionalId: string;
  status: PatientStatus;
  insurance: string;
  /** Fecha de asignación de la batería de evaluación inicial. */
  assignedAt: string;
  phone: string;
  email: string;
  /** Estado de cada test de la batería. */
  results: PatientTestResult[];
}

export interface HealthProfessional {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  clinic: string;
  patientCount: number;
}

export type AlertSeverity =
  "critica" | "alta" | "media" | "baja" | "informativa";

export type AlertStatus = "activa" | "en-revision" | "atendida" | "cerrada";

export interface HealthAlert {
  id: string;
  patientId: string;
  testId: string;
  indicatorId: string;
  indicatorName: string;
  /** Valor del indicador que disparó la alerta. */
  resultValue: number;
  /** Umbral configurado en la regla del test. */
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  message: string;
  recommendedAction: string;
}

export interface ClinicalIndicator {
  id: string;
  name: string;
  category: TestCategory;
  icon: string;
  description: string;
  /** Dirección deseable: mayor score = mejor salud. */
  higherIsBetter: boolean;
  /** Rango de interpretación: (min, max, label, risk). */
  ranges: IndicatorRange[];
  unit: string;
}

export interface IndicatorRange {
  min: number;
  max: number;
  label: string;
  risk: RiskLevel;
}

export interface Battery {
  id: string;
  name: string;
  description: string;
  testIds: string[];
  requiredCount: number;
  optionalCount: number;
  state: "activa" | "inactiva" | "borrador";
  version: string;
  createdAt: string;
  assignedPatientCount: number;
}

/** Representación agregada de un indicador sobre la población. */
export interface IndicatorAggregate {
  indicator: ClinicalIndicator;
  /** Score promedio poblacional 0-100. */
  average: number;
  /** Distribución de niveles de riesgo (bajo/moderado/alto/crítico). */
  distribution: Record<RiskLevel, number>;
  /** Pacientes evaluados para este indicador. */
  evaluatedCount: number;
  /** Pacientes con resultado en el rango más desfavorable. */
  affectedCount: number;
  /** Serie de evolución del promedio (últimos períodos). */
  trend: { label: string; value: number }[];
}

/** Fila de la tabla maestra (derivada de PatientProfile + agregados). */
export interface PatientMasterRow {
  patient: PatientProfile;
  assignedCount: number;
  completedCount: number;
  pendingCount: number;
  inProgressCount: number;
  progressPercent: number;
  risk: RiskLevel;
  alertCount: number;
  lastEvaluation: string | null;
  overall: PatientTypification;
}

export interface PendingPatientRow {
  patient: PatientProfile;
  pendingTests: string[];
  pendingCount: number;
  lastTestDate: string | null;
  assignedAt: string;
  daysPending: number;
  professionalName: string;
  priority: "alta" | "media" | "baja";
  status: PatientStatus;
}

export interface DofaItem {
  id: string;
  quadrant: "fortalezas" | "oportunidades" | "debilidades" | "amenazas";
  title: string;
  description: string;
  value: number;
  metric: string;
  indicatorId?: string;
}

export interface CoverageByTest {
  test: HealthTest;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  /** % de pacientes con el test completado. */
  coverage: number;
  total: number;
}

export interface CoverageByCategory {
  category: TestCategory;
  categoryName: string;
  completed: number;
  total: number;
  coverage: number;
}

export interface CoverageTrendPoint {
  label: string;
  coverage: number;
  completed: number;
}
