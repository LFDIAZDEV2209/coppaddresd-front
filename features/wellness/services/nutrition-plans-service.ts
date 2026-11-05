import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  NutritionPlan,
  NutritionPlanListItem,
  NutritionPlanFilters,
  CreateNutritionPlanInput,
  UpdateNutritionPlanInput,
  PaginatedResult,
  PatientListItem,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/wellness/nutrition-plans`;
const PATIENTS_PATH = `${env.apiUrl}/api/v1/patients`;

// --- Nutrition Plans ---

export async function fetchNutritionPlans(
  page: number,
  pageSize: number,
  filters: NutritionPlanFilters,
  signal?: AbortSignal,
): Promise<PaginatedResult<NutritionPlanListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const search = filters.search.trim();
  if (search) params.set("search", search);

  if (filters.isTemplate === "template") params.set("isTemplate", "true");
  else if (filters.isTemplate === "custom") params.set("isTemplate", "false");

  if (filters.status !== "all") params.set("status", filters.status);

  return apiFetch<PaginatedResult<NutritionPlanListItem>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

export async function getNutritionPlan(id: string): Promise<NutritionPlan> {
  return apiFetch<NutritionPlan>(`${PATH}/${id}`);
}

export async function createNutritionPlan(
  input: CreateNutritionPlanInput,
): Promise<NutritionPlan> {
  return apiFetch<NutritionPlan>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNutritionPlan(
  id: string,
  input: UpdateNutritionPlanInput,
): Promise<NutritionPlan> {
  return apiFetch<NutritionPlan>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteNutritionPlan(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

export interface NutritionPlanReviewEvent {
  id: string;
  actorUserId: string | null;
  actorName?: string | null;
  occurredAt: string;
  action: string;
  revision: number;
  notes: string | null;
}

export async function fetchNutritionPlanHistory(id: string, signal?: AbortSignal): Promise<NutritionPlanReviewEvent[]> {
  return apiFetch<NutritionPlanReviewEvent[]>(`${PATH}/${id}/history`, { signal });
}

export async function approveNutritionPlans(plans: Array<{ id: string; revision: number }>, notes?: string): Promise<NutritionPlan[]> {
  return apiFetch<NutritionPlan[]>(`${PATH}/approve`, {
    method: "POST",
    body: JSON.stringify({ plans: plans.map(plan => ({ ...plan, notes: notes?.trim() || null })) }),
  });
}

export function canReviewNutritionPlan(plan: Pick<NutritionPlanListItem, "isTemplate" | "patientId" | "reviewStatus" | "generationStatus" | "revision">): boolean {
  return !plan.isTemplate && Boolean(plan.patientId) && plan.reviewStatus === "pending_review"
    && !["queued", "generating", "failed"].includes(plan.generationStatus ?? "") && Number(plan.revision) > 0;
}

export async function cloneNutritionPlan(
  sourcePlanId: string,
  patientId: string,
): Promise<NutritionPlan> {
  return apiFetch<NutritionPlan>(
    `${PATH}/${sourcePlanId}/clone?patientId=${patientId}`,
    { method: "POST" },
  );
}

// --- Patients (para el picker de asignaciones) ---

export async function fetchPatientsForPicker(
  page: number,
  pageSize: number,
  search: string,
  signal?: AbortSignal,
): Promise<PaginatedResult<PatientListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);

  return apiFetch<PaginatedResult<PatientListItem>>(
    `${PATIENTS_PATH}?${params.toString()}`,
    { signal },
  );
}

// --- Helper: generar días vacíos para un plan nuevo ---

export function generateEmptyDays(
  durationDays: number,
): Array<{
  dayNumber: number;
  mealType: "Desayuno" | "Almuerzo" | "Cena" | "Snack";
  description: null;
  foods: null;
  calories: null;
  notes: null;
  sortOrder: number;
  mediaId: null;
}> {
  const meals: Array<"Desayuno" | "Almuerzo" | "Cena" | "Snack"> = [
    "Desayuno",
    "Almuerzo",
    "Snack",
    "Cena",
  ];
  const days: Array<{
    dayNumber: number;
    mealType: "Desayuno" | "Almuerzo" | "Cena" | "Snack";
    description: null;
    foods: null;
    calories: null;
    notes: null;
    sortOrder: number;
    mediaId: null;
  }> = [];

  for (let d = 1; d <= durationDays; d++) {
    meals.forEach((meal, idx) => {
      days.push({
        dayNumber: d,
        mealType: meal,
        description: null,
        foods: null,
        calories: null,
        notes: null,
        sortOrder: idx,
        mediaId: null,
      });
    });
  }

  return days;
}

// --- Constantes para filtros ---

export const MEAL_TYPES: Array<"Desayuno" | "Almuerzo" | "Cena" | "Snack"> = [
  "Desayuno",
  "Almuerzo",
  "Snack",
  "Cena",
];

export const PLAN_STATUSES: Array<"Draft" | "Active" | "Completed" | "Archived"> = [
  "Draft",
  "Active",
  "Completed",
  "Archived",
];

export const PLAN_STATUS_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Active: "Activo",
  Completed: "Completado",
  Archived: "Archivado",
};

export const TEMPLATE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "template", label: "Templates" },
  { value: "custom", label: "Personalizados" },
] as const;
