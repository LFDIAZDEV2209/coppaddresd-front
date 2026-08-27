/**
 * Catálogos profesionales del ERP (profesiones y especialidades).
 * Accesibles para cualquier usuario autenticado (datos de referencia).
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";

export interface ProfessionalTypeDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  validSpecialtyIds: string[];
}

export interface SpecialtyDto {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
}

export async function fetchProfessionalTypes(): Promise<ProfessionalTypeDto[]> {
  return apiFetch<ProfessionalTypeDto[]>(
    `${env.apiUrl}/api/v1/professional-types`,
  );
}

export async function fetchSpecialties(): Promise<SpecialtyDto[]> {
  return apiFetch<SpecialtyDto[]>(`${env.apiUrl}/api/v1/specialties`);
}

// --- Gestión admin de catálogos (System.AdminSettings) ---

export interface ProfessionalTypeInput {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

export async function createProfessionalType(
  input: ProfessionalTypeInput,
): Promise<ProfessionalTypeDto> {
  return apiFetch<ProfessionalTypeDto>(
    `${env.apiUrl}/api/v1/professional-types`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateProfessionalType(
  id: string,
  input: Partial<ProfessionalTypeInput> & { isActive?: boolean },
): Promise<ProfessionalTypeDto> {
  return apiFetch<ProfessionalTypeDto>(
    `${env.apiUrl}/api/v1/professional-types/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export interface SpecialtyInput {
  code: string;
  name: string;
  category: string;
  description?: string | null;
  sortOrder?: number;
}

export async function createSpecialty(
  input: SpecialtyInput,
): Promise<SpecialtyDto> {
  return apiFetch<SpecialtyDto>(`${env.apiUrl}/api/v1/specialties`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSpecialty(
  id: string,
  input: Partial<SpecialtyInput> & { isActive?: boolean },
): Promise<SpecialtyDto> {
  return apiFetch<SpecialtyDto>(`${env.apiUrl}/api/v1/specialties/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
