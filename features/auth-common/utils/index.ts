/**
 * Helpers de presentación compartidos por los módulos de usuarios y roles
 * (badges de estado Activo/Inactivo y formato de fecha en español).
 */

/** Colores del badge de estado Activo/Inactivo (usuarios y roles). */
export function getStatusColor(active: boolean): {
  bg: string;
  text: string;
  dot: string;
} {
  if (active) {
    return {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    };
  }
  return {
    bg: "var(--destructive-soft)",
    text: "var(--destructive)",
    dot: "var(--destructive)",
  };
}

/** Fecha legible en español (ej. "12 ago 2026"). */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
