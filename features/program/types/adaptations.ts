// --- Adaptation Types (SPEC §7.7 — espejo de AdaptationRecommendationDto) ---

/** Estado de la recomendación (enum backend serializado como string). */
export type AdaptationStatus =
  "Pending" | "Approved" | "Rejected" | "Applied" | "Superseded";

/** Tipo de adaptación propuesta al programa. */
export type AdaptationKind =
  | "DifficultyChange"
  | "LevelChange"
  | "TemplateSwap"
  | "RoutineContentRefresh"
  | "NutritionPlanRefresh"
  | "MediaRotation";

/** Tipo de entidad objetivo de la recomendación. */
export type AdaptationTargetEntityType =
  | "WeeklyDayTemplates"
  | "ProgramEnrollments"
  | "NutritionPlans"
  | "ExerciseRoutines"
  | "MediaProgressions";

/** Acción de decisión clínica. */
export type AdaptationDecisionAction = "Approve" | "Reject" | "Apply";

/** Fila de la lista de recomendaciones de adaptación. */
export interface Adaptation {
  id: string;
  enrollmentId: string;
  kind: AdaptationKind;
  targetEntityType: AdaptationTargetEntityType;
  targetEntityId: string;
  payload: Record<string, unknown>;
  reason: string;
  status: AdaptationStatus;
  requiresApproval: boolean;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** Resultado paginado del listado de adaptaciones. */
export interface PaginatedAdaptationsResult {
  data: Adaptation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
