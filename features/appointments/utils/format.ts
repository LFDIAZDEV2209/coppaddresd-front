import { getDateLocale } from "@/lib/i18n/date-locale";
import type {
  AppointmentRequestStatus,
  AppointmentStatus,
  EncounterStatus,
  TelemedicineSessionStatus,
  VirtualRoomStatus,
} from "../types";

/**
 * Formateo y etiquetas del módulo de Citas. Los estados vienen del backend como
 * códigos en inglés (valores estables del enum); las etiquetas se traducen al
 * renderizar con t(). Las fechas usan el locale del idioma activo de la UI.
 */

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(getDateLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(getDateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(getDateLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- Etiquetas de estados en español ---

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  Requested: "Solicitada",
  Confirmed: "Confirmada",
  InProgress: "En curso",
  Completed: "Completada",
  Cancelled: "Cancelada",
  NoShow: "No asistió",
};

export const requestStatusLabel: Record<AppointmentRequestStatus, string> = {
  Pending: "Pendiente",
  Approved: "Aprobada",
  Rejected: "Rechazada",
  Cancelled: "Cancelada",
  Converted: "Convertida",
};

export const sessionStatusLabel: Record<TelemedicineSessionStatus, string> = {
  Created: "Creada",
  Waiting: "En espera",
  Active: "Activa",
  Ended: "Finalizada",
  Expired: "Expirada",
  Failed: "Fallida",
};

export const roomStatusLabel: Record<VirtualRoomStatus, string> = {
  Created: "Creada",
  Waiting: "En espera",
  Active: "Activa",
  Ended: "Finalizada",
  Expired: "Expirada",
  Failed: "Fallida",
};

export const encounterStatusLabel: Record<EncounterStatus, string> = {
  Draft: "Borrador",
  Completed: "Completado",
  Cancelled: "Cancelado",
};

// --- Colores por estado (compatibles con el diseño del ERP) ---

type ColorSet = { bg: string; text: string; dot: string };

const colors = {
  blue: { bg: "var(--sidebar)", text: "#FFFFFF", dot: "#FFFFFF" },
  green: { bg: "#E6F7EF", text: "#0E7A4D", dot: "#10B981" },
  amber: { bg: "#FDF2E3", text: "#9A6A0A", dot: "#F59E0B" },
  red: { bg: "#FCEBEC", text: "#B42318", dot: "#EF4444" },
  gray: { bg: "#F1F3F5", text: "#4B5563", dot: "#9CA3AF" },
  teal: { bg: "#E6F7FB", text: "#0E7490", dot: "#0E7490" },
  purple: { bg: "#F1EAFB", text: "#6D28D9", dot: "#8B5CF6" },
} as const;

export function appointmentStatusColor(status: AppointmentStatus): ColorSet {
  switch (status) {
    case "Confirmed":
      return colors.blue;
    case "InProgress":
      return colors.teal;
    case "Completed":
      return colors.green;
    case "Cancelled":
      return colors.red;
    case "NoShow":
      return colors.amber;
    default:
      return colors.gray;
  }
}

/**
 * Punto de estado legible sobre fondos CLAROS (chips de filtro, KPIs).
 * `appointmentStatusColor` usa dot blanco para Confirmed (pensado para la
 * franja navy); aquí el punto debe contrastar con el fondo del chip.
 */
export function appointmentStatusDot(status: AppointmentStatus): string {
  switch (status) {
    case "Confirmed":
      return "var(--primary)";
    case "InProgress":
      return "#0E7490";
    case "Completed":
      return "#10B981";
    case "Cancelled":
      return "#EF4444";
    case "NoShow":
      return "#F59E0B";
    default:
      return "#64748B";
  }
}

export function requestStatusColor(status: AppointmentRequestStatus): ColorSet {
  switch (status) {
    case "Pending":
      return colors.amber;
    case "Approved":
      return colors.blue;
    case "Rejected":
    case "Cancelled":
      return colors.red;
    case "Converted":
      return colors.green;
    default:
      return colors.gray;
  }
}

export function sessionStatusColor(
  status: TelemedicineSessionStatus,
): ColorSet {
  switch (status) {
    case "Active":
      return colors.green;
    case "Waiting":
      return colors.amber;
    case "Ended":
      return colors.blue;
    case "Expired":
    case "Failed":
      return colors.red;
    default:
      return colors.gray;
  }
}

/** Tiempo relativo en español (p. ej. "hace 5 min") para bandejas tipo notificaciones. */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(value);
}

/**
 * Primer hueco agendable alineado a bloques de 30 min: redondea hacia arriba
 * y exige la anticipación mínima del backend más un margen, para que el
 * formulario no quede vencido mientras se completan los datos del paciente.
 */
export function nextBookableStart(minLeadHours = 2, marginMinutes = 30): Date {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60);
  const minLeadMs = (minLeadHours * 60 + marginMinutes) * 60_000;
  while (start.getTime() - Date.now() < minLeadMs) {
    start.setTime(start.getTime() + 30 * 60_000);
  }
  return start;
}

/** Muestra el rango [inicio – fin] en una sola línea. */
export function formatRange(start: string, end: string): string {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
  const date = from.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const f = formatTime(start);
  const t = formatTime(end);
  return `${date} · ${f} – ${t}`;
}
