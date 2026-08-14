import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  Insurer,
  Patient,
  PatientFilters,
  PatientInput,
  PatientListItem,
  PaginatedResult,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/patients`;

export async function fetchPatients(
  page: number,
  pageSize: number,
  filters: PatientFilters,
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

  return apiFetch<PaginatedResult<PatientListItem>>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
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

export async function fetchInsurers(signal?: AbortSignal): Promise<Insurer[]> {
  return apiFetch<Insurer[]>(`${env.apiUrl}/api/v1/insurers`, { signal });
}