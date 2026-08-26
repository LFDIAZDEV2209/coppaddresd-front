import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  GeneratePlanResponse,
  NutritionGeneratedPayload,
  ExerciseGeneratedPayload,
  RoutineCategory,
  RoutineDifficulty,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/wellness/plans/generate`;

/**
 * Genera un plan de alimentación o rutina de ejercicio con IA para un paciente.
 * El `payload` de la respuesta viene en SNAKE_CASE (JSON crudo del ai-service).
 */
export async function generatePlan(
  patientId: string,
  type: "nutrition" | "exercise",
): Promise<GeneratePlanResponse> {
  // La generación con IA puede tardar hasta ~45s. El backend ai-service tiene
  // su propio timeout de 60s: el cliente espera 90s y es el servidor quien
  // decide abortar (devuelve 504/503 que apiFetch mapea a "unavailable").
  // No bajar este valor por debajo del timeout del backend.
  return apiFetch<GeneratePlanResponse>(PATH, {
    method: "POST",
    body: JSON.stringify({ patientId, type }),
    timeoutMs: 90_000,
  });
}

// --- Shapes locales (duplicados a propósito: no acoplar el servicio a los forms) ---

export interface DayMealData {
  description: string;
  foods: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  waterMl: string;
  notes: string;
}

export interface ExerciseFormData {
  name: string;
  description: string;
  sets: string;
  repetitions: string;
  restSeconds: string;
  durationSecs: string;
  weightKg: string;
  targetMuscle: string;
  equipment: string;
  tempo: string;
  rpe: string;
  tips: string;
  notes: string;
}

/** Valores mapeados para el form de plan de alimentación (camelCase, strings). */
export interface NutritionGeneratedFormValues {
  name: string;
  description: string;
  targetCondition: string;
  durationDays: string;
  dailyCalorieTarget: string;
  dailyProteinTarget: string;
  dailyCarbsTarget: string;
  dailyFatTarget: string;
  dailyFiberTarget: string;
  allergens: string;
  mealTiming: string;
  days: Record<string, DayMealData>;
}

/** Valores mapeados para el form de rutina de ejercicio (camelCase, strings). */
export interface ExerciseGeneratedFormValues {
  name: string;
  description: string;
  difficulty: RoutineDifficulty;
  estimatedMinutes: string;
  category: RoutineCategory;
  targetMuscles: string;
  equipment: string;
  warmupNotes: string;
  cooldownNotes: string;
  exercises: ExerciseFormData[];
}

// --- Helpers de normalización (el JSON crudo del ai-service puede variar) ---

const MEALS = ["Desayuno", "Almuerzo", "Cena", "Snack"] as const;
type MealType = (typeof MEALS)[number];

const MEAL_TYPE_ALIASES: Record<string, MealType> = {
  desayuno: "Desayuno",
  breakfast: "Desayuno",
  almuerzo: "Almuerzo",
  lunch: "Almuerzo",
  comida: "Almuerzo",
  cena: "Cena",
  dinner: "Cena",
  snack: "Snack",
  merienda: "Snack",
};

const DIFFICULTY_ALIASES: Record<string, RoutineDifficulty> = {
  facil: "Facil",
  easy: "Facil",
  beginner: "Facil",
  principiante: "Facil",
  moderado: "Moderado",
  moderate: "Moderado",
  medium: "Moderado",
  intermediate: "Moderado",
  intermedio: "Moderado",
  dificil: "Dificil",
  hard: "Dificil",
  difficult: "Dificil",
  advanced: "Dificil",
  avanzado: "Dificil",
};

const CATEGORY_ALIASES: Record<string, RoutineCategory> = {
  fuerza: "Fuerza",
  strength: "Fuerza",
  power: "Fuerza",
  cardio: "Cardio",
  flexibilidad: "Flexibilidad",
  flexibility: "Flexibilidad",
  stretching: "Flexibilidad",
  movilidad: "Flexibilidad",
  mixta: "Mixta",
  mixed: "Mixta",
  combined: "Mixta",
  fullbody: "Mixta",
};

/** Normaliza una clave (minúsculas + sin acentos) para comparar alias. */
const normalizeKey = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Convierte un valor crudo a string (null/undefined → ""). */
const toStr = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

/** Une listas (arrays) o texto en un solo string separado por coma. */
const toList = (value: unknown): string =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : toStr(value);

/** Mapea el tipo de comida del payload a los 4 tipos del form. */
const normalizeMealType = (value: unknown): MealType => {
  const key = normalizeKey(toStr(value));
  return MEAL_TYPE_ALIASES[key] ?? "Snack";
};

/** Mapea la dificultad del payload al enum del form (fallback: Moderado). */
const normalizeDifficulty = (value: unknown): RoutineDifficulty =>
  DIFFICULTY_ALIASES[normalizeKey(toStr(value))] ?? "Moderado";

/** Mapea la categoría del payload al enum del form (fallback: Mixta). */
const normalizeCategory = (value: unknown): RoutineCategory =>
  CATEGORY_ALIASES[normalizeKey(toStr(value))] ?? "Mixta";

// --- Mapeadores snake_case → estado del form ---

/**
 * Convierte el payload generado por IA (snake_case) al estado del form de
 * plan de alimentación (camelCase). Los días se completan con una estructura
 * base vacía para todos los días × comidas, igual que el form.
 */
export function mapNutritionPayloadToForm(
  payload: NutritionGeneratedPayload,
): NutritionGeneratedFormValues {
  const duration = Math.min(
    Math.max(Math.trunc(Number(payload.duration_days)) || 7, 1),
    365,
  );

  const emptyDayMeal = (): DayMealData => ({
    description: "",
    foods: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
    fiberG: "",
    waterMl: "",
    notes: "",
  });

  // Base vacía para todos los días y comidas
  const days: Record<string, DayMealData> = {};
  for (let d = 1; d <= duration; d++) {
    for (const meal of MEALS) {
      days[`${d}-${meal}`] = emptyDayMeal();
    }
  }

  // Rellenar con los días generados por IA
  for (const day of payload.days ?? []) {
    const dayNumber = Math.min(
      Math.max(Math.trunc(Number(day.day_number)) || 1, 1),
      duration,
    );
    const meal = normalizeMealType(day.meal_type);
    const key = `${dayNumber}-${meal}`;
    days[key] = {
      description: toStr(day.description),
      foods: toStr(day.foods),
      calories: toStr(day.calories),
      proteinG: toStr(day.protein_g),
      carbsG: toStr(day.carbs_g),
      fatG: toStr(day.fat_g),
      fiberG: toStr(day.fiber_g),
      waterMl: toStr(day.water_ml),
      notes: toStr(day.notes),
    };
  }

  return {
    name: toStr(payload.name),
    description: toStr(payload.description),
    targetCondition: toStr(payload.target_condition),
    durationDays: String(duration),
    dailyCalorieTarget: toStr(payload.daily_calorie_target),
    dailyProteinTarget: toStr(payload.daily_protein_target),
    dailyCarbsTarget: toStr(payload.daily_carbs_target),
    dailyFatTarget: toStr(payload.daily_fat_target),
    dailyFiberTarget: toStr(payload.daily_fiber_target),
    allergens: toStr(payload.allergens),
    mealTiming: toStr(payload.meal_timing),
    days,
  };
}

/**
 * Convierte el payload generado por IA (snake_case) al estado del form de
 * rutina de ejercicio (camelCase).
 */
export function mapExercisePayloadToForm(
  payload: ExerciseGeneratedPayload,
): ExerciseGeneratedFormValues {
  return {
    name: toStr(payload.name),
    description: toStr(payload.description),
    difficulty: normalizeDifficulty(payload.difficulty),
    estimatedMinutes: toStr(payload.estimated_minutes),
    category: normalizeCategory(payload.category),
    targetMuscles: toList(payload.target_muscles),
    equipment: toList(payload.equipment),
    warmupNotes: toStr(payload.warmup_notes),
    cooldownNotes: toStr(payload.cooldown_notes),
    exercises: (payload.exercises ?? []).map((ex) => ({
      name: toStr(ex.name),
      description: toStr(ex.description),
      sets: toStr(ex.sets),
      repetitions: toStr(ex.repetitions),
      restSeconds: toStr(ex.rest_seconds),
      durationSecs: toStr(ex.duration_secs),
      weightKg: toStr(ex.weight_kg),
      targetMuscle: toStr(ex.target_muscle),
      equipment: toStr(ex.equipment),
      tempo: toStr(ex.tempo),
      rpe: toStr(ex.rpe),
      tips: toStr(ex.tips),
      // El payload del ai-service no trae notas por ejercicio
      notes: "",
    })),
  };
}