/** Utilidades de fecha del módulo SOS (replica el estándar de appointments). */

function getDateLocale(): string {
  try {
    return navigator.language?.startsWith("en") ? "en-US" : "es-CO";
  } catch {
    return "es-CO";
  }
}

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

/** Tiempo relativo para bandejas tipo notificaciones (p. ej. "hace 5 min"). */
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

/** Coordenadas formateadas para el staff (sin enlace de mapa ni PII extra). */
export function formatCoordinates(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (latitude === null || longitude === null) return null;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
