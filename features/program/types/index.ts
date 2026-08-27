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
}

/** Filtros del listado de inscripciones. */
export interface ProgramEnrollmentFilters {
  status: "all" | EnrollmentStatus;
  patientId: string;
}

/** Payload para inscribir un paciente (clínico). */
export interface EnrollPatientInput {
  patientId: string;
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

// --- Clinical Review Types ---

/** Revisión clínica de XP pendiente. */
export interface ClinicalReview {
  id: string;
  patientId: string;
  metricId: string;
  metricCode: string;
  metricName: string;
  deltaPct: number | null;
  ruleCode: string;
  status: string;
  healthScorePeriodStart: string;
  healthScorePeriodEnd: string;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
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
