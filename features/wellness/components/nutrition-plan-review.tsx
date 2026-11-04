"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { approveNutritionPlans, canReviewNutritionPlan, fetchNutritionPlanHistory, type NutritionPlanReviewEvent } from "../services/nutrition-plans-service";
import { notifyAssignmentsRefresh } from "../hooks/assignments-refresh";
import type { NutritionPlan } from "../types";

const eventLabels: Record<string, string> = {
  created: "Borrador creado", modified: "Plan modificado; requiere nueva aprobación",
  generation_queued: "Generación solicitada", generated: "Borrador generado por IA", approved: "Plan aprobado",
};

export function NutritionPlanReview({ plan, onApproved }: { plan: NutritionPlan; onApproved: (plan: NutritionPlan) => void }) {
  const t = useT();
  const { can } = useAppContext();
  const [history, setHistory] = useState<NutritionPlanReviewEvent[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (plan.isTemplate) return;
    const controller = new AbortController();
    fetchNutritionPlanHistory(plan.id, controller.signal)
      .then(setHistory).catch(() => { if (!controller.signal.aborted) setHistoryError(true); });
    return () => controller.abort();
  }, [plan.id, plan.revision, plan.isTemplate]);
  if (plan.isTemplate) return null;
  const ready = canReviewNutritionPlan(plan);
  return (
    <section aria-label={t("Revisión nutricional")} className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h3 className="font-semibold">{t("Revisión nutricional")}</h3>
          <p className="text-sm text-muted-foreground">{plan.reviewStatus === "approved"
            ? t("Plan aprobado. El paciente puede consultar su ciclo de 30 días.")
            : t("El paciente solo verá este plan después de la aprobación nutricional.")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Versión {revision}", { revision: String(plan.revision ?? 1) })}</p>
        </div>
      </div>
      {plan.generationStatus === "queued" || plan.generationStatus === "generating" ? <p role="status" className="text-sm">{t("La IA está preparando el borrador con los resultados de las baterías.")}</p> : null}
      {plan.generationStatus === "failed" ? <p role="alert" className="text-sm text-destructive">{t("La generación no pudo completarse. Puedes revisar y completar el borrador manualmente.")}</p> : null}
      {ready && can("NutritionPlans.Approve") ? (
        <div className="space-y-3 border-t border-primary/15 pt-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} />
            <span>{t("Revisé las comidas, alergias, restricciones y resultados del paciente. Apruebo este plan de 30 días.")}</span>
          </label>
          <Textarea aria-label={t("Notas de revisión")} placeholder={t("Notas de revisión (opcional)")} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={!acknowledged || saving} onClick={async () => {
            setSaving(true); setError(null);
            try {
              const [approved] = await approveNutritionPlans([{ id: plan.id, revision: plan.revision! }], notes);
              notifyAssignmentsRefresh(); onApproved(approved); setAcknowledged(false);
            } catch (failure) { setError(failure instanceof Error ? failure.message : t("No se pudo aprobar el plan.")); }
            finally { setSaving(false); }
          }}><CheckCircle2 data-icon="inline-start" />{saving ? t("Aprobando...") : t("Aprobar y publicar plan")}</Button>
        </div>
      ) : null}
      <div className="space-y-2 border-t border-primary/15 pt-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4" />{t("Historial de decisiones")}</h4>
        {historyError ? <p role="alert" className="text-sm text-destructive">{t("No se pudo cargar el historial.")}</p> : history === null ? <Skeleton className="h-12 w-full" /> : history.length === 0 ? <p className="text-sm text-muted-foreground">{t("Sin decisiones registradas.")}</p> : (
          <ol className="max-h-48 space-y-3 overflow-y-auto text-sm">
            {history.map(event => <li key={event.id} className="border-l-2 border-primary/25 pl-3">
              <p className="font-medium">{t(eventLabels[event.action] ?? "Decisión registrada")}</p>
              <p className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()} · {t("Versión {revision}", { revision: String(event.revision) })}</p>
              <p className="break-all text-xs text-muted-foreground">{event.actorName ?? event.actorUserId ?? t("Sistema automático")}</p>
              {event.notes ? <p className="mt-1 whitespace-pre-wrap">{event.notes}</p> : null}
            </li>)}
          </ol>
        )}
      </div>
    </section>
  );
}
