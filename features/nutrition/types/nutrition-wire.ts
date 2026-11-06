/** Contratos confirmados en NutritionCaseContracts.cs / NutritionController.cs. */
export interface NutritionTargetsWire {
  k: number; c: number; p: number; f: number; fi: number; vasos: number;
  bmr: number; tdee: number; deficit: number; floor: number; fase: string;
  metaKg: number; kgLeft: number; wkKg: number; semanas: number;
}
export interface NutritionMealWire {
  dayNumber: number;
  mealType: "des" | "alm" | "mer" | "cen";
  menuName: string | null;
  items: { foodItemId: string; grams: number; notes: string | null }[];
  notes: string | null;
  waterMl: number | null;
}
export interface NutritionViewWire {
  id: string; patientId: string; cycleId: string; version: number; revision: number;
  state: "borrador_ia" | "en_aprobacion" | "aprobado" | "devuelto" | "por_renovar";
  provisional: boolean; isPublished: boolean; menusOutdated: boolean; manualEditsConfirmed: boolean;
  startDate: string | null; endDate: string | null; targets: NutritionTargetsWire;
  instructions: string | null; instructionsEn: string | null; narrativeSource: string;
  missingData: string[]; alerts: { s: "crit" | "warn" | "info"; m: string; tec: boolean }[];
  meals: NutritionMealWire[]; canRegenerate: boolean;
  createdBy: string; approvedBy: string | null; approvedAt: string | null;
}
export interface NutritionEventWire {
  id: string; prescriptionId: string; actorUserId: string; occurredAt: string;
  action: string; revision: number; comment: string | null;
  criticalCount: number; criticalConfirmed: boolean; autoApproved: boolean; snapshotJson: string;
}
export interface NutritionEditWire {
  instructionsEn?: string;
  targets?: NutritionTargetsWire;
  meals?: NutritionMealWire[];
  instructions?: string;
  confirmManualEdits?: boolean;
  sourceDay?: number;
}

/**
 * Bandeja /inbox y catálogo /foods pendientes de confirmar en backend Ola 4B.
 * No se reconstruye la bandeja mediante una consulta de prescripciones por paciente.
 * Respuesta ausente o incompatible -> error visible, nunca fallback ni datos clínicos.
 */
export interface NutritionQueueWire {
  // TODO(backend 8.3/8.4): integrar solo tras confirmar respuesta y nesting.
  // generationState: "pending" | "generating" | "ready" | "failed" | null;
  // generationFallback: boolean;
  // generationReason: string | null;
  // generationUpdatedAt: string | null;
  // hasPublishedToday: boolean;
  // publishedCycleStart: string | null;
  // publishedCycleEnd: string | null;
  // latestDraftState: NutritionViewWire["state"] | null;
  // hasFutureDraft: boolean;
  items: {
    patientId: string; patientName: string; state: NutritionViewWire["state"] | "sin_plan";
    prescription: null | {
      id: string; state: NutritionViewWire["state"]; version: number; revision: number; k: number | null;
      criticalAlertCount: number; provisional: boolean; startDate: string | null; endDate: string | null; isPublished: boolean;
    };
  }[];
  total: number; page: number; pageSize: number;
}
export interface NutritionPatientWire {
  patientId: string; patientName: string; patientDocument: string | null;
  nextPendingPatientId: string | null;
  profile: {
    age: number | null; sex: "female" | "male" | null; bmi: number | null; hba1c: number | null;
    movement: string | null; adherence: string | null; cardiometabolicRisk: string | null;
    completedTests: number | null; provisionalFields: string[]; programPatientId: string | null;
    weightKg?: number | null; heightCm?: number | null; birthDate?: string | null;
  };
  prescriptionId: string | null;
  publishedPrescriptionId: string | null;
  timeZone: string | null;
}
/** Proyección del DTO existente GET /api/v1/patients/{id}; no es ficha de Nutrition. */
export interface NutritionIdentityWire {
  id: string; firstName: string; middleName: string | null; lastName: string;
  documentNumber: string | null; dateOfBirth: string | null; gender: string | null;
}
/** GET /nutrition/foods: NutritionFoodDto; distinto de la entidad persistida. */
export interface NutritionFoodWire {
  code: string; name: string; group: string; role: "C" | "P" | "F" | "V";
  kcal100: number; carbs100: number; protein100: number; fat100: number; fiber100: number;
  householdEquivalent: { unitSingular: string; unitPlural: string; gramsPerUnit: number; unitStep: number } | null;
}
