/**
 * Interfaces TypeScript que espejan los DTOs del backend para intervenciones.
 * Fuente: InterventionDtos.cs + InterventionStatus.cs
 */

/** Estados posibles de una intervención (ciclo de vida). */
export type InterventionStatus =
  | "detected"
  | "evaluated"
  | "recommended"
  | "accepted"
  | "in_progress"
  | "completed"
  | "reevaluation";

/** Severidad de la intervención. */
export type InterventionSeverity = "low" | "medium" | "high" | "critical";

/** Fila de una intervención (respuesta de GET /interventions). */
export interface Intervention {
  id: string;
  patientId: string;
  weaknessId: string | null;
  type: string;
  title: string;
  description: string | null;
  status: InterventionStatus;
  severity: string;
  assignedTo: string | null;
  recommendedAt: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  patientAction: string | null;
  result: string | null;
  xpAwardedTotal: number;
  createdAt: string;
  updatedAt: string | null;
}

/** Resultado paginado de intervenciones. */
export interface PaginatedInterventionsResult {
  data: Intervention[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Payload para actualizar estado de una intervención. */
export interface UpdateInterventionStatusInput {
  status: InterventionStatus;
  result?: string;
  assignedTo?: string;
}
