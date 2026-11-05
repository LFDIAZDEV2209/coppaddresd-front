"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";

export function NutritionSkeleton() {
  const t = useT();
  return <div role="status" aria-label={t("Cargando bandeja de nutrición")} className="space-y-5 p-6">
    <span className="sr-only">{t("Cargando bandeja de nutrición")}</span>
    {Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="flex flex-wrap gap-5 border-b border-border pb-5"><Skeleton className="h-12 min-w-32 flex-1" /><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-24" /></div>)}
  </div>;
}

export function NutritionError({ retry }: { retry: () => void }) {
  const t = useT();
  return <div role="alert" className="space-y-3 rounded-xl border border-border bg-card p-6">
    <h2 className="text-lg font-semibold">{t("No pudimos cargar Nutrición")}</h2>
    <p className="text-sm text-muted-foreground">{t("Intenta actualizar la bandeja. Si el problema continúa, vuelve más tarde.")}</p>
    <Button variant="outline" onClick={retry}>{t("Reintentar")}</Button>
  </div>;
}
