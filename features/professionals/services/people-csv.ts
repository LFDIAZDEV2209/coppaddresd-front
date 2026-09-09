/**
 * Helpers de importación masiva unificada de personas por CSV.
 * Reemplaza los helpers separados de empleados, pacientes y usuarios.
 *
 * Parser quote-aware con separador ";" y strip de BOM.
 * Columnas: tipo;nombre;apellido;email;documento;profesion;clinicas;estado
 *
 * Basado en la estructura de patients-csv.ts pero extiende a multi-tipo.
 */

export type PersonType = "profesional" | "empleado" | "paciente" | "usuario";

export interface ParsedClinic {
  code: string;
  roleName?: string;
}

export interface PeopleCsvRow {
  line: number;
  tipo: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  profesion: string;
  clinicasRaw: string;
  parsedClinics: ParsedClinic[];
  estado: string;
  errors: string[];
}

export interface PeoplePreview {
  valid: number;
  invalid: number;
  /** Cantidad de filas con emails duplicados (se contabiliza dentro de invalid). */
  duplicates: number;
}

// --- Constantes ---

const VALID_TYPES: PersonType[] = [
  "profesional",
  "empleado",
  "paciente",
  "usuario",
];
const VALID_STATUSES_STAFF = ["activo", "invitado", "inactivo"];
const VALID_STATUSES_PATIENT = ["activo", "inactivo"];

// --- Plantilla CSV ---

/** Encabezados + 4 filas de ejemplo (una por tipo). */
export function buildPeopleTemplateCsv(): string {
  const lines = [
    "tipo;nombre;apellido;email;documento;profesion;clinicas;estado",
    "profesional;María;González;maria.gonzalez@ejemplo.com;;Physical Therapist (DPT);central:Professional;activo",
    "empleado;Juan;Pérez;juan.perez@ejemplo.com;;;;activo",
    "paciente;Ana;Torres;ana.torres@ejemplo.com;10247381;;central;activo",
    "usuario;Lucho;Diaz;lucho.diaz@ejemplo.com;;central:Receptionist;;activo",
  ];
  return lines.join("\n");
}

