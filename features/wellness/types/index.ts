// --- Nutrition Plan Types ---

export type NutritionPlanStatus = "Draft" | "Active" | "Completed" | "Archived";

export type MealType = "Desayuno" | "Almuerzo" | "Cena" | "Snack";

/** Día y comida de un plan de alimentación. */
export interface NutritionPlanDay {
  id: string;
  dayNumber: number;
  mealType: MealType;
  description: string | null;
  foods: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  waterMl: number | null;
  /** Meta de agua diaria (ml) — misma convención que dayNumber: todas las
   *  filas del día llevan el mismo valor. El backend la envía siempre. */
  dailyWaterMl: number | null;
  notes: string | null;
  sortOrder: number;
  mediaId: string | null;
}

/** Plan de alimentación (template o personalizado). */
export interface NutritionPlan {
  id: string;
  name: string;
  description: string | null;
  targetCondition: string | null;
  durationDays: number;
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  dailyFiberTarget: number | null;
  allergens: string | null;
  mealTiming: string | null;
  isTemplate: boolean;
  patientId: string | null;
  patientName: string | null;
  sourcePlanId: string | null;
  assignmentId?: string | null;
  status: NutritionPlanStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  days: NutritionPlanDay[];
}

/** Item del listado de planes (sin días embebidos). */
export interface NutritionPlanListItem {
  id: string;
  name: string;
  description: string | null;
  targetCondition: string | null;
  durationDays: number;
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  dailyFiberTarget: number | null;
  allergens: string | null;
  mealTiming: string | null;
  isTemplate: boolean;
  patientId: string | null;
  patientName: string | null;
  status: NutritionPlanStatus;
  createdAt: string;
}

/** Payload para crear/actualizar un día del plan. */
export interface NutritionPlanDayInput {
  dayNumber: number;
  mealType: MealType;
  description: string | null;
  foods: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  waterMl: number | null;
  /** Meta de agua diaria (ml) — misma convención que dayNumber: todas las
   *  filas del día llevan el mismo valor. Opcional: el backend usa 2000 si
   *  se omite o viene 0. */
  dailyWaterMl: number | null;
  notes: string | null;
  sortOrder: number;
  mediaId: string | null;
}

/** Payload para crear un plan. */
export interface CreateNutritionPlanInput {
  name: string;
  description: string | null;
  targetCondition: string | null;
  durationDays: number;
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  dailyFiberTarget: number | null;
  allergens: string | null;
  mealTiming: string | null;
  isTemplate: boolean;
  patientId: string | null;
  sourcePlanId: string | null;
  status: NutritionPlanStatus;
  days: NutritionPlanDayInput[] | null;
}

/** Payload para actualizar un plan. */
export interface UpdateNutritionPlanInput {
  name: string;
  description: string | null;
  targetCondition: string | null;
  durationDays: number;
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
  dailyFiberTarget: number | null;
  allergens: string | null;
  mealTiming: string | null;
  status: NutritionPlanStatus;
  days: NutritionPlanDayInput[] | null;
}

/** Filtros del listado de planes. */
export interface NutritionPlanFilters {
  search: string;
  isTemplate: "all" | "template" | "custom";
  status: "all" | NutritionPlanStatus;
}

/** Resultado paginado. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Exercise Routine Types ---

export type RoutineDifficulty = "Facil" | "Moderado" | "Dificil";

export type RoutineCategory = "Fuerza" | "Cardio" | "Flexibilidad" | "Mixta";

/** Ejercicio individual de una rutina. */
export interface RoutineExercise {
  id: string;
  name: string;
  description: string | null;
  sets: number | null;
  repetitions: number | null;
  restSeconds: number | null;
  durationSecs: number | null;
  weightKg: number | null;
  targetMuscle: string | null;
  equipment: string | null;
  tempo: string | null;
  rpe: number | null;
  tips: string | null;
  mediaId: string | null;
  sortOrder: number;
}

/** Rutina de ejercicio. */
export interface ExerciseRoutine {
  id: string;
  name: string;
  description: string | null;
  difficulty: RoutineDifficulty;
  estimatedMinutes: number | null;
  category: RoutineCategory;
  status: NutritionPlanStatus;
  targetMuscles: string | null;
  equipment: string | null;
  warmupNotes: string | null;
  cooldownNotes: string | null;
  mediaId: string | null;
  createdBy: string | null;
  assignmentId?: string | null;
  createdAt: string;
  updatedAt: string | null;
  exercises: RoutineExercise[];
}

/** Item del listado de rutinas. */
export interface ExerciseRoutineListItem {
  id: string;
  name: string;
  description: string | null;
  difficulty: RoutineDifficulty;
  estimatedMinutes: number | null;
  category: RoutineCategory;
  status: NutritionPlanStatus;
  targetMuscles: string | null;
  equipment: string | null;
  createdAt: string;
}

/** Payload para crear/actualizar ejercicio. */
export interface RoutineExerciseInput {
  name: string;
  description: string | null;
  sets: number | null;
  repetitions: number | null;
  restSeconds: number | null;
  durationSecs: number | null;
  weightKg: number | null;
  targetMuscle: string | null;
  equipment: string | null;
  tempo: string | null;
  rpe: number | null;
  tips: string | null;
  mediaId: string | null;
  sortOrder: number;
}

