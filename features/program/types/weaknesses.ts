// --- Weakness Types (SPEC §21, D — espejo de WeaknessDtos.cs) ---

/** Tipo de transición válida para la debilidad (el estado 'open' no es transicionable). */
export type WeaknessTransitionStatus =
  | "acknowledged"
  | "in_intervention"
  | "resolved"
  | "dismissed";

/** Fila de la lista de debilidades del paciente / cola clínica. */
export interface Weakness {
  id: string;
  patientId: string;
  code: string;
  category: string;
  severity: string;
  title: string;
  description: string | null;
  detectedAt: string;
  metricId: string | null;
  indicatorValue: number | null;
  source: string;
  status: string;
  assignedTo: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Backend snake_case patient name (when available). */
  patient_name?: string | null;
}

/** Resultado paginado de una lista de debilidades. */
export interface PaginatedWeaknessesResult {
  data: Weakness[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
