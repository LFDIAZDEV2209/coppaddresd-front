/**
 * Tipos del módulo SOS (borrador de bandeja ERP — Misión SOS Panic).
 *
 * Basado en `openspec/changes/sos-panic-real` (spec REQ-SOS-05 y design D5/D8).
 * El backend está en implementación: los nombres de campos del listado son
 * ASUNCIÓN para revisión con los agentes principales (D8 solo define
 * `POST /api/v1/sos/alerts/{id}/attend` y `GET /api/v1/sos/alerts/{id}`; el
 * listado `GET /api/v1/sos/alerts` para staff con `Sos.Alerts.Manage` es la
 * extensión natural que este borrador consume).
 *
 * Estados y canales siguen el vocabulario del spec (español, como el resto
 * del dominio: `Activa` → `Atendida` | `Cancelada`, transiciones terminales).
 */

/** Estados del ciclo de vida de la alerta (spec REQ-SOS-05). */
export type SosAlertStatus = "Activa" | "Atendida" | "Cancelada";

/** Canales de notificación que el backend registra por alerta. */
export type SosAlertChannel = "Sms" | "Push";

/** Estados por canal (spec REQ-SOS-03/04): sin PII, solo resultado de canal. */
export type SosChannelStatus =
  "Enviado" | "Fallido" | "Timeout" | "NoConfigurado" | "EnEspera";

export interface SosChannelDto {
  channel: SosAlertChannel;
  status: SosChannelStatus;
  at: string | null;
}

export interface SosAlertDto {
  id: string;
  patientId: string;
  patientName: string | null;
  status: SosAlertStatus;
  /** Momento de activación (UTC ISO). */
  triggeredAt: string;
  /** Coordenadas validadas por el backend; null si el paciente no compartió GPS. */
  latitude: number | null;
  longitude: number | null;
  channels: SosChannelDto[];
  /** Actor y marca de tiempo de las transiciones terminales (REQ-SOS-05). */
  attendedByName: string | null;
  attendedAt: string | null;
  cancelledAt: string | null;
}

/** Resultado paginado del listado staff (mismo shape que el resto del ERP). */
export interface PaginatedSosAlertsResult {
  items: SosAlertDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