/** Descarga la plantilla CSV de personas en el navegador. */
export function downloadPeopleTemplateCsv(): void {
  const blob = new Blob(["\uFEFF" + buildPeopleTemplateCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla-personas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// --- Parser CSV ---

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

/**
 * Parsea el CSV unificado de personas (separador ";").
 * Columnas: tipo(0);nombre(1);apellido(2);email(3);documento(4);
 *           profesion(5);clinicas(6);estado(7)
 *
 * Las clinicas se parsean en un array de pares {code, roleName?}.
 */
export function parsePeopleCsv(raw: string): PeopleCsvRow[] {
  const rows: PeopleCsvRow[] = [];
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const clinicasRaw = (cells[6] ?? "").trim();
    rows.push({
      line: i + 1,
      tipo: (cells[0] ?? "").trim().toLowerCase(),
      nombre: (cells[1] ?? "").trim(),
      apellido: (cells[2] ?? "").trim(),
      email: (cells[3] ?? "").trim(),
      documento: (cells[4] ?? "").trim(),
      profesion: (cells[5] ?? "").trim(),
      clinicasRaw,
      parsedClinics: parseClinicas(clinicasRaw),
      estado: (cells[7] ?? "").trim().toLowerCase(),
      errors: [],
    });
  }
  return rows;
}

/**
 * Parsea la celda de clínicas en pares `codigo:Rol` separados por coma.
 * Ejemplo: "central:Professional, norte:Receptionist"
 * Para paciente: "central" (sin rol, solo código).
 */
function parseClinicas(raw: string): ParsedClinic[] {
  if (!raw) return [];
  const pairs: ParsedClinic[] = [];
  // Dividir por coma y parsear cada fragmento
  const fragments = raw.split(",");
  for (const frag of fragments) {
    const trimmed = frag.trim();
    if (!trimmed) continue;
    // Intentar matchear código:rol
    const match = trimmed.match(/^([^:]+?)(?:\s*:\s*(.+))?$/);
    if (match) {
      const code = match[1]?.trim() ?? "";
      const roleName = match[2]?.trim() || undefined;
      if (code) {
        pairs.push({ code, roleName });
      }
    }
  }
  return pairs;
}

// --- Validación ---

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida las filas parseadas según reglas de negocio:
 * - nombre y apellido requeridos
 * - email requerido para profesional/empleado/usuario, opcional para paciente
 * - email formato regex
 * - email duplicado en archivo (solo filas que requieren email)
 * - profesion requerida para profesional
 * - tipo válido
 * - clinicas parseables con la regex de pares
 * - paciente solo puede tener un código y sin rol
 * - estado válido para su tipo
 */
export function validatePeopleRows(rows: PeopleCsvRow[]): PeoplePreview {
  const seenEmails = new Map<string, number>();
  let valid = 0;
  let invalid = 0;
  let duplicates = 0;

  for (const row of rows) {
    row.errors = [];
    const tipo = row.tipo;

    // Tipo
    if (!tipo) {
      row.errors.push("Tipo obligatorio");
    } else if (!VALID_TYPES.includes(tipo as PersonType)) {
      row.errors.push(`Tipo inválido: ${tipo}`);
    }

    // Nombre y apellido
    if (!row.nombre) row.errors.push("Nombre obligatorio");
    if (!row.apellido) row.errors.push("Apellido obligatorio");

    // Email
    const emailRequires = tipo === "profesional" || tipo === "empleado" || tipo === "usuario";
    const email = row.email.toLowerCase();
    if (emailRequires && !email) {
      row.errors.push("Email obligatorio");
    } else if (email) {
      if (!EMAIL_PATTERN.test(email)) {
        row.errors.push("Email inválido");
      } else if (seenEmails.has(email)) {
        row.errors.push("Email duplicado en el archivo");
        duplicates++;
      } else {
        seenEmails.set(email, row.line);
      }
    }

    // Profesión: requerida para profesional
    if (tipo === "profesional" && !row.profesion) {
      row.errors.push("Profesión obligatoria");
    }

    // Clínicas
    if (tipo === "paciente") {
      // Paciente: solo puede tener un código y sin rol
      if (row.parsedClinics.length > 1) {
        row.errors.push("El paciente lleva un solo código de clínica y sin rol");
      } else if (row.parsedClinics.length === 1 && row.parsedClinics[0]?.roleName) {
        row.errors.push("El paciente lleva un solo código de clínica y sin rol");
      }
    } else if (tipo === "profesional" || tipo === "empleado" || tipo === "usuario") {
      // Para staff/usuario: si hay clínicas, cada par debe tener código Y rol
      if (row.clinicasRaw) {
        for (const pair of row.parsedClinics) {
          if (!pair.roleName) {
            row.errors.push(`La clínica ${pair.code} requiere un rol`);
          }
        }
        // Validar formato de la celda cruda con regex
        const pairPattern = /^\s*([^:,:\s]+)\s*:\s*([^,]+?)\s*(,|$)/;
        const fragments = row.clinicasRaw.split(",");
        for (const frag of fragments) {
          const trimmed = frag.trim();
          if (!trimmed) continue;
          if (!pairPattern.test(trimmed)) {
            row.errors.push(`Clínicas inválidas: ${trimmed}`);
          }
        }
      }
    }

    // Estado
    const estado = row.estado || "invitado"; // default invitado para staff
    if (tipo === "paciente") {
      if (!VALID_STATUSES_PATIENT.includes(estado)) {
        row.errors.push(`Estado inválido: ${estado}`);
      } else {
        row.estado = estado;
      }
    } else if (tipo === "profesional" || tipo === "empleado" || tipo === "usuario") {
      if (!VALID_STATUSES_STAFF.includes(estado)) {
        row.errors.push(`Estado inválido: ${estado}`);
      } else {
        row.estado = estado;
      }
    } else {
      // Tipo desconocido: validar con la lista de staff como fallback
      if (!VALID_STATUSES_STAFF.includes(estado)) {
        row.errors.push(`Estado inválido: ${estado}`);
      } else {
        row.estado = estado;
      }
    }

    if (row.errors.length > 0) {
      invalid++;
    } else {
      valid++;
    }
  }

  return { valid, invalid, duplicates };
}
