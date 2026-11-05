"use client";

import { Sparkles } from "lucide-react";
import { useI18n, useT } from "@/providers/i18n-provider";
import { nutritionUsesMocks } from "../services/nutrition-service";
import type { NutritionQueueState, NutritionTargets } from "../types/nutrition";
import { nutrientDefinitions } from "../lib/nutrition-calculations";

export function NutritionDemoNotice() {
  const t = useT();
  if (!nutritionUsesMocks) return null;
  return <div className="nutrition-demo-notice" role="note"><p>{t("Vista de demostración · Pacientes y metas ficticios. No se realizan cambios clínicos.")}</p><p className="mt-1 text-xs">{t("Los cambios se conservan solo durante esta sesión demo. Recargar reinicia los datos.")}</p></div>;
}

export function NutritionStateChip({ state }: { state: NutritionQueueState }) {
  const t = useT();
  const labels: Record<NutritionQueueState, string> = { en_aprobacion: "Por aprobar", borrador_ia: "Borrador IA", aprobado: "Aprobado", devuelto: "Devuelto", por_renovar: "Por renovar", sin_plan: "Sin plan" };
  return <span className="nutrition-chip" data-status={state}>{state === "borrador_ia" && <Sparkles aria-hidden="true" className="size-3.5" />}{t(labels[state])}</span>;
}

export function useNutritionNumber() {
  const { lang } = useI18n();
  return (value: number, decimals = 1) => new Intl.NumberFormat(lang === "en" ? "en-US" : "es-CO", { maximumFractionDigits: decimals }).format(value);
}

export function NutritionNutrients({ totals }: { totals: NutritionTargets }) {
  const t = useT();
  const format = useNutritionNumber();
  return <dl className="nutrition-nutrient-strip">{nutrientDefinitions.filter(({ key }) => key !== "waterGlasses").map(({ key, label, unit }) => <div key={key}><dt>{t(label)}</dt><dd className="nutrition-measure">{format(totals[key])} {t(unit)}</dd></div>)}</dl>;
}

export function NutritionTargetsPanel({ targets, totals }: { targets: NutritionTargets; totals?: NutritionTargets }) {
  const t = useT();
  const format = useNutritionNumber();
  return <dl className="nutrition-targets">{nutrientDefinitions.map(({ key, label, unit }) => <div key={key} className="min-w-0"><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className="mt-2 nutrition-measure text-sm">{totals ? t("{actual} de {target} {unit}", { actual: format(totals[key]), target: format(targets[key]), unit: t(unit) }) : `${format(targets[key])} ${t(unit)}`}</dd>{totals && <><progress className="nutrition-progress mt-2" max={Math.max(1, targets[key])} value={Math.min(totals[key], Math.max(1, targets[key]))} aria-label={t("{nutrient} respecto a la meta", { nutrient: t(label) })} />{totals[key] > targets[key] && <p className="mt-1 text-xs text-muted-foreground">{t("{amount} {unit} sobre la meta", { amount: format(totals[key] - targets[key]), unit: t(unit) })}</p>}</>}</div>)}</dl>;
}
