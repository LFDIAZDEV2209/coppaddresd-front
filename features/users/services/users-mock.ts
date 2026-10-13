/**
 * Mock data del módulo de usuarios — AISLADO de la lógica de producción.
 *
 * El backend todavía no expone "último acceso". La interfaz muestra ese dato
 * como no disponible hasta que la API lo entregue; este archivo conserva solo
 * utilidades sin datos simulados.
 *
 * Los helpers de CSV importación (parseUsersCsv, validateBulkRows,
 * downloadTemplate, etc.) y la simulación de creación masiva
 * (simulateBulkCreate) fueron eliminados: la importación unificada vive en
 * features/professionals/services/people-csv.ts y
 * features/professionals/components/people-bulk-import.tsx.
 */

/** Formato relativo en español ("Hace 2 horas", "Hace 3 días"). */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Hace instantes";
  if (minutes < 60)
    return `Hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.floor(days / 30);
  return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

/**
 * Contraseña generada automáticamente que CUMPLE la política de Identity del
 * backend (min 8, dígito, minúscula, mayúscula, especial). Prefijo estable +
 * sufijo aleatorio evita caracteres ambiguos.
 */
export function generatePassword(): string {
  const stable = "Copp-Adresd";
  const random = Math.random().toString(36).slice(2, 8);
  return `${stable}1!${random}`;
}