/** Payload para crear rutina. */
export interface CreateExerciseRoutineInput {
  name: string;
  description: string | null;
  difficulty: RoutineDifficulty;
  estimatedMinutes: number | null;
  category: RoutineCategory;
  status: NutritionPlanStatus;
  targetMuscles: string | null;
  equipment: string | null;
  warmupNotes: string | null;
  cooldownNotes: string | null;
  mediaId: string | null;
  patientId?: string;
  exercises: RoutineExerciseInput[] | null;
}

/** Payload para actualizar rutina. */
export interface UpdateExerciseRoutineInput {
  name: string;
  description: string | null;
  difficulty: RoutineDifficulty;
  estimatedMinutes: number | null;
  category: RoutineCategory;
  status: NutritionPlanStatus;
  targetMuscles: string | null;
  equipment: string | null;
  warmupNotes: string | null;
  cooldownNotes: string | null;
  mediaId: string | null;
  exercises: RoutineExerciseInput[] | null;
}

/** Filtros del listado de rutinas. */
export interface ExerciseRoutineFilters {
  search: string;
  status: "all" | NutritionPlanStatus;
  category: "all" | RoutineCategory;
}

// --- Routine Assignment Types ---

export type AssignmentFrequency = "Diaria" | "TresVecesSemana" | "Personalizada";
export type AssignmentStatus = "Active" | "Paused" | "Completed";

/** Asignación de rutina a paciente. */
export interface RoutineAssignment {
  id: string;
  patientId: string;
  patientName: string | null;
  routineId: string;
  routineName: string | null;
  startDate: string;
  endDate: string | null;
  frequency: AssignmentFrequency;
  status: AssignmentStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Payload para crear asignación de rutina. */
export interface CreateRoutineAssignmentInput {
  patientId: string;
  routineId: string;
  startDate: string;
  endDate: string | null;
  frequency: AssignmentFrequency;
  status: AssignmentStatus;
  notes: string | null;
}

/** Asignación de plan de alimentación a paciente. */
export interface NutritionPlanAssignment {
  id: string;
  patientId: string;
  patientName: string | null;
  planId: string;
  planName: string | null;
  startDate: string;
  endDate: string | null;
  status: AssignmentStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Payload para crear asignación de plan. */
export interface CreateNutritionPlanAssignmentInput {
  patientId: string;
  planId: string;
  startDate: string;
  endDate: string | null;
  status: AssignmentStatus;
  notes: string | null;
}

/** Asignación unificada (rutina o plan) para el listado. */
export interface UnifiedAssignment {
  id: string;
  type: "routine" | "nutrition";
  itemId: string; // ID de la rutina o del plan
  patientId: string;
  patientName: string | null;
  itemName: string | null; // nombre de la rutina o del plan
  startDate: string;
  endDate: string | null;
  frequency?: AssignmentFrequency; // solo rutinas
  status: AssignmentStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Payload para actualizar asignación. */
export interface UpdateRoutineAssignmentInput {
  startDate: string;
  endDate: string | null;
  frequency: AssignmentFrequency;
  status: AssignmentStatus;
  notes: string | null;
}

/** Filtros del listado de asignaciones. */
export interface RoutineAssignmentFilters {
  search: string;
  status: "all" | AssignmentStatus;
}

// --- Patient Picker Types (reutilizado para asignaciones) ---

export interface PatientListItem {
  id: string;
  medicalRecordNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  status: string;
}

// --- Generación con IA (wellness/plans/generate) ---

/** Respuesta del endpoint de generación con IA. `payload` es el JSON crudo
 *  del ai-service y viene en SNAKE_CASE. */
export interface GeneratePlanResponse {
  type: "nutrition" | "exercise";
  generatedAt: string;
  payload: Record<string, unknown>;
}

/** Payload de generación de plan de alimentación (snake_case, ai-service). */
export interface NutritionGeneratedPayload {
  name: string;
  description: string | null;
  target_condition: string | null;
  duration_days: number;
  daily_calorie_target: number | null;
  daily_protein_target: number | null;
  daily_carbs_target: number | null;
  daily_fat_target: number | null;
  daily_fiber_target: number | null;
  allergens: string | null;
  meal_timing: string | null;
  days: Array<{
    day_number: number;
    meal_type: string;
    description: string | null;
    foods: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
    water_ml: number | null;
    notes: string | null;
  }>;
}

/** Payload de generación de rutina de ejercicio (snake_case, ai-service). */
export interface ExerciseGeneratedPayload {
  name: string;
  description: string | null;
  difficulty: string;
  estimated_minutes: number | null;
  category: string;
  target_muscles: string | string[] | null;
  equipment: string | string[] | null;
  warmup_notes: string | null;
  cooldown_notes: string | null;
  exercises: Array<{
    name: string;
    description: string | null;
    sets: number | null;
    repetitions: number | null;
    rest_seconds: number | null;
    duration_secs: number | null;
    weight_kg: number | null;
    target_muscle: string | null;
    equipment: string | null;
    tempo: string | null;
    rpe: number | null;
    tips: string | null;
  }>;
}
