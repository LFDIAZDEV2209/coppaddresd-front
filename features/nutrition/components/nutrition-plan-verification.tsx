"use client";

import { CircleCheck, CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { useT } from "@/providers/i18n-provider";
import type { NutritionCycle, NutritionFood } from "../types/nutrition";
import { cycleIsComplete, dayTotals, mealDefinitions } from "../lib/nutrition-calculations";
import { useNutritionNumber, useNutritionDeviation } from "./nutrition-shared";

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
  const deviation = useNutritionDeviation();
  const [selectedDay, setSelectedDay] = useState(1);
  const selectId = useId();
  const target = Math.max(1, cycle.targets.kcal);
  const days = Array.from({ length: 30 }, (_, i) => {
    const meals = cycle.meals.filter((meal) => meal.dayNumber === i + 1);
    return { day: i + 1, kcal: dayTotals(meals, catalog).kcal, complete: meals.length === 4 };
  });
  const maximum = Math.max(target * 1.25, ...days.map((day) => day.kcal));
  const selected = days[selectedDay - 1];
  const selectDay = (day: number, focus = false) => {
    const next = Math.max(1, Math.min(30, day));
    setSelectedDay(next);
    if (focus) document.getElementById(`${selectId}-bar-${next}`)?.focus();
  };
  return <section className="nutrition-month" aria-label={t("Energía de los 30 días")}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3>{t("Energía por día")}</h3><span className="nutrition-measure text-xs text-muted-foreground">{t("Meta diaria")}: {format(target)} kcal</span></div>
    <div className="nutrition-month-plot"><div className="nutrition-month-target" style={{ bottom: `${target / maximum * 100}%` }} aria-hidden="true" />
      <ol>{days.map(({ day, kcal, complete }) => <li key={day} data-over-target={kcal > target || undefined} data-incomplete={!complete || undefined}><button id={`${selectId}-bar-${day}`} type="button" aria-pressed={selectedDay === day} tabIndex={selectedDay === day ? 0 : -1} aria-label={t("Día {day}: {kcal} kcal", { day: String(day), kcal: format(kcal) })} onClick={() => selectDay(day)} onKeyDown={(event) => { const next = event.key === "ArrowRight" ? day + 1 : event.key === "ArrowLeft" ? day - 1 : event.key === "Home" ? 1 : event.key === "End" ? 30 : null; if (next !== null) { event.preventDefault(); selectDay(next, true); } }}><span style={{ height: `${Math.max(1, kcal / maximum * 100)}%` }} /></button><small className="nutrition-measure">{day === 1 || day % 5 === 0 ? day : ""}</small></li>)}</ol>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">{t("La línea marca la meta diaria. Ámbar indica un exceso; comprueba las porciones de cada día.")}</p>
    <div className="nutrition-month-inspector"><label htmlFor={selectId} className="text-xs font-medium">{t("Consultar día")}</label><select id={selectId} className="nutrition-select nutrition-measure" value={selectedDay} onChange={(event) => selectDay(Number(event.target.value))}>{days.map(({ day }) => <option key={day} value={day}>{t("Día {day}", { day: String(day) })}</option>)}</select><output aria-live="polite" className="nutrition-measure" data-over-target={selected.kcal > target || undefined}>{t("{kcal} kcal · meta {target} kcal · desviación {difference}", { kcal: format(selected.kcal), target: format(target), difference: deviation(selected.kcal - target) })}</output></div>
  </section>;
}
