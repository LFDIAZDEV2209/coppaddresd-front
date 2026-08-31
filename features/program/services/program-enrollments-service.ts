import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ProgramEnrollment,
  ProgramEnrollmentFilters,
  EnrollPatientInput,
  PaginatedResult,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/program/enrollments`;

// --- Listado paginado ---

export async function fetchProgramEnrollments(
  page: number,
  pageSize: number,
  filters: ProgramEnrollmentFilters,
  signal?: AbortSignal,
): Promise<PaginatedResult<ProgramEnrollment>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.patientId.trim()) params.set("patientId", filters.patientId.trim());
  if (filters.search?.trim()) params.set("search", filters.search.trim());

  return apiFetch<PaginatedResult<ProgramEnrollment>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

// --- Inscribir (clínico) ---

export async function enrollPatient(
  input: EnrollPatientInput,
): Promise<ProgramEnrollment> {
  return apiFetch<ProgramEnrollment>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Pausar / Reanudar / Retirar ---

export async function pauseEnrollment(
  id: string,
  reason?: string,
): Promise<ProgramEnrollment> {
  return apiFetch<ProgramEnrollment>(`${PATH}/${id}/pause`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export async function resumeEnrollment(
  id: string,
): Promise<ProgramEnrollment> {
  return apiFetch<ProgramEnrollment>(`${PATH}/${id}/resume`, {
    method: "POST",
  });
}

export async function withdrawEnrollment(
  id: string,
  reason?: string,
): Promise<ProgramEnrollment> {
  return apiFetch<ProgramEnrollment>(`${PATH}/${id}/withdraw`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

// --- Constantes ---

export const ENROLLMENT_STATUSES: Array<
  "Active" | "Paused" | "Completed" | "Withdrawn"
> = ["Active", "Paused", "Completed", "Withdrawn"];

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  Active: "Activo",
  Paused: "Pausado",
  Completed: "Completado",
  Withdrawn: "Retirado",
};

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Active", label: "Activo" },
  { value: "Paused", label: "Pausado" },
  { value: "Completed", label: "Completado" },
  { value: "Withdrawn", label: "Retirado" },
] as const;
