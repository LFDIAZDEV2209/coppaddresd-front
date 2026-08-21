/**
 * Catálogos/datos de referencia del ERP que la UI de Telemedicina consume del
 * backend (no del microservicio): especialidades, profesionales clínicos, sedes
 * y pacientes. La lógica de telemedicina no posee estos datos maestros.
 */

import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  OrganizationTree,
  PaginatedProfessionalsCatalogResult,
  SpecialtyDto,
} from "../types";

export interface ProfessionalsCatalogFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  specialtyId?: string;
  locationId?: string;
  organizationId?: string;
  clinicId?: string;
}

export async function fetchProfessionalsCatalog(
  filters: ProfessionalsCatalogFilters = {},
): Promise<PaginatedProfessionalsCatalogResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "" && key !== "page" && key !== "pageSize") {
      params.set(key, String(value));
    }
  }
  return apiFetch<PaginatedProfessionalsCatalogResult>(
    `${env.apiUrl}/api/v1/professionals-catalog?${params.toString()}`,
  );
}

export async function fetchSpecialties(): Promise<SpecialtyDto[]> {
  return apiFetch<SpecialtyDto[]>(`${env.apiUrl}/api/v1/specialties`);
}

export async function fetchOrganizationTree(): Promise<OrganizationTree[]> {
  return apiFetch<OrganizationTree[]>(`${env.apiUrl}/api/v1/organizations/tree`);
}

export interface PatientListItem {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string | null;
  mrn: string | null;
  status: string;
}

export async function fetchPatients(search?: string): Promise<{
  data: PatientListItem[];
  total: number;
}> {
  const params = new URLSearchParams({ page: "1", pageSize: "20" });
  if (search?.trim()) params.set("search", search.trim());
  return apiFetch<{ data: PatientListItem[]; total: number }>(
    `${env.apiUrl}/api/v1/patients?${params.toString()}`,
  );
}
