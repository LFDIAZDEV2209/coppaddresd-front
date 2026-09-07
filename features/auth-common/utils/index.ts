/**
 * Helpers de presentación compartidos por los módulos de usuarios y roles
 * (badges de estado Activo/Inactivo y formato de fecha en español).
 */

/**
 * Colores SÓLIDOS del badge de estado Activo/Inactivo (usuarios y roles).
 * Alto contraste: verde pleno con texto blanco; inactivo = gris pizarra
 * sólido (nunca pastel translúcido: los -soft son para banners, no estados).
 */
export function getStatusColor(active: boolean): {
  bg: string;
  text: string;
  dot: string;
} {
  if (active) {
    return {
      bg: "var(--success)",
      text: "#ffffff",
      dot: "#ffffff",
    };
  }
  return {
    bg: "#e2e8f0",
    text: "#334155",
    dot: "#64748b",
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
