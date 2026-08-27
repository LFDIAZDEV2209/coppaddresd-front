/**
 * Formateadores del módulo de Tests de Salud.
 */

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function formatDays(days: number): string {
  if (days <= 0) return "Hoy";
  if (days === 1) return "1 día";
  return `${days} días`;
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}
