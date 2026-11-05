"use client";

import { ShieldAlert, Info, CircleAlert, Wrench } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { NutritionAlert, NutritionClinicalProfile } from "../types/nutrition";
import { useNutritionNumber } from "./nutrition-shared";

export function NutritionClinicalHeader({ profile }: { profile: NutritionClinicalProfile }) {
  const t = useT();
  const format = useNutritionNumber();
  const fields = [
    { label: "Peso", value: profile.weightKg == null ? null : `${format(profile.weightKg)} ${t("kg")}`, measure: true },
    { label: "Talla", value: profile.heightCm == null ? null : `${format(profile.heightCm)} ${t("cm")}`, measure: true },
    { label: "Edad", value: profile.age == null ? null : t("{age} años", { age: String(profile.age) }) },
    { label: "Sexo", value: profile.sex === "female" ? t("Mujer") : profile.sex === "male" ? t("Hombre") : null },
    { label: "IMC", value: profile.bmi == null ? null : format(profile.bmi) },
    { label: "HbA1c", value: profile.hba1c == null ? null : `${format(profile.hba1c)} %` },
    { label: "Movimiento", value: profile.movement },
    { label: "Adherencia", value: profile.adherence },
    { label: "Riesgo cardiometabólico", value: profile.cardiometabolicRisk },
    { label: "Batería de tests", value: profile.completedTests === null ? null : t("{count} de 9 completados", { count: String(profile.completedTests) }) },
  ];
  return <section className="nutrition-section" aria-labelledby="nutrition-profile-title"><h2 id="nutrition-profile-title" className="nutrition-display text-xl font-semibold">{t("Perfil clínico")}</h2><dl className="nutrition-profile-grid mt-5">{fields.map(({ label, value, measure }) => <div key={label}><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className={`mt-1.5 break-words font-medium ${measure && value != null ? "nutrition-measure" : ""}`}>{value ?? t("Sin dato registrado")}</dd></div>)}</dl>{profile.provisionalFields.length > 0 && <p className="mt-5 text-sm text-muted-foreground">{t("Datos pendientes: {fields}", { fields: profile.provisionalFields.join(", ") })}</p>}</section>;
}

const categories = [
  { severity: "critical", label: "Críticas", icon: ShieldAlert },
  { severity: "warning", label: "Advertencias", icon: CircleAlert },
  { severity: "informational", label: "Informativas", icon: Info },
  { severity: "technical", label: "Técnicas", icon: Wrench },
] as const;

export function NutritionClinicalAlerts({ alerts }: { alerts: NutritionAlert[] }) {
  const t = useT();
  return <section className="nutrition-section" aria-labelledby="nutrition-alerts-title"><h2 id="nutrition-alerts-title" className="nutrition-display text-xl font-semibold">{t("Alertas y validaciones")}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{categories.map(({ severity, label, icon: Icon }) => {
    const entries = alerts.filter((alert) => alert.severity === severity);
    return <div key={severity}><h3 className="flex items-center gap-2 text-sm font-semibold"><span className="nutrition-chip" data-status={severity}><Icon aria-hidden="true" className="size-4" />{t(label)} · {entries.length}</span></h3>{entries.length ? <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed list-disc">{entries.map((alert) => <li key={alert.code}>{alert.message}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{t("Sin alertas en esta categoría")}</p>}</div>;
  })}</div></section>;
}
