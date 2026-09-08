/**
 * Helpers de importación masiva de pacientes por CSV.
 * Parser quote-aware con separador ";" y strip de BOM. Columnas esperadas:
 * nombre;apellido;documento;email;estado.
 *
 * Basado en la estructura de professionals-mock.ts pero orientado a producción
 * desde el primer momento (sin simulación/mock).
 */

export interface BulkPatientRow {
  line: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  status: string;
  errors: string[];
}

export interface BulkPatientPreview {
  valid: number;
  invalid: number;
  /** Cantidad de filas con duplicados (se contabiliza dentro de invalid). */
  duplicates: number;
}

// --- Plantilla CSV ---

/** Encabezados + 3 filas de ejemplo de la plantilla CSV de importación de pacientes. */
export function buildPatientsTemplateCsv(): string {
  const lines = [
    "nombre;apellido;documento;email;estado",
    "María;López;1234567890;maria.lopez@ejemplo.com;activo",
    "Carlos;Ramírez;;carlos.ramirez@ejemplo.com;activo",
    "Laura;García;0987654321;;activo",
  ];
  return lines.join("\n");
}

/** Descarga la plantilla CSV de pacientes en el navegador. */
export function downloadPatientsTemplateCsv(): void {
  const blob = new Blob(["\uFEFF" + buildPatientsTemplateCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla-pacientes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// --- Parser CSV ---

/**
 * Parsea el CSV de importación de pacientes (separador ";" — igual que la
 * plantilla). Parser simple: soporta valores entre comillas dobles, no celdas
 * multilínea. Columnas: nombre, apellido, documento, email, estado.
 */
export function parsePatientsCsv(raw: string): BulkPatientRow[] {
  const rows: BulkPatientRow[] = [];
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    rows.push({
      line: i + 1,
      firstName: (cells[0] ?? "").trim(),
      lastName: (cells[1] ?? "").trim(),
      documentNumber: (cells[2] ?? "").trim(),
      email: (cells[3] ?? "").trim(),
      status: (cells[4] ?? "activo").trim().toLowerCase(),
      errors: [],
    });
  }
  return rows;
}

/** Parser de línea CSV con soporte de comillas dobles y separador ";". */
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

// --- Validación ---

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUSES = ["activo", "inactivo"];

/**
 * Valida las filas parseadas: obligatorios (nombre, apellido), formato de email
 * (si se provee), estado válido (activo/inactivo, case-insensitive) y
 * duplicados de documento y email dentro del archivo.
 *
 * Documento y email son opcionales pero, si se ingresan, no pueden estar
 * duplicados dentro del lote.
 */
export function validatePatientRows(
  rows: BulkPatientRow[],
  _opts?: { clinicId?: string | null },
): BulkPatientPreview {
  const seenEmails = new Map<string, number>();
  const seenDocuments = new Map<string, number>();
  let valid = 0;
  let invalid = 0;
  let duplicates = 0;

  for (const row of rows) {
    row.errors = [];

    // Nombre y apellido son obligatorios
    if (!row.firstName) row.errors.push("Nombre obligatorio");
    if (!row.lastName) row.errors.push("Apellido obligatorio");

    // Email: opcional, pero si se ingresa debe ser válido
    const email = row.email.toLowerCase();
    if (email) {
      if (!EMAIL_PATTERN.test(email)) {
        row.errors.push("Email inválido");
      } else if (seenEmails.has(email)) {
        row.errors.push(`Email duplicado (línea ${seenEmails.get(email)})`);
        duplicates++;
      } else {
        seenEmails.set(email, row.line);
      }
    }

    // Documento: opcional, pero si se ingresa no puede estar duplicado
    const doc = row.documentNumber.trim();
    if (doc) {
      if (seenDocuments.has(doc)) {
        row.errors.push(
          `Documento duplicado (línea ${seenDocuments.get(doc)})`,
        );
        duplicates++;
      } else {
        seenDocuments.set(doc, row.line);
      }
    }

    // Estado: activo o inactivo (case-insensitive). En blanco → activo.
    const status = (row.status || "activo").toLowerCase();
    if (!VALID_STATUSES.includes(status)) {
      row.errors.push('Estado debe ser "activo" o "inactivo"');
    } else {
      row.status = status;
    }

    if (row.errors.length > 0) {
      invalid++;
    } else {
      valid++;
    }
  }

  return { valid, invalid, duplicates };
}
