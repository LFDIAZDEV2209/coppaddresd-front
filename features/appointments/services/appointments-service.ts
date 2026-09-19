/**
 * Cliente del microservicio de Citas. Las rutas de citas (CRUD, agenda, cancel,
 * reschedule, sala virtual y encuentro clínico) usan la base canónica
 * /api/v1/appointments; requests, alertas, admin y me siguen en la base legacy
 * /api/v1/telemedicine (controllers no renombrados en esta fase de transición).
 * Comparte el JWT del Auth Service (Bearer en memoria) vía apiFetch; los
 * maestros del ERP (profesionales, especialidades, sedes, pacientes) se
 * consumen del backend en el service de referencia.
 */

import { ApiError, apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  AdminSummaryDto,
  AlertsSummaryDto,
  AppointmentAlertDto,
  AppointmentDto,
  AppointmentRequestDto,
  ChatMessageDto,
  ClinicalDataDto,
  ClinicalEncounterDto,
  CurrentUserContextDto,
  DashboardAnalyticsDto,
  EncounterAddendumDto,
  JoinSessionResultDto,
  PaginatedAdminAppointmentsResult,
  PaginatedAdminRequestsResult,
  PaginatedAdminSessionsResult,
  PaginatedAlertsResult,
  PreVisitIntakeDto,
  VirtualRoomDto,
} from "../types";

// Base canónica de Citas: los endpoints de appointments (CRUD/agenda/cancel/
// reschedule/join-token/room/session/encounter) ya viven en /api/v1/appointments.
const APPOINTMENTS_PATH = `${env.apiUrl}/api/v1/appointments`;

// Base legacy del módulo Telemedicine: requests, alerts, admin y me aún se
// sirven en /api/v1/telemedicine (controllers no renombrados en esta fase de
// transición); el gateway mantiene el alias /api/v1/telemedicine/appointments/*.
const TELEMEDICINE_LEGACY_PATH = `${env.apiUrl}/api/v1/telemedicine`;

// --- Contexto del usuario (resuelve profesional/paciente del JWT) ---

