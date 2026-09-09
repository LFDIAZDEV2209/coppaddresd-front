/**
 * Mock data del módulo de usuarios — AISLADO de la lógica de producción.
 *
 * El backend todavía no expone "último acceso" ni un endpoint de creación
 * masiva: aquí viven el mock determinista de último acceso, la plantilla y el
 * parser del CSV de importación, y la simulación de creación masiva. Cuando el
 * backend lo soporte, cada función se reemplaza por su llamada real sin tocar
 * la UI.
 */

import type { BulkPreview, BulkResult, BulkUserRow } from "../types";

/**
 * Hash simple (FNV-1a) del id del usuario → mock de último acceso
 * determinista (el mismo usuario siempre muestra el mismo valor).
 * Rango: entre 10 minutos y 90 días atrás.
 */
export function getMockLastAccess(userId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const minutes = 10 + (Math.abs(hash) % (90 * 24 * 60 - 10));
  return Date.now() - minutes * 60 * 1000;
}

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

/**
 * Encabezados + 3 filas de ejemplo de la plantilla CSV de importación.
 * Columnas: nombre;apellido;email;rol;clinica;estado
 * - apellido es OBLIGATORIO (validado en validateBulkRows).
 * - clinica es OPCIONAL: si se omite o deja en blanco, el rol se asigna global.
 * - La existencia de la clínica se valida server-side.
 */
export function buildUsersTemplateCsv(): string {
  const lines = [
    "nombre;apellido;email;rol;clinica;estado",
    "María;González;maria.gonzalez@ejemplo.com;Professional;;activo",
    "Juan;Pérez;juan.perez@ejemplo.com;Receptionist;;activo",
    "Ana;Torres;ana.torres@ejemplo.com;;Clínica Norte;inactivo",
  ];
  return lines.join("\n");
}

/** Descarga la plantilla CSV en el navegador. */
export function downloadTemplate(): void {
  const blob = new Blob(["\uFEFF" + buildUsersTemplateCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla-usuarios.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parsea el CSV de importación (separador ";" — igual que la plantilla).
 * Formato: nombre;apellido;email;rol;clinica;estado
 * - clinica (columna 5) es opcional: si se omite, se deja como "".
 * - La existencia de la clínica se valida server-side, no aquí.
 * Parser simple: soporta valores entre comillas dobles y BOM inicial.
 */
export function parseUsersCsv(raw: string): BulkUserRow[] {
  const rows: BulkUserRow[] = [];
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    rows.push({
      line: i + 1,
      firstName: (cells[0] ?? "").trim(),
      lastName: (cells[1] ?? "").trim(),
      email: (cells[2] ?? "").trim(),
      role: (cells[3] ?? "").trim(),
      // Columna clinica: opcional, trim; existencia validada server-side
      clinicName: (cells[4] ?? "").trim() || undefined,
      status: (cells[5] ?? "activo").trim().toLowerCase(),
      errors: [],
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ";" && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida las filas parseadas: campos obligatorios, formato de email,
 * rol existente, estado válido y duplicados de email (dentro del archivo).
 * La clínica es opcional; si se provee, solo se trimea — la existencia
 * se valida server-side.
 */
export function validateBulkRows(
  rows: BulkUserRow[],
  roleNames: string[],
): BulkPreview {
  const normalizedRoles = roleNames.map((role) => role.toLowerCase());
  const seen = new Map<string, number>();
  let valid = 0;
  let invalid = 0;
  let duplicates = 0;

  for (const row of rows) {
    row.errors = [];
    const email = row.email.toLowerCase();

    if (!row.firstName) row.errors.push("Nombre obligatorio");
    if (!row.lastName) row.errors.push("Apellido obligatorio");
    if (!email) {
      row.errors.push("Email obligatorio");
    } else if (!EMAIL_PATTERN.test(email)) {
      row.errors.push("Email inválido");
    } else if (seen.has(email)) {
      row.errors.push(`Email duplicado (línea ${seen.get(email)})`);
    } else {
      seen.set(email, row.line);
    }
    if (row.role && !normalizedRoles.includes(row.role.toLowerCase())) {
      row.errors.push("Rol inexistente");
    }
    if (row.status && row.status !== "activo" && row.status !== "inactivo") {
      row.errors.push('Estado debe ser "activo" o "inactivo"');
    }

    if (row.errors.length > 0) {
      invalid++;
      if (row.errors.some((error) => error.includes("duplicado"))) duplicates++;
    } else {
      valid++;
    }
  }

  return { valid, invalid, duplicates };
}

/**
 * Simulación de creación masiva (MOCK — no toca el backend). Itera las filas
 * válidas con un pequeño delay por usuario y reporta progreso; ~4% de
 * "omitidos" para que el resultado final muestre la UX completa.
 */
export async function simulateBulkCreate(
  rows: BulkUserRow[],
  onProgress: (done: number, total: number) => void,
): Promise<BulkResult> {
  const validRows = rows.filter((row) => row.errors.length === 0);
  const total = validRows.length;
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < total; i++) {
    await new Promise((resolve) =>
      setTimeout(resolve, 45 + Math.random() * 55),
    );
    // ~4% de filas "omittidas" (simula colisión de email en el backend).
    if (Math.random() < 0.04) skipped++;
    else created++;
    onProgress(i + 1, total);
  }

  return { created, skipped };
}
