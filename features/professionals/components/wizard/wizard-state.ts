/**
 * Estado centralizado del wizard de creación de personas (profesional,
 * empleado o paciente). Define tipos, formulario, validación por modo/paso
 * y constantes compartidas por todos los pasos.
 */

import type { ProfessionalClinicAssignment } from "@/features/professionals/services/employees-service";

// --- Modo del wizard ---

export type Mode = "professional" | "employee" | "patient";

/** Parsea el parámetro de query ?mode= y valida que sea un modo conocido. */
export function parseMode(raw: string | undefined | null): Mode | null {
  if (raw === "professional" || raw === "employee" || raw === "patient")
    return raw;
  return null;
}

// --- Contexto de creación ---

export type WizardContext = "staff" | "patient";

/** Parsea el parámetro de query ?context= y valida que sea un contexto conocido. */
export function parseContext(
  raw: string | undefined | null,
): WizardContext | null {
  if (raw === "staff" || raw === "patient") return raw;
  return null;
}

/** Mapa de modos disponibles por contexto (sin filtrar permisos). */
const CONTEXT_MODES: Record<WizardContext, Mode[]> = {
  staff: ["professional", "employee"],
  patient: ["patient"],
};

/**
 * Devuelve los modos disponibles según el contexto y los permisos del usuario.
 * - context=staff → solo profesional y empleado
 * - context=patient → solo paciente
 * - sin contexto → todos los modos
 * Siempre aplica el gate de permisos por encima.
 */
export function getAvailableModes(
  context: WizardContext | null,
  hasPermission: (code: string) => boolean,
): Mode[] {
  const allModes: { mode: Mode; permission: string }[] = [
    { mode: "professional", permission: "Professionals.Create" },
    { mode: "employee", permission: "Employees.Create" },
    { mode: "patient", permission: "Patients.Create" },
  ];

  const candidates = context ? CONTEXT_MODES[context] : allModes.map((m) => m.mode);

  return allModes
    .filter((m) => candidates.includes(m.mode))
    .filter((m) => hasPermission(m.permission))
    .map((m) => m.mode);
}

/** Etiquetas de agrupación para el selector de modo. */
export interface ModeGroup {
  label: string;
  modes: Mode[];
}

/**
 * Agrupa los modos disponibles en secciones para el selector visual.
 * Equipo = profesional + empleado, Pacientes = paciente.
 * Si hay context explícito, no agrupa (el selector ya está filtrado).
 */
export function groupModes(
  modes: Mode[],
  context: WizardContext | null,
): ModeGroup[] {
  // Con contexto explícito, no necesitamos agrupar
  if (context) return [{ label: "", modes }];

  const team = modes.filter((m) => m === "professional" || m === "employee");
  const patients = modes.filter((m) => m === "patient");
  const groups: ModeGroup[] = [];

  if (team.length > 0) groups.push({ label: "Equipo", modes: team });
  if (patients.length > 0) groups.push({ label: "Pacientes", modes: patients });

  return groups;
}

// --- Horarios de atención ---

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DaySlot {
  enabled: boolean;
  start: string;
  end: string;
}

export interface ClinicSchedule {
  /** Horario personalizado vs el estándar de la plataforma (8:00–17:00). */
  enabled: boolean;
  /** Un solo rango horario aplicado a todos los días habilitados. */
  sameEveryDay: boolean;
  days: Record<DayKey, DaySlot>;
}

export const DAY_ORDER: DayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const DAY_LABELS: Record<DayKey, { short: string; full: string }> = {
  mon: { short: "Lun", full: "Lunes" },
  tue: { short: "Mar", full: "Martes" },
  wed: { short: "Mié", full: "Miércoles" },
  thu: { short: "Jue", full: "Jueves" },
  fri: { short: "Vie", full: "Viernes" },
  sat: { short: "Sáb", full: "Sábado" },
  sun: { short: "Dom", full: "Domingo" },
};

/** Mapeo DayKey → weekday numérico (1=lun..7=dom, formato backend). */
export const DAY_TO_WEEKDAY: Record<DayKey, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export function defaultDaySlot(enabled: boolean): DaySlot {
  return { enabled, start: "08:00", end: "17:00" };
}

export function defaultSchedule(): ClinicSchedule {
  return {
    enabled: false,
    sameEveryDay: true,
    days: {
      mon: defaultDaySlot(true),
      tue: defaultDaySlot(true),
      wed: defaultDaySlot(true),
      thu: defaultDaySlot(true),
      fri: defaultDaySlot(true),
      sat: defaultDaySlot(false),
      sun: defaultDaySlot(false),
    },
  };
}

// --- Estado del formulario ---

export interface FormState {
  // Identidad (compartido entre todos los modos)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Organización / clínicas (profesional + empleado)
  organizationId: string;
  clinicAssignments: ProfessionalClinicAssignment[];

  // Profesional
  professionalTypeId: string;
  specialtyIds: string[];
  /** Horarios por clínica asignada. */
  schedules: Record<string, ClinicSchedule>;

  // Empleado
  jobTitle: string;
  department: string;

  // Paciente
  documentNumber: string;
  birthDate: string;
  gender: string;

  // Compartido
  sendInvitation: boolean;
  mode: Mode | null;
}

export const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  organizationId: "",
  clinicAssignments: [],
  professionalTypeId: "",
  specialtyIds: [],
  schedules: {},
  jobTitle: "",
  department: "",
  documentNumber: "",
  birthDate: "",
  gender: "",
  sendInvitation: true,
  mode: null,
};

// --- Constantes de especialidades ---

export const SPECIALTY_CATEGORIES = [
  "Medicina",
  "Nutrición",
  "Salud mental",
  "Enfermería",
  "Terapia",
  "Coordinación",
  "Fitness",
];

// --- Definición de pasos por modo ---

export interface StepDef {
  key: string;
  label: string;
  hint: string;
}

export const PROFESSIONAL_STEPS: StepDef[] = [
  { key: "identity", label: "Datos básicos", hint: "Identidad y contacto" },
  {
    key: "clinics",
    label: "Clínicas y permisos",
    hint: "Organización y acceso",
  },
  { key: "profession", label: "Profesión", hint: "Tipo y especialidades" },
  {
    key: "schedule",
    label: "Horarios de atención",
    hint: "Disponibilidad para citas",
  },
  { key: "review", label: "Revisar y enviar", hint: "Confirmación final" },
];

export const EMPLOYEE_STEPS: StepDef[] = [
  { key: "identity", label: "Datos básicos", hint: "Identidad y contacto" },
  { key: "clinics", label: "Clínicas", hint: "Organización y sedes" },
  { key: "job", label: "Puesto", hint: "Cargo y departamento" },
  { key: "review", label: "Revisar y enviar", hint: "Confirmación final" },
];

export const PATIENT_STEPS: StepDef[] = [
  {
    key: "identity",
    label: "Datos básicos",
    hint: "Identidad del paciente",
  },
  { key: "clinic", label: "Clínica", hint: "Asignación de clínica" },
  { key: "review", label: "Revisar y enviar", hint: "Confirmación final" },
];

export function getSteps(mode: Mode): StepDef[] {
  switch (mode) {
    case "professional":
      return PROFESSIONAL_STEPS;
    case "employee":
      return EMPLOYEE_STEPS;
    case "patient":
      return PATIENT_STEPS;
  }
}

// --- Props comunes para los pasos ---

export interface StepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
  onBack: () => void;
}
