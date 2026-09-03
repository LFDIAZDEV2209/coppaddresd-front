// --- Program Template Types ---

export type TemplateStatus = "Draft" | "Active" | "Archived";

/** Fila por día de la semana de una plantilla. */
export interface WeeklyDayTask {
  id: string;
  weekday: number;
  taskCode: string;
  points: number;
  sortOrder: number;
  mediaId: string | null;
  createdAt: string;
}

/** Plantilla de programa (respuesta de GET /templates/{id}). */
export interface ProgramTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  status: TemplateStatus;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  days: WeeklyDayTask[];
}

/** Ítem del listado de plantillas (sin días). */
export interface ProgramTemplateListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  status: TemplateStatus;
  version: number;
  createdAt: string;
  publishedAt: string | null;
}

/** Payload para crear plantilla. */
export interface CreateTemplateInput {
  code: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  days: WeeklyDayTaskInput[];
}

/** Payload para actualizar plantilla. */
export interface UpdateTemplateInput {
  code: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  days: WeeklyDayTaskInput[];
}

/** Payload para una fila del horario semanal. */
export interface WeeklyDayTaskInput {
  weekday: number;
  taskCode: string;
  points: number;
  sortOrder: number;
  mediaId: string | null;
}

/** Filtros del listado de plantillas. */
export interface ProgramTemplateFilters {
  search: string;
  status: "all" | TemplateStatus;
}

// --- Program Enrollment Types ---

export type EnrollmentStatus =
  | "Active"
  | "Paused"
  | "Completed"
  | "Withdrawn";

/** Inscripción de un paciente al programa. */
export interface ProgramEnrollment {
  id: string;
  patientId: string;
  templateId: string;
  timezone: string;
  status: EnrollmentStatus;
  startedAt: string;
  startLocalDate: string;
  currentWeekNumber: number;
  totalWeeks: number;
  xpBalance: number;
  streakCurrent: number;
  streakLongest: number;
  freezesRemaining: number;
  completedAt: string | null;
  pausedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  patientFullName?: string;
  patientDocumentNumber?: string;
  templateName?: string;
  /** Backend snake_case patient name (when available). */
  patient_name?: string | null;
  /** camelCase alias for patient name (when backend uses camelCase). */
  patientName?: string | null;
  currentLevel?: string; // derivado del XP en el backend
}

/** Filtros del listado de inscripciones. */
export interface ProgramEnrollmentFilters {
  status: "all" | EnrollmentStatus;
  patientId: string;
  search?: string;
}

/** Payload para inscribir un paciente (clínico). */
export interface EnrollPatientInput {
  patientId: string;
  templateId: string;
  timezone: string;
  startLocalDate?: string;
}

/** Resultado por fila de la inscripción masiva (B13). */
export interface BulkEnrollRowResult {
  patientId: string;
  enrollmentId: string | null;
  error: string | null;
}

/** Resultado agregado de la inscripción masiva (B13). */
export interface BulkEnrollResult {
  results: BulkEnrollRowResult[];
  created: number;
  failed: number;
}

/** Payload para inscribir masivamente pacientes (B13). */
export interface BulkEnrollInput {
  patientIds: string[];
  templateId: string;
  timezone: string;
  startLocalDate?: string;
}

// --- XP Rule Types ---

