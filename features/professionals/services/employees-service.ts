/**
 * Directorio de empleados del ERP (núcleo HR + extensión clínica).
 * Incluye la acción de invitar: crea el usuario en el Auth Service y envía el
 * enlace de primer acceso al profesional.
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";

export interface EmployeeListItem {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  status: string;
  isProfessional: boolean;
  professionalTypeName: string | null;
  clinicNames: string[];
}

export interface PaginatedEmployees {
  data: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EmployeeClinic {
  clinicId: string;
  clinicName: string;
  isPrimary: boolean;
  status: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  organizationId: string;
  organizationName: string;
  userId: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  hireDate: string | null;
  clinics: EmployeeClinic[];
  professional: {
    id: string;
    professionalTypeId: string | null;
    professionalTypeName: string | null;
    bio: string | null;
    onboardingCompletedAt: string | null;
    specialtyIds: string[];
  } | null;
}

export interface InviteResult {
  employeeId: string;
  userId: string;
  invitationId: string;
  expiresAt: string;
  invitationLink: string | null;
}

export interface EmployeesFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  organizationId?: string;
  clinicId?: string;
}

export async function fetchEmployees(filter: EmployeesFilter = {}): Promise<PaginatedEmployees> {
  const params = new URLSearchParams();
  if (filter.page) params.set("page", String(filter.page));
  if (filter.pageSize) params.set("pageSize", String(filter.pageSize));
  if (filter.search) params.set("search", filter.search);
  if (filter.status) params.set("status", filter.status);
  if (filter.organizationId) params.set("organizationId", filter.organizationId);
  if (filter.clinicId) params.set("clinicId", filter.clinicId);
  const qs = params.toString();

  return apiFetch<PaginatedEmployees>(`${env.apiUrl}/api/v1/employees${qs ? `?${qs}` : ""}`);
}

export async function fetchEmployee(id: string): Promise<EmployeeDetail> {
  const data = await apiFetch<EmployeeDetail>(`${env.apiUrl}/api/v1/employees/${id}`);
  return {
    ...data,
    isProfessional: data.professional != null,
    professionalTypeName: data.professional?.professionalTypeName ?? null,
  };
}

export async function inviteEmployee(id: string): Promise<InviteResult> {
  return apiFetch<InviteResult>(`${env.apiUrl}/api/v1/employees/${id}/invite`, {
    method: "POST",
  });
}

// --- Árbol organizacional (org → clínicas → sedes) ---

export interface OrgLocation {
  id: string;
  name: string;
}

export interface OrgClinic {
  id: string;
  name: string;
  isActive: boolean;
  locations: OrgLocation[];
}

export interface OrganizationTree {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  clinics: OrgClinic[];
}

export async function fetchOrganizationTree(): Promise<OrganizationTree[]> {
  return apiFetch<OrganizationTree[]>(`${env.apiUrl}/api/v1/organizations/tree`);
}

// --- Creación orquestada del profesional ---

export interface ProfessionalClinicAssignment {
  clinicId: string;
  isPrimary: boolean;
  status: string;
  roleId: string | null;
  locationIds: string[];
}

export interface CreateProfessionalInput {
  organizationId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  hireDate?: string | null;
  professionalTypeId?: string | null;
  bio?: string | null;
  clinics: ProfessionalClinicAssignment[];
  specialtyIds: string[];
  licenses?: unknown[];
  sendInvitation: boolean;
}

export interface CreateProfessionalResult {
  employeeId: string;
  invitationId: string | null;
  invitationExpiresAt: string | null;
  invitationLink: string | null;
}

export async function createProfessional(
  input: CreateProfessionalInput,
): Promise<CreateProfessionalResult> {
  const body = {
    organizationId: input.organizationId,
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    email: input.email,
    phoneCountryCode: input.phoneCountryCode ?? null,
    phoneNumber: input.phoneNumber ?? null,
    jobTitle: input.jobTitle ?? null,
    hireDate: input.hireDate ?? null,
    professionalTypeId: input.professionalTypeId ?? null,
    bio: input.bio ?? null,
    clinics: input.clinics.map((c) => ({
      clinicId: c.clinicId,
      isPrimary: c.isPrimary,
      status: c.status,
    })),
    specialtyIds: input.specialtyIds,
    licenses: [],
    scopedRoles: input.clinics
      .filter((c) => c.roleId)
      .map((c) => ({
        roleId: c.roleId,
        scopeType: "Clinic",
        scopeId: c.clinicId,
      })),
    scopedPermissions: [],
    sendInvitation: input.sendInvitation,
  };

  return apiFetch<CreateProfessionalResult>(`${env.apiUrl}/api/v1/professionals`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Asignaciones scoped (roles + overrides por clínica) ---

export interface ScopedRoleView {
  roleId: string;
  roleName: string;
  scopeType: string;
  scopeId: string | null;
}

export interface ScopedPermissionView {
  permissionId: string;
  permissionCode: string;
  scopeType: string;
  scopeId: string | null;
  effect: string;
}

export interface ProfessionalScopes {
  requiresInvitation: boolean;
  roles: ScopedRoleView[];
  permissions: ScopedPermissionView[];
}

export async function fetchProfessionalScopes(
  id: string,
): Promise<ProfessionalScopes> {
  return apiFetch<ProfessionalScopes>(`${env.apiUrl}/api/v1/professionals/${id}/scopes`);
}

export async function updateProfessionalScopes(
  id: string,
  input: {
    roles: Array<{ roleId: string; scopeType: string; scopeId: string | null }>;
    permissions: Array<{
      permissionId: string;
      scopeType: string;
      scopeId: string | null;
      effect: string;
    }>;
  },
): Promise<void> {
  await apiFetch<void>(`${env.apiUrl}/api/v1/professionals/${id}/scopes`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
