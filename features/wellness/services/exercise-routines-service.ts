import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ExerciseRoutine,
  ExerciseRoutineListItem,
  ExerciseRoutineFilters,
  CreateExerciseRoutineInput,
  UpdateExerciseRoutineInput,
  PaginatedResult,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/wellness/exercise-routines`;

export async function fetchExerciseRoutines(
  page: number,
  pageSize: number,
  filters: ExerciseRoutineFilters,
  signal?: AbortSignal,
): Promise<PaginatedResult<ExerciseRoutineListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", filters.category);

  return apiFetch<PaginatedResult<ExerciseRoutineListItem>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

export async function getExerciseRoutine(id: string): Promise<ExerciseRoutine> {
  return apiFetch<ExerciseRoutine>(`${PATH}/${id}`);
}

export async function createExerciseRoutine(
  input: CreateExerciseRoutineInput,
): Promise<ExerciseRoutine> {
  return apiFetch<ExerciseRoutine>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateExerciseRoutine(
  id: string,
  input: UpdateExerciseRoutineInput,
): Promise<ExerciseRoutine> {
  return apiFetch<ExerciseRoutine>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteExerciseRoutine(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

// --- Constantes ---

export const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Facil", label: "Fácil" },
  { value: "Moderado", label: "Moderado" },
  { value: "Dificil", label: "Difícil" },
];

export const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Fuerza", label: "Fuerza" },
  { value: "Cardio", label: "Cardio" },
  { value: "Flexibilidad", label: "Flexibilidad" },
  { value: "Mixta", label: "Mixta" },
];

export const DIFFICULTY_COLORS: Record<string, string> = {
  Facil: "bg-green-100 text-green-800",
  Moderado: "bg-yellow-100 text-yellow-800",
  Dificil: "bg-red-100 text-red-800",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Fuerza: "bg-blue-100 text-blue-800",
  Cardio: "bg-orange-100 text-orange-800",
  Flexibilidad: "bg-purple-100 text-purple-800",
  Mixta: "bg-gray-100 text-gray-800",
};
