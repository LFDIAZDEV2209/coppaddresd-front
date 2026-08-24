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
  isTemplate: boolean;
  patientId: string | null;
  patientName: string | null;
  sourcePlanId: string | null;
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
  mediaId: string | null;
  createdBy: string | null;
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
  mediaId: string | null;
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
