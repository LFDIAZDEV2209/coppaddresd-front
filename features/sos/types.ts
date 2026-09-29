/**
 * Tipos del módulo SOS (bandeja ERP — Misión SOS Panic).
 *
 * Contrato REAL del backend (`coppAddresdBack`):
 * - `SosDtos.cs` — `SosAlertsPage { data, total, page, pageSize, totalPages }`
 *   con filas `SosAlertListItemDto` (convención de paginación offset del repo;
 *   camelCase tal cual serializa ASP.NET).
 * - `GET /api/v1/sos/alerts` (staff, `Sos.Alerts.Manage` + scope D5): la fila
 *   NO incluye teléfono ni coordenadas (viven solo en el detalle `GET /{id}`,
 *   sujeto al mismo scope).
 * - `POST /api/v1/sos/alerts/{id}/attend` y `GET /{id}` responden el detalle
 *   `SosAlertDto` completo (200) con teléfono enmascarado.
 * - Estados (`Domain/Enums/SosEnums.cs`): `Activa → Atendida | Cancelada`
 *   (terminales) y canal `Pendiente | Enviado | Fallido | Timeout |
 *   NoConfigurado` — vocabulario del dominio, sin PII en canal.
 */

/** Estados del ciclo de vida de la alerta (REQ-SOS-05, terminal ambos). */
export type SosAlertStatus = "Activa" | "Atendida" | "Cancelada";

/** Estado de un canal de notificación (SosChannelStatus del dominio). */
export type SosChannelStatus =
  "Pendiente" | "Enviado" | "Fallido" | "Timeout" | "NoConfigurado";

/** Fila del listado staff (SosAlertListItemDto): dato operacional mínimo. */
export interface SosAlertListItemDto {
  id: string;
  patientId: string;
  patientName: string | null;
  status: SosAlertStatus;
  /** Momento de activación (UTC ISO). */
  createdAt: string;
  /** Usuario del ERP que atendió (Guid; el nombre lo resuelve la UI/DTO futuro). */
  attendedBy: string | null;
  attendedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  smsChannelStatus: SosChannelStatus;
  pushChannelStatus: SosChannelStatus;
}

/** Página del listado staff: `{ data, ... }` (SosAlertsPage del backend). */
export interface SosAlertsPage {
  data: SosAlertListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Detalle completo (GET /{id} y respuesta del attend): SosAlertDto. */
export interface SosAlertDto {
  id: string;
  patientId: string;
  status: SosAlertStatus;
  /** Coordenadas validadas por el backend; null si el paciente no compartió GPS. */
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  locationCapturedAt: string | null;
  /** Teléfono de destino SIEMPRE enmascarado ("+****1234"). */
  maskedDestinationPhone: string;
  smsChannelStatus: SosChannelStatus;
  pushChannelStatus: SosChannelStatus;
  pushRecipients: number | null;
  createdAt: string;
  attendedBy: string | null;
  attendedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
}
