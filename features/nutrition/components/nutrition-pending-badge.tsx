"use client";

import { useT } from "@/providers/i18n-provider";
import { useNutritionPendingCount } from "../hooks/use-nutrition-pending-count";
import { nutritionUsesMocks } from "../services/nutrition-service";

export function NutritionPendingBadge({ collapsed = false }: { collapsed?: boolean }) {
  const t = useT();
  const { data } = useNutritionPendingCount();
  if (!data?.count) return null;
  const label = t(nutritionUsesMocks ? "{count} planes demo por aprobar" : "{count} planes por aprobar", { count: String(data.count) });
  return <span title={label} className={`${collapsed ? "absolute -right-1 -top-1 " : ""}inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-info-soft px-1.5 py-0.5 text-[11px] font-semibold text-info-soft-foreground`}>
    <span className="sr-only">{label}</span>
    <span aria-hidden="true">{data.count > 99 ? "99+" : data.count}</span>
  </span>;
}
