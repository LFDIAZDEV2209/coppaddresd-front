import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ProgramContentResponse,
  ProgramContentWeek,
  SetWeekContentInput,
  EnrollmentWeekResponse,
} from "../types";

const PATH = (enrollmentId: string) =>
  `${env.apiUrl}/api/v1/program/enrollments/${enrollmentId}/content`;

// --- Obtener contenido del programa ---

export async function fetchProgramContent(
  enrollmentId: string,
  signal?: AbortSignal,
): Promise<ProgramContentResponse> {
  return apiFetch<ProgramContentResponse>(PATH(enrollmentId), { signal });
}

// --- Asignar contenido de una semana ---

export async function setWeekContent(
  enrollmentId: string,
  weekNumber: number,
  input: SetWeekContentInput,
): Promise<ProgramContentWeek> {
  return apiFetch<ProgramContentWeek>(
    `${PATH(enrollmentId)}/week/${weekNumber}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

// --- Obtener semana con estado de completitud del paciente ---

export async function fetchEnrollmentWeek(
  enrollmentId: string,
  weekNumber: number,
  signal?: AbortSignal,
): Promise<EnrollmentWeekResponse> {
  return apiFetch<EnrollmentWeekResponse>(
    `${env.apiUrl}/api/v1/program/enrollments/${enrollmentId}/week/${weekNumber}`,
    { signal },
  );
}

// --- Reemplazar tareas/snapshot de una semana ---

export async function replaceEnrollmentWeekTasks(
  enrollmentId: string,
  weekNumber: number,
  tasks: Array<{
    weekday: number;
    taskCode: string;
    points: number;
    sortOrder: number;
    routineId?: string | null;
    nutritionPlanId?: string | null;
  }>,
): Promise<EnrollmentWeekResponse> {
  return apiFetch<EnrollmentWeekResponse>(
    `${env.apiUrl}/api/v1/program/enrollments/${enrollmentId}/week/${weekNumber}/tasks`,
    {
      method: "PUT",
      body: JSON.stringify(tasks),
    },
  );
}