/** Regla del catálogo de XP. */
export interface XpRule {
  id: string;
  code: string;
  name: string;
  category: string;
  baseXp: number | null;
  multiplier: number;
  maxPerDay: number | null;
  maxPerWeek: number | null;
  requiresValidation: boolean;
  active: boolean;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** Payload para actualizar una regla XP. */
export interface UpdateXpRuleInput {
  baseXp: number | null;
  multiplier: number;
  maxPerDay: number | null;
  maxPerWeek: number | null;
  requiresValidation: boolean;
  active: boolean;
  validUntil: string | null;
}

// --- Activity Log Types ---

/** Entrada de la bitácora de actividad del módulo (auditoría trigger-based). */
export interface ActivityLogEntry {
  id: string;
  occurredAt: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  tableName: string;
  recordId: string;
  actorType: string;
  actorEmail: string | null;
  actorRole: string | null;
}

// --- Program Content Types ---

/** Referencia a un plan nutricional o rutina de ejercicio. */
export interface ProgramContentItemRef {
  id: string;
  code: string;
  name: string;
}

/** Contenido semanal de una inscripción al programa. */
export interface ProgramContentWeek {
  weekNumber: number;
  weekStartDateLocal: string;
  weekEndDateLocal: string;
  nutritionPlan: ProgramContentItemRef | null;
  exerciseRoutine: ProgramContentItemRef | null;
}

/** Respuesta de GET /api/v1/program/enrollments/{id}/content. */
export interface ProgramContentResponse {
  enrollmentId: string;
  patientId: string;
  templateId: string;
  totalWeeks: number;
  startLocalDate: string;
  weeks: ProgramContentWeek[];
}

/** Payload para PUT /api/v1/program/enrollments/{id}/content/week/{weekNumber}. */
export interface SetWeekContentInput {
  nutritionPlanId: string | null;
  exerciseRoutineId: string | null;
}

// --- Enrollment Week (patient completion status) ---

/** Tarea individual de una semana de inscripción con estado real del paciente. */
export interface EnrollmentWeekTask {
  taskCode: string;
  taskLabel: string;
  points: number;
  scheduledPoints: number;
  status: "completed" | "pending";
  completedAt: string | null;
  contentRefId?: string | null;
  contentName?: string | null;
  detailText?: string | null;
  routineId?: string | null;
  nutritionPlanId?: string | null;
}

/** Día de una semana de inscripción con totales reales vs programados. */
export interface EnrollmentWeekDay {
  localDate: string;
  weekday: number;
  dayLabel: string;
  isPerfectDay: boolean;
  totalPoints: number;
  maxPoints: number;
  bonusAwarded: number;
  tasks: EnrollmentWeekTask[];
}

/** Respuesta de GET /api/v1/program/enrollments/{id}/week/{weekNumber}. */
export interface EnrollmentWeekResponse {
  weekNumber: number;
  weekStartDateLocal: string;
  weekEndDateLocal: string;
  nutritionPlan: { id: string; name: string } | null;
  exerciseRoutine: { id: string; name: string } | null;
  days: EnrollmentWeekDay[];
}

// --- Pagination ---

/** Resultado paginado genérico. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Program Snapshot (espejo de ProgramSnapshotDto del backend) ---

/** Snapshot de gamificación de una inscripción (GET /enrollments/{id}/snapshot). */
export interface ProgramSnapshot {
  enrollmentId: string;
  template: {
    id: string;
    code: string;
    name: string;
    totalWeeks: number;
    currentWeekNumber: number;
    currentWeekStatus: string;
    currentWeekStartDateLocal: string;
    currentWeekEndDateLocal: string;
    streakMinTasks: number;
    essentialTaskCodes: string[];
  };
  todayLocalDate: string;
  todayPoints: number;
  todayPointsMax: number;
  todayBonusAvailable: boolean;
  xp: {
    balance: number;
    level: string;
    nextLevelAt: number;
  };
  streak: {
    current: number;
    longest: number;
    freezesRemaining: number;
    multiplierActive: number;
    multiplierEndsAt: string | null;
    multiplierRemainingHours: number;
  };
  nextMilestoneDays: number;
  streakChests: Array<{
    days: number;
    xp: number;
    granted: boolean;
    grantedAt: string | null;
  }> | null;
}

// --- XP Ledger (UC-B2) ---

/** Entrada del libro mayor de XP (append-only). */
export interface XpLedgerEntry {
  id: string;
  enrollmentId: string;
  amount: number;
  reason: string;
  sourceRefType: string | null;
  sourceRefId: string | null;
  ruleCode: string | null;
  balanceAfter: number;
  awardedAt: string;
  grantedBy: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  multiplierUsed: number | null;
}

/** Respuesta paginada de GET /enrollments/{id}/xp-ledger. */
export interface PaginatedXpLedger {
  data: XpLedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Clinical Baseline (UC-D2) ---

/** Línea base clínica de un paciente. */
export interface ClinicalBaseline {
  id: string;
  patientId: string;
  metricId: string;
  metricCode: string;
  value: number;
  unitId: string;
  unitSymbol: string;
  favorableDirection: "Higher" | "Lower";
  targetValue: number | null;
  measuredAt: string;
  setBy: string;
  createdAt: string;
}

/** Payload para crear una línea base clínica. */
export interface CreateBaselineInput {
  patientId: string;
  metricId: string;
  value: number;
  unitId: string;
  favorableDirection: "Higher" | "Lower";
  measuredAt: string;
  targetValue?: number | null;
}

/** Catálogo de métricas clínicas (para selectores de línea base). */
export interface ClinicalMetric {
  id: string;
  code: string;
  name: string;
  defaultUnitId: string;
  defaultUnitSymbol: string;
}
