import type { NutritionCycle, NutritionFood, NutritionMeal, NutritionMealItem, NutritionTargets } from "../types/nutrition";

export const mealDefinitions = [
  { type: "desayuno", label: "Desayuno", time: "07:00" },
  { type: "almuerzo", label: "Almuerzo", time: "12:00" },
  { type: "merienda", label: "Merienda", time: "15:30" },
  { type: "cena", label: "Cena", time: "19:00" },
] as const;

export const nutrientDefinitions: { key: keyof NutritionTargets; label: string; unit: string }[] = [
  { key: "kcal", label: "Energía", unit: "kcal" },
  { key: "carbsG", label: "Carbohidratos", unit: "g" },
  { key: "proteinG", label: "Proteína", unit: "g" },
  { key: "fatG", label: "Grasas", unit: "g" },
  { key: "fiberG", label: "Fibra", unit: "g" },
  { key: "waterGlasses", label: "Agua", unit: "vasos" },
];

export const emptyTotals = (): NutritionTargets => ({ kcal: 0, carbsG: 0, proteinG: 0, fatG: 0, fiberG: 0, waterGlasses: 0 });

/** Vista previa por catálogo; las validaciones definitivas pertenecen al backend. */
export function itemTotals(food: NutritionFood, grams: number): NutritionTargets {
  const factor = grams / 100;
  const { carbsG, proteinG, fatG, fiberG } = food.per100g;
  return { carbsG: carbsG * factor, proteinG: proteinG * factor, fatG: fatG * factor, fiberG: fiberG * factor, kcal: (4 * carbsG + 4 * proteinG + 9 * fatG) * factor, waterGlasses: 0 };
}

export function mealTotals(meal: NutritionMeal, catalog: NutritionFood[]): NutritionTargets {
  const total = emptyTotals();
  for (const item of meal.items) {
    const food = catalog.find((entry) => entry.id === item.foodId);
    if (!food) continue;
    const nutrients = itemTotals(food, item.grams);
    for (const key of Object.keys(total) as (keyof NutritionTargets)[]) total[key] += nutrients[key];
  }
  total.waterGlasses = meal.waterGlasses;
  return total;
}

export function dayTotals(meals: NutritionMeal[], catalog: NutritionFood[]): NutritionTargets {
  return meals.reduce((total, meal) => {
    const nutrients = mealTotals(meal, catalog);
    for (const key of Object.keys(total) as (keyof NutritionTargets)[]) total[key] += nutrients[key];
    return total;
  }, emptyTotals());
}

export function recalculateCycle(cycle: NutritionCycle, catalog: NutritionFood[]): NutritionCycle {
  return { ...cycle, meals: cycle.meals.map((meal) => ({ ...meal, totals: mealTotals(meal, catalog) })) };
}

export function replicateDay(cycle: NutritionCycle, day: number): NutritionCycle {
  const selected = cycle.meals.filter((meal) => meal.dayNumber === day);
  return { ...cycle, meals: Array.from({ length: 30 }, (_, index) => selected.map((meal) => ({ ...structuredClone(meal), id: crypto.randomUUID(), dayNumber: index + 1, items: meal.items.map((item): NutritionMealItem => ({ ...item, id: crypto.randomUUID() })) }))).flat() };
}

export function cycleIsComplete(cycle: NutritionCycle, catalog: NutritionFood[]): boolean {
  return !cycle.menusOutdated && cycle.meals.length === 120 && Array.from({ length: 30 }, (_, index) => index + 1).every((day) => mealDefinitions.every(({ type, time }) => {
    const matches = cycle.meals.filter((meal) => meal.dayNumber === day && meal.mealType === type);
    return matches.length === 1 && matches[0].localTime === time && Number.isFinite(matches[0].waterGlasses) && matches[0].waterGlasses >= 0 && matches[0].items.length > 0 && matches[0].items.every((item) => Number.isFinite(item.grams) && item.grams >= 1 && item.grams <= 1000 && catalog.some((food) => food.id === item.foodId));
  }));
}
