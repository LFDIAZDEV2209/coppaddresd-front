"use client";

import Link from "next/link";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";

/** Deep-link por ID estable; no busca ni enlaza pacientes por nombre. */
export function NutritionPatientLink({ patientId }: { patientId: string }) {
  const { can } = useAppContext();
  const t = useT();
  if (!can("Nutrition.Manage") && !can("Nutrition.Approve")) return null;
  return <Link href={`/nutrition/${encodeURIComponent(patientId)}`} className="inline-flex min-h-11 items-center self-start rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">{t("Plan nutricional")}</Link>;
}