export async function fetchCurrentUserContext(): Promise<CurrentUserContextDto> {
  return apiFetch<CurrentUserContextDto>(`${TELEMEDICINE_LEGACY_PATH}/me`);
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
): Promise<AppointmentRequestDto> {
  return apiFetch<AppointmentRequestDto>(
    `${TELEMEDICINE_LEGACY_PATH}/requests`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function fetchRequest(id: string): Promise<AppointmentRequestDto> {
  return apiFetch<AppointmentRequestDto>(
    `${TELEMEDICINE_LEGACY_PATH}/requests/${id}`,
  );
}

export async function fetchMyRequests(
  patientId?: string,
): Promise<AppointmentRequestDto[]> {
  const qs = patientId ? `?patientId=${patientId}` : "";
  return apiFetch<AppointmentRequestDto[]>(
    `${TELEMEDICINE_LEGACY_PATH}/requests/mine${qs}`,
  );
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
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(
    `${TELEMEDICINE_LEGACY_PATH}/requests/${id}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

/**
 * Primer paso del ciclo de revisión de 2: aprueba la solicitud (Pending →
 * Approved) sin crear cita. Autorización dual en el backend: admin con
 * Appointments.AdminView o el profesional asignado (identidad del JWT).
 */
export async function approveRequest(
  id: string,
): Promise<AppointmentRequestDto> {
  return apiFetch<AppointmentRequestDto>(
    `${TELEMEDICINE_LEGACY_PATH}/requests/${id}/approve`,
    { method: "POST" },
  );
}

export interface RejectRequestInput {
  reason: string;
}

/**
 * Cierra la solicitud con motivo obligatorio (Pending|Approved → Rejected).
 * Autorización dual en el backend: admin con Appointments.AdminView o el
 * profesional asignado (identidad del JWT).
 */
export async function rejectRequest(
  id: string,
  input: RejectRequestInput,
): Promise<AppointmentRequestDto> {
  return apiFetch<AppointmentRequestDto>(
    `${TELEMEDICINE_LEGACY_PATH}/requests/${id}/reject`,
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
): Promise<AppointmentDto[]> {
  const params = new URLSearchParams({
    professionalId,
    from,
    to,
  });
  return apiFetch<AppointmentDto[]>(
    `${APPOINTMENTS_PATH}/agenda?${params.toString()}`,
  );
}

export async function fetchAppointment(id: string): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`${APPOINTMENTS_PATH}/${id}`);
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
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`${APPOINTMENTS_PATH}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelAppointment(
  id: string,
  input: { reason: string; cancelledBy: string },
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`${APPOINTMENTS_PATH}/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function rescheduleAppointment(
  id: string,
  input: {
    newStart: string;
    durationMinutes?: number | null;
    reason?: string | null;
    requestedBy: string;
  },
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(`${APPOINTMENTS_PATH}/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Sala virtual y sesiones ---

export async function fetchJoinToken(
  appointmentId: string,
): Promise<JoinSessionResultDto> {
  return apiFetch<JoinSessionResultDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/join-token`,
    {
      method: "POST",
    },
  );
}

export async function fetchRoom(
  appointmentId: string,
): Promise<VirtualRoomDto> {
  return apiFetch<VirtualRoomDto>(`${APPOINTMENTS_PATH}/${appointmentId}/room`);
}

export async function startSession(
  appointmentId: string,
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/session/start`,
    { method: "POST" },
  );
}

export async function endSession(
  appointmentId: string,
  endReason?: string | null,
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/session/end`,
    { method: "POST", body: JSON.stringify({ endReason: endReason ?? null }) },
  );
}

export async function reopenSession(
  appointmentId: string,
): Promise<AppointmentDto> {
  return apiFetch<AppointmentDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/session/reopen`,
    { method: "POST" },
  );
}

// --- Chat de la consulta (REST + polling incremental) ---

export interface ChatMessagesQuery {
  /** Cursor ISO: devuelve mensajes con createdAt > after. */
  after?: string | null;
  /** Desempate del cursor cuando varios mensajes comparten createdAt. */
  afterId?: string | null;
  /** Límite de mensajes (1–100, default del backend). */
  limit?: number;
}

export async function fetchChatMessages(
  appointmentId: string,
  query: ChatMessagesQuery = {},
): Promise<ChatMessageDto[]> {
  const params = new URLSearchParams();
  if (query.after) params.set("after", query.after);
  if (query.afterId) params.set("afterId", query.afterId);
  if (query.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<ChatMessageDto[]>(
    `${APPOINTMENTS_PATH}/${appointmentId}/chat/messages${qs ? `?${qs}` : ""}`,
  );
}

export async function sendChatMessage(
  appointmentId: string,
  body: string,
): Promise<ChatMessageDto> {
  return apiFetch<ChatMessageDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/chat/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

// --- Pre-consulta del paciente ---

/**
 * Pre-consulta que el paciente reporta antes de la consulta. El backend
 * responde 200 con null (o 404) cuando aún no la completó: se normaliza a null
 * para que la UI del profesional muestre el estado vacío.
 */
export async function fetchPreVisitIntake(
  appointmentId: string,
): Promise<PreVisitIntakeDto | null> {
  try {
    return await apiFetch<PreVisitIntakeDto | null>(
      `${APPOINTMENTS_PATH}/${appointmentId}/pre-visit-intake`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// --- Encuentro clínico ---

export async function fetchEncounter(
  appointmentId: string,
): Promise<ClinicalEncounterDto> {
  return apiFetch<ClinicalEncounterDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/encounter`,
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
    `${APPOINTMENTS_PATH}/${appointmentId}/encounter`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export async function completeEncounter(
  appointmentId: string,
  input: EncounterPayload,
): Promise<ClinicalEncounterDto> {
  return apiFetch<ClinicalEncounterDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/encounter/complete`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// --- Adendas del encuentro (append-only, solo con el encuentro Completed) ---

export async function fetchEncounterAddenda(
  appointmentId: string,
): Promise<EncounterAddendumDto[]> {
  return apiFetch<EncounterAddendumDto[]>(
    `${APPOINTMENTS_PATH}/${appointmentId}/encounter/addenda`,
  );
}

export async function addEncounterAddendum(
  appointmentId: string,
  body: string,
): Promise<EncounterAddendumDto> {
  return apiFetch<EncounterAddendumDto>(
    `${APPOINTMENTS_PATH}/${appointmentId}/encounter/addenda`,
    { method: "POST", body: JSON.stringify({ body }) },
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
  return apiFetch<PaginatedAlertsResult>(
    `${TELEMEDICINE_LEGACY_PATH}/alerts?${params.toString()}`,
  );
}

export async function fetchAlertsSummary(): Promise<AlertsSummaryDto> {
  return apiFetch<AlertsSummaryDto>(
    `${TELEMEDICINE_LEGACY_PATH}/alerts/summary`,
  );
}

export async function markAlertRead(id: string): Promise<void> {
  await apiFetch<void>(`${TELEMEDICINE_LEGACY_PATH}/alerts/${id}/read`, {
    method: "POST",
  });
}

export async function markAllAlertsRead(): Promise<number> {
  return apiFetch<number>(`${TELEMEDICINE_LEGACY_PATH}/alerts/read-all`, {
    method: "POST",
  });
}

export type { AppointmentAlertDto };

// --- Admin (vista global, requiere Appointments.AdminView) ---

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
  return apiFetch<AdminSummaryDto>(`${TELEMEDICINE_LEGACY_PATH}/admin/summary`);
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
  return apiFetch<AdminSummaryDto>(`${TELEMEDICINE_LEGACY_PATH}/me/summary`);
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
    `${TELEMEDICINE_LEGACY_PATH}/me/appointments?${params.toString()}`,
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
    `${TELEMEDICINE_LEGACY_PATH}/admin/analytics${qs ? `?${qs}` : ""}`,
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
    `${TELEMEDICINE_LEGACY_PATH}/me/analytics${qs ? `?${qs}` : ""}`,
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
    `${TELEMEDICINE_LEGACY_PATH}/admin/appointments?${params.toString()}`,
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
    `${TELEMEDICINE_LEGACY_PATH}/admin/requests?${params.toString()}`,
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
    `${TELEMEDICINE_LEGACY_PATH}/me/requests?${params.toString()}`,
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
    `${TELEMEDICINE_LEGACY_PATH}/admin/sessions?${params.toString()}`,
  );
}
