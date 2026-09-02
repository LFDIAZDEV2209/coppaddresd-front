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
  signal?: AbortSignal;
}): Promise<PaginatedBiometriaPatients> {
  const {
    page = 1,
    pageSize = 20,
    search,
    gender,
    imcCategory,
    glucosaCategory,
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
  const response = await fetch(`${PATH}/export/csv`, {
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Error al exportar CSV");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biometria-pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
