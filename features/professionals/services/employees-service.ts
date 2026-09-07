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
  specialtyNames: string[];
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
  specialtyId?: string;
  roleId?: string;
}

export async function fetchEmployees(
  filter: EmployeesFilter = {},
  signal?: AbortSignal,
): Promise<PaginatedEmployees> {
  const params = new URLSearchParams();
  if (filter.page) params.set("page", String(filter.page));
  if (filter.pageSize) params.set("pageSize", String(filter.pageSize));
  if (filter.search) params.set("search", filter.search);
  if (filter.status) params.set("status", filter.status);
  if (filter.organizationId)
    params.set("organizationId", filter.organizationId);
  if (filter.clinicId) params.set("clinicId", filter.clinicId);
  if (filter.specialtyId) params.set("specialtyId", filter.specialtyId);
  if (filter.roleId) params.set("roleId", filter.roleId);
  const qs = params.toString();

  return apiFetch<PaginatedEmployees>(
    `${env.apiUrl}/api/v1/employees${qs ? `?${qs}` : ""}`,
    { signal },
  );
}

/** Desglose por tipo de profesional de las stats del directorio. */
export interface EmployeeTypeStat {
  professionalTypeName: string | null;
  count: number;
}

/** Stats del directorio (mismo alcance del listado). */
export interface EmployeeStats {
  total: number;
  active: number;
  invited: number;
  inactive: number;
  byType: EmployeeTypeStat[];
}

export async function fetchEmployeeStats(
  signal?: AbortSignal,
): Promise<EmployeeStats> {
  return apiFetch<EmployeeStats>(`${env.apiUrl}/api/v1/professionals/stats`, {
    signal,
  });
}

export async function fetchEmployee(id: string): Promise<EmployeeDetail> {
  const data = await apiFetch<EmployeeDetail>(
    `${env.apiUrl}/api/v1/employees/${id}`,
  );
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
  return apiFetch<OrganizationTree[]>(
    `${env.apiUrl}/api/v1/organizations/tree`,
  );
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

  return apiFetch<CreateProfessionalResult>(
    `${env.apiUrl}/api/v1/professionals`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
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
  return apiFetch<ProfessionalScopes>(
    `${env.apiUrl}/api/v1/professionals/${id}/scopes`,
  );
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

// --- Creación masiva de empleados (CSV) ---

/** Fila individual enviada al bulk endpoint. */
export interface BulkCreateRow {
  firstName: string;
  lastName: string;
  email: string;
  professionalTypeName: string | null;
  status: string;
}

export interface BulkCreateEmployeesInput {
  organizationId: string;
  rows: BulkCreateRow[];
}

export interface BulkRowResult {
  line: number;
  success: boolean;
  employeeId?: string | null;
  error?: string | null;
}

export interface BulkCreateResult {
  results: BulkRowResult[];
  created: number;
  failed: number;
}

/**
 * Crea empleados de forma masiva.
 * POST /api/v1/employees/bulk — cada fila se procesa de forma independiente.
 */
export async function createBulkEmployees(
  input: BulkCreateEmployeesInput,
): Promise<BulkCreateResult> {
  return apiFetch<BulkCreateResult>(`${env.apiUrl}/api/v1/employees/bulk`, {
    method: "POST",
    body: JSON.stringify({
      organizationId: input.organizationId,
      rows: input.rows,
    }),
  });
}

// --- Horarios semanales de atención del profesional ---

/** Franja horaria semanal (contrato del backend: weekday 1=lun..7=dom, HH:mm). */
export interface ProfessionalScheduleSlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

/** Lee los horarios semanales de atención de un profesional. */
export async function fetchProfessionalSchedules(
  id: string,
): Promise<ProfessionalScheduleSlot[]> {
  return apiFetch<ProfessionalScheduleSlot[]>(
    `${env.apiUrl}/api/v1/professionals/${id}/schedules`,
  );
}

/** Reemplaza los horarios semanales de atención (PUT total-replace). */
export async function saveProfessionalSchedules(
  id: string,
  schedules: ProfessionalScheduleSlot[],
): Promise<void> {
  await apiFetch<void>(
    `${env.apiUrl}/api/v1/professionals/${id}/schedules`,
    {
      method: "PUT",
      body: JSON.stringify({ schedules }),
    },
  );
}
