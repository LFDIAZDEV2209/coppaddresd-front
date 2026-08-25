/**
 * Cliente del microservicio de Telemedicina (/api/v1/telemedicine/* en el
 * puerto 5130). Comparte el JWT del Auth Service (Bearer en memoria) vía
 * apiFetch; los maestros del ERP (profesionales, especialidades, sedes,
 * pacientes) se consumen del backend en el service de referencia.
 */

import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  AdminSummaryDto,
  AlertsSummaryDto,
  ClinicalDataDto,
  ClinicalEncounterDto,
  CurrentUserContextDto,
  DashboardAnalyticsDto,
  JoinSessionResultDto,
  PaginatedAdminAppointmentsResult,
  PaginatedAdminRequestsResult,
  PaginatedAdminSessionsResult,
  PaginatedAlertsResult,
  TelemedicineAlertDto,
  TelemedicineAppointmentDto,
  TelemedicineRequestDto,
  VirtualRoomDto,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/telemedicine`;

// --- Contexto del usuario (resuelve profesional/paciente del JWT) ---

export async function fetchCurrentUserContext(): Promise<CurrentUserContextDto> {
  return apiFetch<CurrentUserContextDto>(`${PATH}/me`);
}

// --- Solicitudes ---

export interface CreateRequestInput {
  patientId: string;
  organizationId: string;
  specialtyId: string;
  professionalId?: string | null;
  clinicId?: string | null;
  locationId?: string | null;
  preferredStart?: string | null;
  reason: string;
}

export async function createRequest(
  input: CreateRequestInput,
): Promise<TelemedicineRequestDto> {
  return apiFetch<TelemedicineRequestDto>(`${PATH}/requests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchRequest(
  id: string,
): Promise<TelemedicineRequestDto> {
  return apiFetch<TelemedicineRequestDto>(`${PATH}/requests/${id}`);
}

export async function fetchMyRequests(
  patientId?: string,
): Promise<TelemedicineRequestDto[]> {
  const qs = patientId ? `?patientId=${patientId}` : "";
  return apiFetch<TelemedicineRequestDto[]>(`${PATH}/requests/mine${qs}`);
}

export interface ConfirmRequestInput {
  professionalId: string;
  scheduledStart: string;
  durationMinutes?: number | null;
  locationId?: string | null;
}

