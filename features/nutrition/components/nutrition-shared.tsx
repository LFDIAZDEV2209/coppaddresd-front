"use client";

import { Sparkles } from "lucide-react";
import { useI18n, useT } from "@/providers/i18n-provider";
import type { NutritionQueueState, NutritionTargets, NutritionTotals } from "../types/nutrition";
import { formatNutritionDate } from "../lib/nutrition-formatters";
import { nutrientDefinitions } from "../lib/nutrition-calculations";

export function NutritionServiceNotice() {
  const t = useT();
  return <div className="nutrition-service-notice" role="note"><p>{t("El borrador conserva la versión publicada hasta que publiques los cambios.")}</p></div>;
}

export function NutritionStateChip({ state }: { state: NutritionQueueState }) {
  const t = useT();
  const labels: Record<NutritionQueueState, string> = { en_aprobacion: "Por publicar", borrador_ia: "Borrador IA", aprobado: "Publicado", devuelto: "Devuelto", por_renovar: "Por renovar", sin_plan: "Sin plan" };
  return <span className="nutrition-chip" data-status={state}>{state === "borrador_ia" && <Sparkles aria-hidden="true" className="size-3.5" />}{t(labels[state])}</span>;
}

export function useNutritionNumber() {
  const { lang } = useI18n();
  return (value: number, decimals = 1) => new Intl.NumberFormat(lang === "en" ? "en-US" : "es-CO", { maximumFractionDigits: decimals }).format(value);
}

export function useNutritionDate() {
  const { lang } = useI18n();
  return (value: string) => formatNutritionDate(value, lang === "en" ? "en-US" : "es-CO");
}

/** Conserva el signo real incluso por debajo de la precisión visible. */
export function useNutritionDeviation() {
  const t = useT();
  const format = useNutritionNumber();
  return (difference: number) => Math.abs(difference) > 0 && Math.abs(difference) < 0.1
    ? t(difference > 0 ? "Menos de {amount} kcal sobre la meta" : "Menos de {amount} kcal bajo la meta", { amount: format(0.1) })
    : `${difference > 0 ? "+" : ""}${format(difference)} kcal`;
}

export function NutritionNutrients({ totals }: { totals: NutritionTotals }) {
  const t = useT();
  const format = useNutritionNumber();
  return <dl className="nutrition-nutrient-strip">{nutrientDefinitions.map(({ key, label, unit }) => key === "waterGlasses" ? null : <div key={key}><dt>{t(label)}</dt><dd className="nutrition-measure">{format(totals[key])} {t(unit)}</dd></div>)}</dl>;
}

export function NutritionTargetsPanel({ targets, totals }: { targets: NutritionTargets; totals?: NutritionTotals }) {
  const t = useT();
  const format = useNutritionNumber();
  return <dl className="nutrition-targets">{nutrientDefinitions.map(({ key, label, unit }) => {
    const value = totals?.[key];
    const over = value != null && value > targets[key];
    return <div key={key} className="min-w-0" data-over-target={over || undefined}><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className="mt-2 nutrition-measure text-sm">{value === null ? t("Sin dato registrado") : value !== undefined ? t("{actual} de {target} {unit}", { actual: format(value), target: format(targets[key]), unit: t(unit) }) : `${format(targets[key])} ${t(unit)}`}</dd>{value !== null && value !== undefined && <><progress className="nutrition-progress mt-2" max={Math.max(1, targets[key])} value={Math.min(value, Math.max(1, targets[key]))} aria-label={t("{nutrient} respecto a la meta", { nutrient: t(label) })} />{over && <p className="mt-1 text-xs text-muted-foreground">{t(value - targets[key] < 0.1 ? "Menos de {amount} {unit} sobre la meta" : "{amount} {unit} sobre la meta", { amount: format(value - targets[key] < 0.1 ? 0.1 : value - targets[key]), unit: t(unit) })}</p>}</>}</div>;
  })}</dl>;
}

/** Sin fechas completas no hay separador; nunca se representa una flecha vacía. */
export function NutritionValidity({ start, end }: { start: string | null; end: string | null }) {
  const t = useT();
  const date = useNutritionDate();
  return <span className="nutrition-measure inline-flex flex-wrap items-center gap-2"><span>{start ? date(start) : t("Sin definir")}</span>{start && end && <span aria-hidden="true">→</span>}<span>{end ? date(end) : t("Sin definir")}</span></span>;
}
