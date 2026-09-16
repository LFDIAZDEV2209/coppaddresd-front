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
  /** Id de la versión activa del instrumento (para crear items de batería). */
  versionId?: string | null;
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

/** Filtro geográfico del dashboard: estados seleccionados (unión). */
export interface HealthGeoFilter {
  /** Códigos de estado seleccionados (ej: ["NY", "FL"]); vacío = todos. */
  stateCodes: string[];
}

export interface PatientTestResult {
  testId: string;
  /** Código del instrumento (ej: "orp") para resolver el nombre desde el catálogo. */
  testCode?: string | null;
  state: TestState;
  /** Score normalizado 0-100 (null si el test no se ha completado). */
  score: number | null;
  /** Porcentaje del score respecto al máximo del instrumento (0-100). */
  scorePercentage?: number | null;
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
  /** Nombre del profesional asignado (resuelto por el backend). */
  professionalName: string;
  status: PatientStatus;
  insurance: string;
  /** Fecha de asignación de la batería de evaluación inicial. */
  assignedAt: string;
  phone: string;
  email: string;
  /** Estado de cada test de la batería. */
  results: PatientTestResult[];
}

/** Evaluación del historial del paciente (fila del hub). */
export interface PatientEvaluation {
  id: string;
  versionId: string;
  testName: string;
  testCode: string;
  testCategory: string;
  status: "started" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  scorePercentage: number | null;
  /** Número de intento (1..n) entre evaluaciones del mismo test. */
  attempt: number;
}

/** Resultado persistido de una evaluación (score/subescala/indicador). */
export interface EvaluationResultItem {
  id: string;
  resultType: "score" | "subscale" | "indicator";
  code: string;
  label: string;
  value: number;
  qualifier: string | null;
  severity: string | null;
}

/** Respuesta registrada de una evaluación con contexto de la pregunta. */
export interface EvaluationResponseItem {
  questionId: string;
  questionCode: string;
  section: string | null;
  questionText: string;
  questionType: "scale" | "single" | "multi" | "open" | "num";
  answerOptionId: string | null;
  answerOptionText: string | null;
  answerOptionScore: number | null;
  valueText: string | null;
}

export interface EvaluationCommentItem {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

/** Intento del mismo test (comparativa histórica). */
export interface EvaluationAttemptItem {
  id: string;
  status: "started" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  scorePercentage: number | null;
}

/** Detalle completo de una evaluación (ruta /evaluaciones/[evalId]). */
export interface EvaluationDetail {
  id: string;
  assignmentId: string;
  patientId: string;
  versionId: string;
  versionNumber: number;
  versionName: string | null;
  scoringStrategy: string;
  testName: string;
  testCode: string;
  testCategory: string;
  status: "started" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  attempt: number;
  score: number | null;
  scorePercentage: number | null;
  results: EvaluationResultItem[];
  responses: EvaluationResponseItem[];
  comments: EvaluationCommentItem[];
  attempts: EvaluationAttemptItem[];
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
  /** Código de negocio (único) devuelto por el backend. */
  code?: string;
  name: string;
  description: string;
  testIds: string[];
  /** Items con orden, obligatoriedad y frecuencia (detalle de la batería). */
  items?: BatteryItem[];
  requiredCount: number;
  optionalCount: number;
  /** Al crear un paciente se le asigna automáticamente esta batería. */
  autoAssignOnPatientCreate?: boolean;
  state: "activa" | "inactiva" | "borrador";
  /** Etiqueta de versión/código que se muestra en la tarjeta. */
  version: string;
  createdAt: string;
  assignedPatientCount: number;
}

/** Item de una batería: un instrumento con su configuración de aplicación. */
export interface BatteryItem {
  id: string;
  instrumentId: string;
  instrumentName: string | null;
  versionId: string | null;
  sortOrder: number;
  required: boolean;
  /** Frecuencia de reaplicación en días (null = única vez). */
  frequencyDays: number | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Notificaciones de alertas (SPEC A13)
// ─────────────────────────────────────────────────────────────────────────────

/** Canal de entrega de una notificación. */
export type NotificationChannel = "community" | "sms";

/** Estado de entrega de una notificación. */
export type NotificationStatus = "queued" | "sent" | "failed" | "skipped";

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  severity: AlertSeverity | null;
  testCategory: string | null;
  indicatorCode: string | null;
  subject: string | null;
  /** Cuerpo con placeholders: {paciente}, {test}, {indicador}, {valor}... */
  bodyTemplate: string;
  isActive: boolean;
  usageCount: number;
  versionCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface NotificationTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  name: string;
  channel: NotificationChannel;
  severity: AlertSeverity | null;
  testCategory: string | null;
  indicatorCode: string | null;
  subject: string | null;
  bodyTemplate: string;
  note: string | null;
  createdAt: string;
}

export interface HealthNotification {
  id: string;
  alertId: string | null;
  patientId: string | null;
  patientName: string | null;
  channel: NotificationChannel;
  templateId: string | null;
  templateName: string | null;
  recipient: string;
  renderedBody: string;
  status: NotificationStatus;
  provider: string;
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface NotifyAlertItemResult {
  alertId: string | null;
  patientId: string | null;
  patientName: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  reason: string | null;
  renderedBody: string;
  recipient: string;
}

export interface NotifyAlertsResult {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  preview: boolean;
  items: NotifyAlertItemResult[];
}

export interface NotificationChartPoint {
  label: string;
  value: number;
}

export interface NotificationCharts {
  alertsBySeverity: Record<string, number>;
  alertsByStatus: Record<string, number>;
  alertsByIndicator: Record<string, number>;
  alertsByDay: NotificationChartPoint[];
  notificationsByChannel: Record<string, number>;
  notificationsByStatus: Record<string, number>;
  notificationsByDay: NotificationChartPoint[];
}

export interface NotificationTemplateInput {
  name: string;
  channel: NotificationChannel;
  bodyTemplate: string;
  severity?: AlertSeverity | null;
  testCategory?: string | null;
  indicatorCode?: string | null;
  subject?: string | null;
  isActive?: boolean;
  note?: string | null;
}

export interface CreateNotificationTemplateInput extends NotificationTemplateInput {
  code: string;
}

export interface NotifyAlertsInput {
  alertIds: string[];
  channels: NotificationChannel[];
  templateId?: string | null;
  bodyOverride?: string | null;
  preview?: boolean;
}

export interface NotifyAlertsFilters {
  alertId?: string;
  patientId?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
