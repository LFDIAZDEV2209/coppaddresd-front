/**
 * Contexto del usuario autenticado en el ERP (switcher de clínica).
 *
 * GET /api/v1/me/context devuelve la organización del usuario, sus clínicas
 * asignadas (con sedes) y, por clínica, los permisos efectivos (globales +
 * scoped). El frontend usa esto para mostrar el selector de contexto y para
 * gatear la UI según la clínica activa.
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";

export interface MyLocation {
  id: string;
  name: string;
  cityName: string | null;
  stateCode: string | null;
}

export interface MyClinic {
  id: string;
  name: string;
  isPrimary: boolean;
  locations: MyLocation[];
  /** Permisos efectivos del usuario EN ESTA clínica (globales ∪ scoped). */
  permissions: string[];
}

export interface MyOrganization {
  id: string;
  name: string;
}

export interface MyContext {
  userId: string;
  employeeId: string | null;
  professionalId: string | null;
  organization: MyOrganization | null;
  isProfessional: boolean;
  professionalTypeName: string | null;
  /** true si el profesional ya completó el wizard de onboarding. */
  onboardingCompleted: boolean;
  /** Estado del empleado (Invited / Active / Inactive). Invited = onboarding pendiente. */
  employeeStatus: string | null;
  clinics: MyClinic[];
  activeClinicId: string | null;
}

export async function fetchMyContext(): Promise<MyContext> {
  return apiFetch<MyContext>(`${env.apiUrl}/api/v1/me/context`);
}

// --- Perfil propio (wizard de onboarding) ---

export interface ProfessionalLicenseInput {
  licenseType: string;
  specialtyId?: string | null;
  number?: string | null;
  stateId?: string | null;
  issuer?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  verificationStatus?: string | null;
}

export interface MyProfessional {
  id: string;
  professionalTypeId: string | null;
  professionalTypeName: string | null;
  bio: string | null;
  photoStorageKey: string | null;
  onboardingCompletedAt: string | null;
  specialtyIds: string[];
  licenses: Array<{
    id: string;
    licenseType: string;
    specialtyId: string | null;
    number: string | null;
    issuer: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    verificationStatus: string;
  }>;
}

export interface MyEmployeeProfile {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  jobTitle: string | null;
  department: string | null;
  hireDate: string | null;
  status: string;
  professional: MyProfessional | null;
}

export async function fetchMyProfile(): Promise<MyEmployeeProfile> {
  return apiFetch<MyEmployeeProfile>(`${env.apiUrl}/api/v1/me/profile`);
}

export interface UpdateMyProfileInput {
  professionalTypeId?: string | null;
  bio?: string | null;
  photoStorageKey?: string | null;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  specialtyIds?: string[] | null;
  licenses?: ProfessionalLicenseInput[] | null;
  completeOnboarding?: boolean;
}

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<MyEmployeeProfile> {
  return apiFetch<MyEmployeeProfile>(`${env.apiUrl}/api/v1/me/profile`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
