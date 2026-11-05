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
  targets?: NutritionTargetsWire;
  meals?: NutritionMealWire[];
  instructions?: string;
  confirmManualEdits?: boolean;
  sourceDay?: number;
}

/**
 * Contratos de lectura pendientes de confirmar con backend Ola 3.
 * No se reconstruye la bandeja mediante una consulta de prescripciones por paciente.
 * Respuesta ausente o incompatible -> error visible, nunca fallback ni datos clínicos.
 */
export interface NutritionQueueWire {
  items: {
    patientId: string; patientName: string; patientDocument: string | null;
    prescription: null | {
      id: string; state: NutritionViewWire["state"]; version: number; dailyKcal: number | null;
      criticalAlertCount: number; aiAssisted: boolean; provisional: boolean; endDate: string | null;
    };
  }[];
  total: number; page: number; pageSize: number; totalPages: number;
  counts: Record<"all" | "borrador_ia" | "en_aprobacion" | "aprobado" | "devuelto" | "por_renovar" | "sin_plan", number>;
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
/** Nombres confirmados en NutritionFoodItem.cs; ruta del catálogo aún pendiente. */
export interface NutritionFoodWire {
  id: string; name: string; foodGroup: string;
  calories100: number; carbs100: number; protein100: number; fat100: number; fiber100: number;
  unitSingular: string | null; unitPlural: string | null;
  gramsPerUnit: number | null; unitStep: number | null;
}
