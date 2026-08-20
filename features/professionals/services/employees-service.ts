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

export interface EmployeeDetail extends EmployeeListItem {
  organizationId: string;
  organizationName: string;
  userId: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  hireDate: string | null;
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
  return apiFetch<EmployeeDetail>(`${env.apiUrl}/api/v1/employees/${id}`);
}

export async function inviteEmployee(id: string): Promise<InviteResult> {
  return apiFetch<InviteResult>(`${env.apiUrl}/api/v1/employees/${id}/invite`, {
    method: "POST",
  });
}
