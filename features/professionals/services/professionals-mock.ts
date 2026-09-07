/**
 * Mock data de creación masiva de profesionales — AISLADO de la lógica de
 * producción. El backend todavía no expone un endpoint de creación masiva:
 * aquí viven la plantilla CSV, el parser, la validación y la simulación.
 * Cuando el backend lo soporte, cada función se reemplaza por su llamada
 * real sin tocar la UI.
 */

export interface BulkProfessionalRow {
  line: number;
  firstName: string;
  lastName: string;
  email: string;
  professionalType: string;
  status: string;
  errors: string[];
}

export interface BulkProfessionalPreview {
  valid: number;
  invalid: number;
  duplicates: number;
}

export interface BulkProfessionalResult {
  created: number;
  skipped: number;
}

/** Encabezados + 3 filas de ejemplo de la plantilla CSV de importación. */
export function buildProfessionalsTemplateCsv(): string {
  const lines = [
    "nombre;apellido;email;tipo;estado",
    "Camila;Restrepo;camila.restrepo@ejemplo.com;Physician (MD/DO);activo",
    "Andrés;Valencia;andres.valencia@ejemplo.com;Registered Nurse (RN);activo",
    "Sofía;Cardona;sofia.cardona@ejemplo.com;;invitado",
  ];
  return lines.join("\n");
}

/** Descarga la plantilla CSV en el navegador. */
export function downloadProfessionalsTemplate(): void {
  const blob = new Blob(["\uFEFF" + buildProfessionalsTemplateCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla-profesionales.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parsea el CSV de importación (separador ";" — igual que la plantilla).
 * Parser simple: soporta valores entre comillas dobles, no celdas multilínea.
 */
export function parseProfessionalsCsv(raw: string): BulkProfessionalRow[] {
  const rows: BulkProfessionalRow[] = [];
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    rows.push({
      line: i + 1,
      firstName: (cells[0] ?? "").trim(),
      lastName: (cells[1] ?? "").trim(),
      email: (cells[2] ?? "").trim(),
      professionalType: (cells[3] ?? "").trim(),
      status: (cells[4] ?? "activo").trim().toLowerCase(),
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
 * Valida las filas parseadas: obligatorios, formato de email, tipo existente
 * en el catálogo, estado válido y duplicados de email dentro del archivo.
 */
export function validateProfessionalRows(
  rows: BulkProfessionalRow[],
  typeNames: string[],
): BulkProfessionalPreview {
  const normalizedTypes = typeNames.map((type) => type.toLowerCase());
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
    if (
      row.professionalType &&
      !normalizedTypes.includes(row.professionalType.toLowerCase())
    ) {
      row.errors.push("Tipo de profesional inexistente");
    }
    const status = row.status || "activo";
    if (status !== "activo" && status !== "invitado" && status !== "inactivo") {
      row.errors.push('Estado debe ser "activo", "invitado" o "inactivo"');
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
 * @deprecated Simulación de creación masiva (MOCK — no toca el backend).
 * Conservada solo para referencia/demo local. La importación real usa
 * `createBulkEmployees` (POST /api/v1/employees/bulk). Itera las filas
 * válidas con delay por profesional y reporta progreso; ~4% de "omitidos"
 * para mostrar la UX completa del resultado.
 */
export async function simulateBulkProfessionalCreate(
  rows: BulkProfessionalRow[],
  onProgress: (done: number, total: number) => void,
): Promise<BulkProfessionalResult> {
  const validRows = rows.filter((row) => row.errors.length === 0);
  const total = validRows.length;
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < total; i++) {
    await new Promise((resolve) =>
      setTimeout(resolve, 45 + Math.random() * 55),
    );
    if (Math.random() < 0.04) skipped++;
    else created++;
    onProgress(i + 1, total);
  }

  return { created, skipped };
}
