import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ClinicalBoardFilters,
  ClinicalBoardItem,
  ClinicalMeasurementDto,
  Insurer,
  Patient,
  PatientDashboard,
  PatientFilters,
  PatientInput,
  PatientListItem,
  PatientProfessionalAssignment,
  PatientSortKey,
  PatientSortDir,
  PatientStats,
  PaginatedResult,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/patients`;

/**
 * Agregados del dashboard general (demografía, crecimiento, top de
 * profesionales y geografía). `stateCode` acota demografía/crecimiento/top;
 * el mapa viaja completo. Todo scoped por el backend.
 */
export async function fetchPatientDashboard(
  stateCode: string | null,
  months: 6 | 12,
  signal?: AbortSignal,
): Promise<PatientDashboard> {
  const params = new URLSearchParams({ months: String(months) });
  if (stateCode) params.set("state", stateCode);
  return apiFetch<PatientDashboard>(`${PATH}/dashboard?${params.toString()}`, {
    signal,
  });
}

/** Página del tablero clínico con búsqueda y filtros server-side. */
export async function fetchClinicalBoard(
  page: number,
  pageSize: number,
  filters: ClinicalBoardFilters,
  signal?: AbortSignal,
): Promise<PaginatedResult<ClinicalBoardItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.risk !== "all") params.set("risk", filters.risk);
  if (filters.alerts === "with") params.set("hasAlerts", "true");
  if (filters.followUp !== "all") params.set("followUp", filters.followUp);

  return apiFetch<PaginatedResult<ClinicalBoardItem>>(
    `${PATH}/clinical-board?${params.toString()}`,
    { signal },
  );
}

/**
 * Cambia solo el estado operativo del paciente (Activo↔Inactivo). Endpoint
 * dedicado: nunca envía el agregado completo (no borra datos clínicos).
 */
export async function updatePatientStatus(
  id: string,
  status: "Activo" | "Inactivo",
): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(`${PATH}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchPatients(
  page: number,
  pageSize: number,
  filters: PatientFilters & {
    sortBy?: PatientSortKey | null;
    sortDir?: PatientSortDir | null;
  },
  stateCode?: string | null,
  signal?: AbortSignal,
): Promise<PaginatedResult<PatientListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.insurerId !== "all") params.set("insurerId", filters.insurerId);
  if (stateCode) params.set("state", stateCode);
  if (filters.sortBy && filters.sortBy !== "createdAt")
    params.set("sortBy", filters.sortBy);
  if (filters.sortDir && filters.sortDir !== "desc")
    params.set("sortDir", filters.sortDir);

  return apiFetch<PaginatedResult<PatientListItem>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
}

/** Estadísticas del directorio, scoped por el backend (admin global / propios). */
export async function fetchPatientStats(
  signal?: AbortSignal,
): Promise<PatientStats> {
  return apiFetch<PatientStats>(`${PATH}/stats`, { signal });
}

export async function getPatient(id: string): Promise<Patient> {
  return apiFetch<Patient>(`${PATH}/${id}`);
}

export async function createPatient(input: PatientInput): Promise<Patient> {
  return apiFetch<Patient>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePatient(
  id: string,
  input: PatientInput,
): Promise<Patient> {
  return apiFetch<Patient>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deletePatient(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

/**
 * Mediciones clínicas del paciente (fuente: app móvil), planas y ordenadas por
 * `observedAt` desc. El agrupamiento por batch (check-in) es responsabilidad
 * del frontend; el backend expone una lista plana.
 */
export async function getPatientMeasurements(
  id: string,
): Promise<ClinicalMeasurementDto[]> {
  return apiFetch<ClinicalMeasurementDto[]>(`${PATH}/${id}/measurements`);
}

// --- Asignación paciente ↔ profesional ("mis pacientes") ---

export async function fetchPatientAssignments(
  id: string,
): Promise<PatientProfessionalAssignment[]> {
  return apiFetch<PatientProfessionalAssignment[]>(
    `${PATH}/${id}/professionals`,
  );
}

export async function assignPatientProfessional(
  id: string,
  professionalId: string,
  relationshipType?: string,
): Promise<PatientProfessionalAssignment> {
  return apiFetch<PatientProfessionalAssignment>(
    `${PATH}/${id}/professionals`,
    {
      method: "POST",
      body: JSON.stringify({ professionalId, relationshipType }),
    },
  );
}

export async function removePatientProfessional(
  id: string,
  professionalId: string,
): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}/professionals/${professionalId}`, {
    method: "DELETE",
  });
}

// --- Creación masiva de pacientes (CSV) ---

/** Fila individual enviada al bulk endpoint de pacientes. */
export interface BulkPatientCreateRow {
  firstName: string;
  lastName: string;
  documentNumber: string | null;
  email: string | null;
  status: string;
  /** Código de clínica (opcional, sin rol). */
  clinicCode?: string | null;
}

export interface BulkCreatePatientsInput {
  clinicId?: string | null;
  rows: BulkPatientCreateRow[];
}

export interface BulkRowResult {
  line: number;
  success: boolean;
  patientId?: string | null;
  error?: string | null;
}

export interface BulkCreatePatientsResult {
  results: BulkRowResult[];
  created: number;
  failed: number;
}

/**
 * Crea pacientes de forma masiva.
 * POST /api/v1/patients/bulk — cada fila se procesa de forma independiente.
 */
export async function createBulkPatients(
  input: BulkCreatePatientsInput,
): Promise<BulkCreatePatientsResult> {
  return apiFetch<BulkCreatePatientsResult>(
    `${env.apiUrl}/api/v1/patients/bulk`,
    {
      method: "POST",
      body: JSON.stringify({
        clinicId: input.clinicId ?? null,
        rows: input.rows,
      }),
    },
  );
}

/** Catálogo estático: cache en memoria con TTL (evita re-peticiones al navegar). */
const INSURERS_TTL_MS = 5 * 60_000;
let insurersCache: { data: Insurer[]; expires: number } | null = null;

export async function fetchInsurers(signal?: AbortSignal): Promise<Insurer[]> {
  if (insurersCache && insurersCache.expires > Date.now()) {
    return insurersCache.data;
  }
  const data = await apiFetch<Insurer[]>(`${env.apiUrl}/api/v1/insurers`, {
    signal,
  });
  insurersCache = { data, expires: Date.now() + INSURERS_TTL_MS };
  return data;
}
