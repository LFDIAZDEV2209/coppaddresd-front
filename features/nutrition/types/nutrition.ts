/** Contrato de lectura de ciclos profesionales; no reutiliza NutritionPlan legacy. */
export type NutritionPlanState = "borrador_ia" | "en_aprobacion" | "aprobado" | "devuelto";
/** por_renovar es un estado virtual del listado, no una transición persistida. */
export type NutritionQueueState = NutritionPlanState | "por_renovar" | "sin_plan";
export type NutritionFilter = NutritionQueueState | "all";

export interface NutritionTargets {
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
  waterGlasses: number;
}

export interface NutritionFood {
  id: string;
  name: string;
  group: string;
  role?: "C" | "P" | "F" | "V";
  per100g: Omit<NutritionTargets, "waterGlasses">;
  householdEquivalent: string;
}

export interface NutritionMealItem {
  id: string;
  foodId: string;
  grams: number;
  notes: string | null;
}

export interface NutritionMeal {
  id: string;
  dayNumber: number;
  mealType: "desayuno" | "almuerzo" | "merienda" | "cena";
  localTime: string;
  menuName?: string | null;
  notes?: string | null;
  waterGlasses: number;
  items: NutritionMealItem[];
  totals: Omit<NutritionTargets, "waterGlasses">;
}

export interface NutritionAlert {
  code: string;
  severity: "critical" | "warning" | "informational" | "technical";
  message: string;
}

export interface NutritionCycle {
  id: string;
  patientId: string;
  version: number;
  state: NutritionPlanState;
  publishedVersionId: string | null;
  provisional: boolean;
  provisionalReason: string | null;
  menusOutdated: boolean;
  startDate: string | null;
  endDate: string | null;
  patientTimeZone: string;
  targets: NutritionTargets;
  instructions: string;
  meals: NutritionMeal[];
  alerts: NutritionAlert[];
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  /** Contexto numérico del motor conservado al editar metas; nunca se inventa. */
  engineContext?: NutritionEngineContext;
  canRegenerate?: boolean;
}

export interface NutritionEngineContext {
  bmr: number; tdee: number; deficit: number; floor: number; phase: string;
  targetWeightKg: number; remainingKg: number; weeklyKg: number; weeks: number;
}

/** Proyección incluida en el listado: ninguna tarjeta consulta el detalle. */
export interface NutritionPatientSummary {
  patientId: string;
  patientName: string;
  patientDocument: string | null;
  plan: {
    id: string;
    state: NutritionPlanState;
    queueState: Exclude<NutritionQueueState, "sin_plan">;
    version: number;
    dailyKcal: number | null;
    criticalAlertCount: number;
    aiAssisted: boolean;
    provisional: boolean;
    endDate: string | null;
  } | null;
}

export interface NutritionQueueQuery {
  search: string;
  state: NutritionFilter;
  page: number;
  pageSize: number;
}

export interface NutritionQueueResponse {
  items: NutritionPatientSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Contadores sobre la búsqueda, antes de aplicar estado y paginación. */
  counts: Record<NutritionFilter, number>;
}

export interface NutritionPendingCount { count: number }

export interface NutritionScope { userId: string; clinicId: string | null }
export interface NutritionActor { id: string; name: string }

export interface NutritionClinicalProfile {
  age: number | null;
  sex: "female" | "male" | null;
  bmi: number | null;
  hba1c: number | null;
  movement: string | null;
  adherence: string | null;
  cardiometabolicRisk: string | null;
  completedTests: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  birthDate?: string | null;
  provisionalFields: string[];
  programPatientId: string | null;
}

export interface NutritionAuditEntry {
  id: string;
  action: "created" | "saved" | "submitted" | "approved" | "returned" | "version_created" | "regenerated" | "publication_replaced";
  actorId: string;
  actorName: string;
  occurredAt: string;
  version: number;
  comment: string | null;
  criticalAlertsConfirmed: number;
  autoApproved: boolean;
}

export interface NutritionPatientDetail {
  patientId: string;
  patientName: string;
  patientDocument: string | null;
  nextPendingPatientId: string | null;
  profile: NutritionClinicalProfile;
  cycle: NutritionCycle | null;
  /** Instantánea inmutable: editar el borrador no altera lo publicado. */
  publishedCycle: NutritionCycle | null;
  revision: number;
  audit: NutritionAuditEntry[];
  auditIssue?: NutritionServiceIssue | null;
}

export interface NutritionWorkspace {
  patient: NutritionPatientDetail | null;
  catalog: NutritionFood[];
}

export type NutritionAction = "submit" | "approve" | "return" | "new-version" | "create" | "regenerate";
export interface NutritionGenerateInput {
  birthDate?: string;
  manual?: { peso: number; talla: number; edad: number; sexo: "F" | "M"; imc?: number };
  preserveConfirmedEdits?: boolean;
}
export interface NutritionActionOptions {
  comment?: string;
  criticalConfirmed?: boolean;
  generate?: NutritionGenerateInput;
}
export interface NutritionServiceIssue {
  kind: "endpoint" | "contract" | "conflict" | "request";
  endpoint: string;
  status: number;
}
