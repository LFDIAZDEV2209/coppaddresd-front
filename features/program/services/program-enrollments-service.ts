import { apiFetch, getAccessToken } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ProgramEnrollment,
  ProgramEnrollmentFilters,
  EnrollPatientInput,
  BulkEnrollInput,
  BulkEnrollResult,
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

// --- Inscripción masiva (B13) ---

export async function bulkEnrollPatients(
  input: BulkEnrollInput,
): Promise<BulkEnrollResult> {
  return apiFetch<BulkEnrollResult>(`${PATH}/bulk`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Exporte CSV (B14) ---

export interface ExportEnrollmentsFilters {
  clinicId?: string;
  /** Fecha ISO (inclusive). */
  from?: string;
  /** Fecha ISO (inclusive). */
  to?: string;
}

/**
 * Descarga el exporte CSV de inscripciones (GET /enrollments/export, stream
 * text/csv) como archivo. Usa fetch directo con Bearer porque la respuesta no
 * es JSON (apiFetch lo asumiría).
 */
export async function exportEnrollmentsCsv(
  filters: ExportEnrollmentsFilters,
): Promise<void> {
  const params = new URLSearchParams();
  if (filters.clinicId) params.set("clinicId", filters.clinicId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const response = await fetch(`${PATH}/export?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ""}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `No pudimos exportar las inscripciones (HTTP ${response.status}).`,
    );
  }

  const blob = await response.blob();
  const disposition =
    response.headers.get("Content-Disposition") ?? "attachment";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = match?.[1] ?? "program-enrollments.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
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
