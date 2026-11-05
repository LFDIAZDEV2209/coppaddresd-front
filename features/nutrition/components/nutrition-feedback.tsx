"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";
import type { NutritionServiceIssue } from "../types/nutrition";

export function NutritionSkeleton() {
  const t = useT();
  return <div role="status" aria-label={t("Cargando bandeja de nutrición")} className="space-y-5 p-6">
    <span className="sr-only">{t("Cargando bandeja de nutrición")}</span>
    {Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="flex flex-wrap gap-5 border-b border-border pb-5"><Skeleton className="h-12 min-w-32 flex-1" /><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-24" /></div>)}
  </div>;
}

export function NutritionIssueMessage({ issue }: { issue: NutritionServiceIssue }) {
  const t = useT();
  const labels = { endpoint: "El endpoint o recurso de Nutrición no está disponible. No se muestran datos de demostración.", contract: "La respuesta de Nutrición no coincide con el contrato esperado. No se muestran datos incompletos.", conflict: "El plan cambió en el servidor. Recarga la ficha antes de continuar.", request: "No se pudo completar la solicitud de Nutrición. Revisa la conexión y vuelve a intentarlo." };
  return <div role="alert" className="space-y-2 text-sm"><p>{t(labels[issue.kind])}</p>{issue.detail && <p className="whitespace-pre-wrap break-words">{issue.detail}</p>}<p className="break-all font-mono text-xs">{issue.endpoint} · {issue.status || t("Sin respuesta HTTP")}</p></div>;
}

export function NutritionError({ retry, issue }: { retry: () => void; issue?: NutritionServiceIssue | null }) {
  const t = useT();
  return <div role="alert" className="space-y-3 rounded-xl border border-border bg-card p-6">
    <h2 className="text-lg font-semibold">{t("No pudimos cargar Nutrición")}</h2>
    <p className="text-sm text-muted-foreground">{t("Intenta actualizar la bandeja. Si el problema continúa, vuelve más tarde.")}</p>
    {issue && <NutritionIssueMessage issue={issue} />}
    <Button variant="outline" onClick={retry}>{t("Reintentar")}</Button>
  </div>;
}
