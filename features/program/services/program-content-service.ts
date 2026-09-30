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

// --- Asignar contenido en bloque a un rango de semanas ---

export interface SetWeekContentRangeInput {
  fromWeek: number;
  toWeek: number;
  nutritionPlanId: string | null;
  exerciseRoutineId: string | null;
}

/** Aplica el mismo plan/rutina a un rango de semanas (PUT content/range). */
export async function setWeekContentRange(
  enrollmentId: string,
  input: SetWeekContentRangeInput,
): Promise<ProgramContentWeek[]> {
  return apiFetch<ProgramContentWeek[]>(`${PATH(enrollmentId)}/range`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// --- Asignación masiva de podcasts (change erp-program-content-admin) ---

export interface BulkAssignProgramContentInput {
  /** "Template" (plantilla del catálogo) o "Enrollment" (inscripción). */
  targetType: "Template" | "Enrollment";
  /** Id de la plantilla o de la inscripción según targetType. */
  targetId: string;
  /** Semana inicial del rango (1..83). */
  fromWeek: number;
  /** Semana final del rango (≥ fromWeek). */
  toWeek: number;
  /** Días objetivo ISO: 1 = lunes … 7 = domingo. */
  weekdays: number[];
  /** Medio (podcast) publicado a asignar. */
  mediaId: string;
  /** Forzar también sobre semanas congeladas (auditoría crítica). */
  forceFrozen: boolean;
}

/**
 * Resultado transparente de la propagación (REQ-PCA-04): desglose de
 * semanas afectadas vs congeladas omitidas, tal como lo devuelve el backend.
 */
export interface BulkAssignProgramContentResult {
  success: boolean;
  totalWeeksTargeted: number;
  updatedWeeks: number;
  frozenWeeksSkipped: number;
  affectedEnrollments: number;
  message: string;
}

/**
 * Asignación masiva de podcasts (POST /api/v1/program/content/bulk-assign):
 * aplica un medio publicado sobre un rango de semanas y días, contra una
 * plantilla o una inscripción. Las semanas congeladas (completadas o con
 * fecha de cierre ocurrida) no se mutan salvo forceFrozen=true.
 */
export async function bulkAssignProgramContent(
  input: BulkAssignProgramContentInput,
): Promise<BulkAssignProgramContentResult> {
  return apiFetch<BulkAssignProgramContentResult>(
    `${env.apiUrl}/api/v1/program/content/bulk-assign`,
    { method: "POST", body: JSON.stringify(input) },
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
    mediaId?: string | null;
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
