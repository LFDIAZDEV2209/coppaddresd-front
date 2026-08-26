/**
 * Tipos del módulo de Citas (espejo de los DTOs y enums del microservicio
 * CoppAddresd.Appointments y de los catálogos del backend que la UI consume).
 */

// --- Enums del dominio (serializados por nombre desde el microservicio) ---

export type AppointmentRequestStatus =
  "Pending" | "Approved" | "Rejected" | "Cancelled" | "Converted";

export type AppointmentStatus =
  | "Requested"
  | "Confirmed"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "NoShow";

export type CancelledBy = "Patient" | "Professional" | "Admin" | "System";
export type RescheduleRequestedBy =
  "Patient" | "Professional" | "Admin" | "System";

export type VirtualRoomStatus =
  "Created" | "Waiting" | "Active" | "Ended" | "Expired" | "Failed";

export type TelemedicineSessionStatus =
  "Created" | "Waiting" | "Active" | "Ended" | "Expired" | "Failed";

export type EncounterStatus = "Draft" | "Completed" | "Cancelled";

export type AlertType =
  | "NewRequest"
  | "RequestApproved"
  | "RequestRejected"
  | "NewAppointment"
  | "UpcomingAppointment"
  | "AppointmentRescheduled"
  | "AppointmentCancelled"
  | "PatientWaiting"
  | "PatientJoined"
  | "ParticipantLeft"
  | "SessionEnded"
  | "NoShow"
  | "System";

export type AlertSeverity = "Info" | "Warning" | "Critical";

// --- DTOs de solicitudes y citas ---

export interface AppointmentRequestDto {
  id: string;
  patientId: string;
  patientName: string | null;
  professionalId: string | null;
  specialtyId: string;
  specialtyName: string | null;
  organizationId: string;
  clinicId: string | null;
  locationId: string | null;
  preferredStart: string | null;
  reason: string | null;
  status: AppointmentRequestStatus;
  createdAt: string;
  /** Motivo del rechazo (persistido al rechazar; null salvo Rejected). */
  rejectionReason?: string | null;
}

export interface AppointmentDto {
  id: string;
  requestId: string | null;
  patientId: string;
  patientName: string | null;
  professionalId: string;
  professionalName: string | null;
  specialtyId: string;
  specialtyName: string | null;
  organizationId: string;
  clinicId: string | null;
  locationId: string | null;
  locationName: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  status: AppointmentStatus;
  rescheduleCount: number;
  cancellationReason: string | null;
  createdAt: string | null;
}

export interface PaginatedAdminAppointmentsResult {
  items: AppointmentDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedAdminRequestsResult {
  items: AppointmentRequestDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Sala virtual y sesiones ---

export interface RoomParticipantDto {
  participantSid: string;
  identity: string;
  isConnected: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
}

export interface VirtualRoomDto {
  id: string;
  provider: string;
  providerRoomName: string;
  status: VirtualRoomStatus;
  scheduledOpenAt: string;
  scheduledCloseAt: string;
  activeSessionId: string | null;
  activeSessionStatus: TelemedicineSessionStatus | null;
  participants: RoomParticipantDto[];
}

export interface JoinSessionResultDto {
  token: string;
  expiresAt: string;
  room: VirtualRoomDto;
}

export interface TelemedicineSessionDto {
  id: string;
  appointmentId: string;
  patientId: string | null;
  patientName: string | null;
  professionalId: string | null;
  professionalName: string | null;
  status: TelemedicineSessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  endReason: string | null;
  createdAt: string;
}

export interface PaginatedAdminSessionsResult {
  items: TelemedicineSessionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Encuentro clínico ---

export interface ClinicalDataDto {
  motivoConsulta: string | null;
  evaluacion: string | null;
  diagnostico: string | null;
  plan: string | null;
  indicaciones: string | null;
  observaciones: string | null;
  seguimiento: string | null;
}

export interface ClinicalEncounterDto {
  id: string;
  appointmentId: string;
  sessionId: string | null;
  patientId: string;
  professionalId: string;
  encounterDate: string;
  status: EncounterStatus;
  clinicalData: ClinicalDataDto | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// --- Alertas ---

export interface AppointmentAlertDto {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  relatedAppointmentId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedAlertsResult {
  items: AppointmentAlertDto[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AlertsSummaryDto {
  unread: number;
}

// --- Contexto del usuario (endpoint /me) ---

export interface CurrentUserContextDto {
  professional: ProfessionalRefDto | null;
  patient: PatientRefDto | null;
}

export interface ProfessionalRefDto {
  id: string;
  employeeId: string;
  userId: string | null;
  fullName: string;
  professionalTypeName: string | null;
  specialtyIds: string[];
  locationIds: string[];
  clinicIds: string[];
}

export interface PatientRefDto {
  id: string;
  fullName: string;
  email: string | null;
  clinicId: string | null;
  locationId: string | null;
}

// --- KPIs admin ---

export interface AdminSummaryDto {
  appointmentsToday: number;
  appointmentsPending: number;
  appointmentsCompleted: number;
  requestsPending: number;
  activeSessions: number;
  alertsUnread: number;
}

// --- Analytics del dashboard ---

export interface DashboardKpisDto {
  totalAppointments: number;
  appointmentsToday: number;
  upcomingAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  uniquePatients: number;
  activeProfessionals: number;
}

export interface DailyAppointmentCountDto {
  day: string;
  count: number;
}

export interface StatusCountDto {
  status: AppointmentStatus;
  count: number;
}

export interface HourlyCountDto {
  hour: number;
  count: number;
}

export interface ProfessionalActivityDto {
  professionalId: string;
  professionalName: string | null;
  total: number;
  completed: number;
  cancelled: number;
  uniquePatients: number;
}

export interface DashboardAnalyticsDto {
  kpis: DashboardKpisDto;
  dailySeries: DailyAppointmentCountDto[];
  statusDistribution: StatusCountDto[];
  hourlyDistribution: HourlyCountDto[];
  professionalActivity: ProfessionalActivityDto[];
  upcomingAppointments: AppointmentDto[];
}

// --- Catálogos del backend (para crear solicitud y filtros admin) ---

export interface ProfessionalCatalogItemDto {
  id: string;
  employeeId: string;
  fullName: string;
  professionalTypeName: string | null;
  specialties: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  clinicIds: string[];
  status: string;
}

export interface PaginatedProfessionalsCatalogResult {
  data: ProfessionalCatalogItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SpecialtyDto {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
}

export interface OrganizationTree {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  clinics: Array<{
    id: string;
    name: string;
    isActive: boolean;
    locations: Array<{ id: string; name: string }>;
  }>;
}
