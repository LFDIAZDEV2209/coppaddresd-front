import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  ProgramErpDashboardDto,
  ProgramErpTodayDto,
  ProgramErpAdherenciaDto,
  ProgramErpCofresDto,
  PatientOverviewDto,
} from "../types/erp";

const PATH = `${env.apiUrl}/api/v1/program/erp`;

// --- Dashboard General ---

export async function fetchErpDashboard(
  signal?: AbortSignal,
): Promise<ProgramErpDashboardDto> {
  return apiFetch<ProgramErpDashboardDto>(`${PATH}/dashboard`, { signal });
}

// --- Actividad de Hoy ---

export async function fetchErpToday(
  signal?: AbortSignal,
): Promise<ProgramErpTodayDto> {
  return apiFetch<ProgramErpTodayDto>(`${PATH}/today`, { signal });
}

// --- Adherencia y Rachas ---

export async function fetchErpAdherencia(
  page: number,
  pageSize: number,
  search?: string,
  sortBy?: string,
  sortDir?: string,
  signal?: AbortSignal,
): Promise<ProgramErpAdherenciaDto> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search?.trim()) params.set("search", search.trim());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDir", sortDir);

  return apiFetch<ProgramErpAdherenciaDto>(
    `${PATH}/adherencia?${params.toString()}`,
    { signal },
  );
}

// --- Cofres y XP ---

export async function fetchErpCofres(
  signal?: AbortSignal,
): Promise<ProgramErpCofresDto> {
  return apiFetch<ProgramErpCofresDto>(`${PATH}/cofres`, { signal });
}

// --- Perfil 360 del paciente ---

export async function fetchPatientOverview(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientOverviewDto | null> {
  try {
    return await apiFetch<PatientOverviewDto>(
      `${PATH}/patients/${patientId}/overview`,
      { signal },
    );
  } catch {
    return null;
  }
}
