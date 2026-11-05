"use client";

import { CircleCheck, CircleAlert } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { NutritionCycle, NutritionFood } from "../types/nutrition";
import { cycleIsComplete, dayTotals, mealDefinitions } from "../lib/nutrition-calculations";
import { useNutritionNumber } from "./nutrition-shared";

export function NutritionVerification({ cycle, catalog }: { cycle: NutritionCycle; catalog: NutritionFood[] }) {
  const t = useT();
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const checks = [
    { label: "30 días del ciclo", ok: days.every((day) => cycle.meals.some((meal) => meal.dayNumber === day)) },
    { label: "4 comidas por día", ok: days.every((day) => mealDefinitions.every(({ type }) => cycle.meals.filter((meal) => meal.dayNumber === day && meal.mealType === type).length === 1)) },
    { label: "Alimentos y cantidades", ok: cycle.meals.length > 0 && cycle.meals.every((meal) => meal.items.length > 0 && meal.items.every((item) => Number.isFinite(item.grams) && item.grams > 0 && catalog.some((food) => food.id === item.foodId))) },
    { label: "Validación del borrador", ok: cycleIsComplete(cycle, catalog) },
  ];
  return <ul className="nutrition-verification" aria-label={t("Verificación automática")}>
    {checks.map(({ label, ok }) => <li key={label} data-valid={ok}><span className="flex min-w-0 items-center gap-2">{ok ? <CircleCheck className="size-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="size-4 shrink-0" aria-hidden="true" />}<span>{t(label)}</span></span><strong>{t(ok ? "Correcto" : "Revisar")}</strong></li>)}
  </ul>;
}

export function NutritionMonthEnergy({ cycle, catalog }: { cycle: NutritionCycle; catalog: NutritionFood[] }) {
  const t = useT();
  const format = useNutritionNumber();
  const target = Math.max(1, cycle.targets.kcal);
  const days = Array.from({ length: 30 }, (_, i) => {
    const meals = cycle.meals.filter((meal) => meal.dayNumber === i + 1);
    return { day: i + 1, kcal: dayTotals(meals, catalog).kcal, complete: meals.length === 4 };
  });
  const maximum = Math.max(target * 1.25, ...days.map((day) => day.kcal));
  return <section className="nutrition-month" aria-label={t("Energía de los 30 días")}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3>{t("Energía por día")}</h3><span className="nutrition-measure text-xs text-muted-foreground">{t("Meta diaria")}: {format(target, 0)} kcal</span></div>
    <div className="nutrition-month-plot"><div className="nutrition-month-target" style={{ bottom: `${target / maximum * 100}%` }} aria-hidden="true" />
      <ol>{days.map(({ day, kcal, complete }) => <li key={day} data-over-target={kcal > target || undefined} data-incomplete={!complete || undefined} title={t("Día {day}: {kcal} kcal", { day: String(day), kcal: format(kcal, 0) })} aria-label={t("Día {day}: {kcal} kcal", { day: String(day), kcal: format(kcal, 0) })}><span style={{ height: `${Math.max(1, kcal / maximum * 100)}%` }} /><small className="nutrition-measure">{day === 1 || day % 5 === 0 ? day : ""}</small></li>)}</ol>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">{t("La línea marca la meta diaria. Ámbar indica un exceso; revisa cada día antes de aprobar.")}</p>
  </section>;
}
