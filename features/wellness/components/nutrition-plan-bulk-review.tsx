"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { approveNutritionPlans, canReviewNutritionPlan } from "../services/nutrition-plans-service";
import { notifyAssignmentsRefresh } from "../hooks/assignments-refresh";
import type { NutritionPlanListItem } from "../types";

export function NutritionPlanBulkReview({ plans, onReview, onApproved }: {
  plans: NutritionPlanListItem[]; onReview: (plan: NutritionPlanListItem) => void; onApproved: () => void;
}) {
  const t = useT();
  const candidates = plans.filter(canReviewNutritionPlan);
  const [selection, setSelection] = useState<Record<string, NutritionPlanListItem>>({});
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = Object.values(selection);
  if (candidates.length === 0) return null;
  return (
    <section aria-label={t("Planes pendientes de aprobación")} className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary" />{t("Planes pendientes de aprobación")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("Revisa cada borrador antes de publicar el ciclo nutricional de 30 días.")}</p></div>
        <Button disabled={selected.length === 0} onClick={() => { setOpen(true); setAcknowledged(false); setError(null); }}>
          <CheckCircle2 data-icon="inline-start" />{t("Aprobar seleccionados ({count})", { count: String(selected.length) })}
        </Button>
      </div>
      <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={candidates.every(p => Boolean(selection[p.id]))}
          onCheckedChange={checked => setSelection(checked === true ? Object.fromEntries(candidates.map(p => [p.id, { ...p }])) : {})} />
        {t("Seleccionar todos los borradores de esta página")}
      </label>
      <ul className="divide-y divide-primary/10">
        {candidates.map(plan => <li key={plan.id} className="flex items-center gap-3 py-3">
          <Checkbox aria-label={t("Seleccionar plan de {patient}", { patient: plan.patientName ?? plan.name })} checked={Boolean(selection[plan.id])}
            onCheckedChange={checked => setSelection(previous => {
              const next = { ...previous }; if (checked === true) next[plan.id] = { ...plan }; else delete next[plan.id]; return next;
            })} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{plan.patientName ?? plan.name}</p>
            <p className="truncate text-xs text-muted-foreground">{plan.name} · {t("Versión {revision}", { revision: String(plan.revision) })}</p></div>
          <Button size="sm" variant="outline" onClick={() => onReview(plan)}>{t("Revisar plan")}</Button>
        </li>)}
      </ul>
      <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{t("Confirmar aprobación nutricional")}</DialogTitle>
            <DialogDescription>{t("Los planes se publicarán juntos. Si alguno cambió o no cumple los requisitos, no se aprobará ningún plan del lote.")}</DialogDescription></DialogHeader>
          <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg bg-muted p-3 text-sm">
            {selected.map(plan => <li key={plan.id}><strong>{plan.patientName ?? plan.name}</strong> · {t("Versión {revision}", { revision: String(plan.revision) })}</li>)}
          </ul>
          <label className="flex cursor-pointer items-start gap-2 text-sm"><Checkbox checked={acknowledged} onCheckedChange={value => setAcknowledged(value === true)} />
            <span>{t("Confirmo que revisé individualmente las dietas, alergias, restricciones y baterías de todos los pacientes seleccionados.")}</span></label>
          <Textarea aria-label={t("Notas de revisión")} placeholder={t("Notas de revisión (opcional)")} value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>{t("Cancelar")}</Button>
            <Button disabled={!acknowledged || saving} onClick={async () => {
              setSaving(true); setError(null);
              try {
                await approveNutritionPlans(selected.map(plan => ({ id: plan.id, revision: plan.revision! })), notes);
                setOpen(false); setSelection({}); notifyAssignmentsRefresh(); onApproved();
              } catch (failure) { setError(failure instanceof Error ? failure.message : t("No se pudieron aprobar los planes.")); }
              finally { setSaving(false); }
            }}>{saving ? t("Aprobando...") : t("Aprobar y publicar")}</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
