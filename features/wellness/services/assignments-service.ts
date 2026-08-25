import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  RoutineAssignment,
  CreateRoutineAssignmentInput,
  UpdateRoutineAssignmentInput,
  NutritionPlanAssignment,
  CreateNutritionPlanAssignmentInput,
  UnifiedAssignment,
  PaginatedResult,
  ExerciseRoutineListItem,
  NutritionPlanListItem,
  PatientListItem,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/wellness/routine-assignments`;
const PLAN_ASSIGNMENTS_PATH = `${env.apiUrl}/api/v1/wellness/nutrition-plan-assignments`;
const ROUTINES_PATH = `${env.apiUrl}/api/v1/wellness/exercise-routines`;
const PLANS_PATH = `${env.apiUrl}/api/v1/wellness/nutrition-plans`;
const PATIENTS_PATH = `${env.apiUrl}/api/v1/patients`;

// --- Routine Assignments ---

export async function fetchRoutineAssignments(
  page: number,
  pageSize: number,
  filters: { search: string; status: string },
  signal?: AbortSignal,
): Promise<PaginatedResult<RoutineAssignment>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.status !== "all") params.set("status", filters.status);

  return apiFetch<PaginatedResult<RoutineAssignment>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

export async function getRoutineAssignment(id: string): Promise<RoutineAssignment> {
  return apiFetch<RoutineAssignment>(`${PATH}/${id}`);
}

export async function createRoutineAssignment(
  input: CreateRoutineAssignmentInput,
): Promise<RoutineAssignment> {
  return apiFetch<RoutineAssignment>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateRoutineAssignment(
  id: string,
  input: UpdateRoutineAssignmentInput,
): Promise<RoutineAssignment> {
  return apiFetch<RoutineAssignment>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteRoutineAssignment(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

export async function fetchAssignmentsByPatient(
  patientId: string,
): Promise<RoutineAssignment[]> {
  return apiFetch<RoutineAssignment[]>(
    `${env.apiUrl}/api/v1/wellness/patients/${patientId}/routine-assignments`,
  );
}

// --- Pickers ---

export async function fetchRoutinesForPicker(
  page: number,
  pageSize: number,
  search: string,
  signal?: AbortSignal,
): Promise<PaginatedResult<ExerciseRoutineListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  params.set("status", "Active");

  return apiFetch<PaginatedResult<ExerciseRoutineListItem>>(
    `${ROUTINES_PATH}?${params.toString()}`,
    { signal },
  );
}

export async function fetchNutritionPlansForPicker(
  page: number,
  pageSize: number,
  search: string,
  signal?: AbortSignal,
): Promise<PaginatedResult<NutritionPlanListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  params.set("isTemplate", "true");
  params.set("status", "Active");

  return apiFetch<PaginatedResult<NutritionPlanListItem>>(
    `${PLANS_PATH}?${params.toString()}`,
    { signal },
  );
}

// --- Nutrition Plan Assignments ---

export async function fetchNutritionPlanAssignments(
  page: number,
  pageSize: number,
  filters: { status: string },
  signal?: AbortSignal,
): Promise<PaginatedResult<NutritionPlanAssignment>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.status !== "all") params.set("status", filters.status);

  return apiFetch<PaginatedResult<NutritionPlanAssignment>>(
    `${PLAN_ASSIGNMENTS_PATH}?${params.toString()}`,
    { signal },
  );
}

export async function createNutritionPlanAssignment(
  input: CreateNutritionPlanAssignmentInput,
): Promise<NutritionPlanAssignment> {
  return apiFetch<NutritionPlanAssignment>(PLAN_ASSIGNMENTS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteNutritionPlanAssignment(id: string): Promise<void> {
  await apiFetch<void>(`${PLAN_ASSIGNMENTS_PATH}/${id}`, { method: "DELETE" });
}

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

// --- Constantes ---

export const FREQUENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Diaria", label: "Diaria" },
  { value: "TresVecesSemana", label: "3 veces por semana" },
  { value: "Personalizada", label: "Personalizada" },
];

export const ASSIGNMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Active", label: "Activa" },
  { value: "Paused", label: "Pausada" },
  { value: "Completed", label: "Completada" },
];

export const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Paused: "bg-yellow-100 text-yellow-800",
  Completed: "bg-blue-100 text-blue-800",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  Diaria: "Diaria",
  TresVecesSemana: "3x/semana",
  Personalizada: "Personalizada",
};

// --- Unified fetch ---

export async function fetchAllAssignments(
  signal?: AbortSignal,
): Promise<UnifiedAssignment[]> {
  const [routines, plans] = await Promise.all([
    fetchRoutineAssignments(1, 100, { search: "", status: "all" }, signal),
    fetchNutritionPlanAssignments(1, 100, { status: "all" }, signal),
  ]);

  const routineItems: UnifiedAssignment[] = routines.data.map((r) => ({
    id: r.id,
    type: "routine" as const,
    itemId: r.routineId,
    patientId: r.patientId,
    patientName: r.patientName,
    itemName: r.routineName,
    startDate: r.startDate,
    endDate: r.endDate,
    frequency: r.frequency,
    status: r.status,
    notes: r.notes,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  }));

  const planItems: UnifiedAssignment[] = plans.data.map((p) => ({
    id: p.id,
    type: "nutrition" as const,
    itemId: p.planId,
    patientId: p.patientId,
    patientName: p.patientName,
    itemName: p.planName,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    notes: p.notes,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
  }));

  return [...routineItems, ...planItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function deleteUnifiedAssignment(
  id: string,
  type: "routine" | "nutrition",
): Promise<void> {
  if (type === "routine") {
    await deleteRoutineAssignment(id);
  } else {
    await deleteNutritionPlanAssignment(id);
  }
}