export async function confirmRequest(
  id: string,
  input: ConfirmRequestInput,
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(
    `${PATH}/requests/${id}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

// --- Citas (agenda del profesional) ---

export async function fetchAgenda(
  professionalId: string,
  from: string,
  to: string,
): Promise<TelemedicineAppointmentDto[]> {
  const params = new URLSearchParams({
    professionalId,
    from,
    to,
  });
  return apiFetch<TelemedicineAppointmentDto[]>(
    `${PATH}/appointments/agenda?${params.toString()}`,
  );
}

export async function fetchAppointment(
  id: string,
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(`${PATH}/appointments/${id}`);
}

export interface ScheduleAppointmentInput {
  patientId: string;
  professionalId: string;
  specialtyId: string;
  organizationId: string;
  clinicId?: string | null;
  locationId?: string | null;
  scheduledStart: string;
  durationMinutes?: number | null;
}

export async function scheduleAppointment(
  input: ScheduleAppointmentInput,
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(`${PATH}/appointments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelAppointment(
  id: string,
  input: { reason: string; cancelledBy: string },
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(
    `${PATH}/appointments/${id}/cancel`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function rescheduleAppointment(
  id: string,
  input: {
    newStart: string;
    durationMinutes?: number | null;
    reason?: string | null;
    requestedBy: string;
  },
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(
    `${PATH}/appointments/${id}/reschedule`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

// --- Sala virtual y sesiones ---

export async function fetchJoinToken(
  appointmentId: string,
): Promise<JoinSessionResultDto> {
  return apiFetch<JoinSessionResultDto>(
    `${PATH}/appointments/${appointmentId}/join-token`,
    {
      method: "POST",
    },
  );
}

export async function fetchRoom(
  appointmentId: string,
): Promise<VirtualRoomDto> {
  return apiFetch<VirtualRoomDto>(`${PATH}/appointments/${appointmentId}/room`);
}

export async function startSession(
  appointmentId: string,
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(
    `${PATH}/appointments/${appointmentId}/session/start`,
    { method: "POST" },
  );
}

export async function endSession(
  appointmentId: string,
  endReason?: string | null,
): Promise<TelemedicineAppointmentDto> {
  return apiFetch<TelemedicineAppointmentDto>(
    `${PATH}/appointments/${appointmentId}/session/end`,
    { method: "POST", body: JSON.stringify({ endReason: endReason ?? null }) },
  );
}

// --- Encuentro clínico ---

export async function fetchEncounter(
  appointmentId: string,
): Promise<ClinicalEncounterDto> {
  return apiFetch<ClinicalEncounterDto>(
    `${PATH}/appointments/${appointmentId}/encounter`,
  );
}

export interface EncounterPayload {
  clinicalData?: ClinicalDataDto | null;
  notes?: string | null;
}

export async function saveEncounter(
  appointmentId: string,
  input: EncounterPayload,
): Promise<ClinicalEncounterDto> {
  return apiFetch<ClinicalEncounterDto>(
    `${PATH}/appointments/${appointmentId}/encounter`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function completeEncounter(
  appointmentId: string,
  input: EncounterPayload,
): Promise<ClinicalEncounterDto> {
  return apiFetch<ClinicalEncounterDto>(
    `${PATH}/appointments/${appointmentId}/encounter/complete`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// --- Alertas (bandeja) ---

export async function fetchAlerts(
  options: { unreadOnly?: boolean; page?: number; pageSize?: number } = {},
): Promise<PaginatedAlertsResult> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 20),
  });
  if (options.unreadOnly) params.set("unreadOnly", "true");
  return apiFetch<PaginatedAlertsResult>(`${PATH}/alerts?${params.toString()}`);
}

export async function fetchAlertsSummary(): Promise<AlertsSummaryDto> {
  return apiFetch<AlertsSummaryDto>(`${PATH}/alerts/summary`);
}

export async function markAlertRead(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/alerts/${id}/read`, { method: "POST" });
}

export async function markAllAlertsRead(): Promise<number> {
  return apiFetch<number>(`${PATH}/alerts/read-all`, { method: "POST" });
}

export type { TelemedicineAlertDto };

// --- Admin (vista global, requiere Telemedicine.AdminView) ---

export interface AdminAppointmentsFilters {
  professionalId?: string;
  patientId?: string;
  clinicId?: string;
  locationId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAdminSummary(): Promise<AdminSummaryDto> {
  return apiFetch<AdminSummaryDto>(`${PATH}/admin/summary`);
}

// --- "Mis citas" del profesional (por identidad del JWT, requiere perfil clínico) ---

export interface MyAppointmentsFilters {
  patientId?: string;
  locationId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchMySummary(): Promise<AdminSummaryDto> {
  return apiFetch<AdminSummaryDto>(`${PATH}/me/summary`);
}

export async function fetchMyAppointments(
  filters: MyAppointmentsFilters = {},
): Promise<PaginatedAdminAppointmentsResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "" && key !== "page" && key !== "pageSize") {
      params.set(key, String(value));
    }
  }
  return apiFetch<PaginatedAdminAppointmentsResult>(
    `${PATH}/me/appointments?${params.toString()}`,
  );
}

// --- Analytics del dashboard ---

export interface DashboardAnalyticsFilters {
  from?: string | null;
  to?: string | null;
}

export async function fetchAdminAnalytics(
  filters: DashboardAnalyticsFilters = {},
): Promise<DashboardAnalyticsDto> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return apiFetch<DashboardAnalyticsDto>(
    `${PATH}/admin/analytics${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchMyAnalytics(
  filters: DashboardAnalyticsFilters = {},
): Promise<DashboardAnalyticsDto> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return apiFetch<DashboardAnalyticsDto>(
    `${PATH}/me/analytics${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchAdminAppointments(
  filters: AdminAppointmentsFilters = {},
): Promise<PaginatedAdminAppointmentsResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "" && key !== "page" && key !== "pageSize") {
      params.set(key, String(value));
    }
  }
  return apiFetch<PaginatedAdminAppointmentsResult>(
    `${PATH}/admin/appointments?${params.toString()}`,
  );
}

export interface AdminRequestsFilters {
  status?: string;
  professionalId?: string;
  patientId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAdminRequests(
  filters: AdminRequestsFilters = {},
): Promise<PaginatedAdminRequestsResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "" && key !== "page" && key !== "pageSize") {
      params.set(key, String(value));
    }
  }
  return apiFetch<PaginatedAdminRequestsResult>(
    `${PATH}/admin/requests?${params.toString()}`,
  );
}

// --- "Mis solicitudes" del profesional (por identidad del JWT, requiere perfil clínico) ---

export interface MyRequestsFilters {
  status?: string;
  patientId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchMyAssignedRequests(
  filters: MyRequestsFilters = {},
): Promise<PaginatedAdminRequestsResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "" && key !== "page" && key !== "pageSize") {
      params.set(key, String(value));
    }
  }
  return apiFetch<PaginatedAdminRequestsResult>(
    `${PATH}/me/requests?${params.toString()}`,
  );
}

export interface AdminSessionsFilters {
  appointmentId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAdminSessions(
  filters: AdminSessionsFilters = {},
): Promise<PaginatedAdminSessionsResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "" && key !== "page" && key !== "pageSize") {
      params.set(key, String(value));
    }
  }
  return apiFetch<PaginatedAdminSessionsResult>(
    `${PATH}/admin/sessions?${params.toString()}`,
  );
}
