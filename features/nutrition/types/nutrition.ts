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
  role: "C" | "P" | "F" | "V";
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
