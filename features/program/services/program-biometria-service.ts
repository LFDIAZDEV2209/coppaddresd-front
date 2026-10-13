import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  BiometriaCommunityDto,
  PaginatedBiometriaPatients,
  BiometriaPatientDetail,
} from "../types/erp";

const PATH = `${env.apiUrl}/api/v1/program/erp/biometria`;

// --- Community Summary ---

export async function fetchBiometriaCommunity(
  signal?: AbortSignal,
): Promise<BiometriaCommunityDto> {
  return apiFetch<BiometriaCommunityDto>(`${PATH}/community`, { signal });
}

// --- Patient List (paginated) ---

export async function fetchBiometriaPatients(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  gender?: string;
  imcCategory?: string;
  glucosaCategory?: string;
  grasaCategory?: string;
  trend?: string;
  cityId?: string | null;
  stateAbbr?: string | null;
  signal?: AbortSignal;
}): Promise<PaginatedBiometriaPatients> {
  const {
    page = 1,
    pageSize = 20,
    search,
    gender,
    imcCategory,
    glucosaCategory,
    grasaCategory,
    trend,
    cityId,
    stateAbbr,
    signal,
  } = params;

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search?.trim()) qs.set("search", search.trim());
  if (gender) qs.set("gender", gender);
  if (imcCategory) qs.set("imcCategory", imcCategory);
  if (glucosaCategory) qs.set("glucosaCategory", glucosaCategory);
  if (grasaCategory) qs.set("grasaCategory", grasaCategory);
  if (trend) qs.set("trend", trend);
  if (cityId) qs.set("cityId", cityId);
  if (stateAbbr) qs.set("stateAbbr", stateAbbr);

  return apiFetch<PaginatedBiometriaPatients>(
    `${PATH}/patients?${qs.toString()}`,
    { signal },
  );
}

// --- Patient Detail ---

export async function fetchBiometriaPatient(
  patientId: string,
  signal?: AbortSignal,
): Promise<BiometriaPatientDetail | null> {
  try {
    return await apiFetch<BiometriaPatientDetail>(
      `${PATH}/patients/${patientId}`,
      { signal },
    );
  } catch {
    return null;
  }
}

// --- CSV Export ---

export async function exportBiometriaCsv(signal?: AbortSignal): Promise<void> {
  // apiFetch adjunta Bearer/ámbito y renueva la sesión igual que el listado.
  const csv = await apiFetch<string>(`${PATH}/export/csv`, { signal });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biometria-pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
