"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/markdown";
import { useT } from "@/providers/i18n-provider";
import { ApiError } from "@/lib/api/http";
import { useAssignmentResource } from "../hooks/use-assignment-resource";
import { useProgramToast } from "../hooks/use-program-toast";
import { applyAssignment, dismissAssignment, fetchAssignment, regenerateAssignmentNarrative } from "../services/program-assignments-service";
import type { AppliedAssignment, AssignmentDetail } from "../types/assignments";
import { AssignmentError, AssignmentSkeleton, AssignmentStatus } from "./assignment-shared";
import { AssignmentProfile } from "./assignment-profile";
import { AssignmentCatalogInput } from "./assignment-catalog-input";
import { ProgramToastContainer } from "./program-toast";

export function ProgramAssignmentDetail({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => fetchAssignment(id, signal), [id]);
  const { data, loading, error, retry } = useAssignmentResource(load);
  if (loading) return <AssignmentSkeleton />;
  if (error || !data) return <div className="p-6"><AssignmentError retry={retry} /></div>;
  return <AssignmentReview key={`${id}-${data.updatedAt ?? data.state}`} data={data} refresh={retry} />;
}

function AssignmentReview({ data, refresh }: { data: AssignmentDetail; refresh: () => void }) {
  const t = useT();
  const { toast, toasts, dismiss } = useProgramToast();
  const [applied, setApplied] = useState<AppliedAssignment>();
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const dismissTrigger = useRef<HTMLButtonElement>(null);
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [narrativeQueued, setNarrativeQueued] = useState(false);
  const regenerationRequest = useRef<AbortController | null>(null);
  const narrativeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    regenerationRequest.current?.abort();
    if (narrativeTimer.current !== null) clearTimeout(narrativeTimer.current);
  }, []);
  const suggestedPlan = data.proposal.nutritionPlanName ?? data.proposal.nutritionPlan?.name ?? "";
  const suggestedRoutine = data.proposal.routineName ?? data.proposal.routine?.name ?? "";
  const [plan, setPlan] = useState(suggestedPlan);
  const [routine, setRoutine] = useState(suggestedRoutine);
  const state = dismissed ? "dismissed" : applied?.state ?? data.state;
  const terminal = !["proposed", "pending-narrative"].includes(state) || data.enrollment.currentWeekNumber > 0;
  const changed = plan.trim() !== suggestedPlan || routine.trim() !== suggestedRoutine;
  const validAdjustment = changed && (plan.trim() !== suggestedPlan ? !!plan.trim() : true) && (routine.trim() !== suggestedRoutine ? !!routine.trim() : true);
  const content = applied?.appliedContent ?? data.proposal.appliedContent;
  const active = ["applied", "edited", "fallback"].includes(state);
  async function apply(adjusted: boolean) {
    if (lock.current || terminal || uncertain || confirmingDismiss) return;
    lock.current = true;
    setSubmitting(true);
    try {
      const result = await applyAssignment(data.recommendationId, adjusted ? {
        ...(plan.trim() !== suggestedPlan ? { overrideNutritionPlanName: plan.trim() } : {}),
        ...(routine.trim() !== suggestedRoutine ? { overrideRoutineName: routine.trim() } : {}),
      } : {});
      setApplied(result);
      toast(t("Asignación aplicada. La semana 1 está activa."));
    } catch (error) {
      toast(error instanceof Error ? t(error.message) : t("No pudimos aplicar la asignación."), "error");
      // Una respuesta perdida o un conflicto requieren releer antes de otra aplicación.
      if (!(error instanceof ApiError) || ["network", "timeout", "conflict", "server", "unavailable"].includes(error.code)) setUncertain(true);
    } finally {
      setSubmitting(false);
      lock.current = false;
    }
  }
  function cancelDismiss() {
    if (lock.current) return;
    setConfirmingDismiss(false);
    dismissTrigger.current?.focus();
  }

  async function confirmDismiss() {
    if (lock.current || terminal || uncertain || !confirmingDismiss) return;
    lock.current = true;
    setSubmitting(true);
    try {
      await dismissAssignment(data.recommendationId);
      setDismissed(true);
      setConfirmingDismiss(false);
      // Relee el estado confirmado; la cola consulta sin caché al volver a ella.
      refresh();
    } catch (error) {
      toast(error instanceof Error ? t(error.message) : t("No pudimos desestimar la recomendación."), "error");
      if (!(error instanceof ApiError) || ["network", "timeout", "conflict", "server", "unavailable"].includes(error.code)) setUncertain(true);
    } finally {
      setSubmitting(false);
      lock.current = false;
    }
  }

  async function regenerateNarrative() {
    if (regenerationRequest.current || lock.current || confirmingDismiss) return;
    const controller = new AbortController();
    regenerationRequest.current = controller;
    setRegenerating(true);
    try {
      const result = await regenerateAssignmentNarrative(data.recommendationId, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.queued) {
        setRegenerating(false);
        regenerationRequest.current = null;
        toast(t("No pudimos encolar la narrativa. Intenta de nuevo."), "error");
        return;
      }
      setNarrativeQueued(true);
      toast(t("Narrativa en generación. Actualizaremos la ficha en 15 segundos."), "info");
      narrativeTimer.current = setTimeout(() => {
        regenerationRequest.current = null;
        setRegenerating(false);
        refresh();
      }, 15_000);
    } catch (error) {
      if (controller.signal.aborted) return;
      regenerationRequest.current = null;
      setRegenerating(false);
      toast(error instanceof Error ? t(error.message) : t("No pudimos regenerar la narrativa."), "error");
    }
  }

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
    <Link href="/program/asignacion" className="flex w-fit items-center gap-2 rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"><ArrowLeft aria-hidden className="size-4" />{t("Volver a asignaciones")}</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">{data.patientName}</h1><p className="mt-2 text-sm text-muted-foreground">{data.patientDocument ?? t("Sin documento")} · {t("{days} días", { days: String(data.daysWaiting) })}</p></div><AssignmentStatus state={state} /></header>
    {active && <section role="status" className="rounded-2xl border border-emerald-200 bg-success-soft p-5 text-[color-mix(in_srgb,var(--success-soft-foreground)_85%,black)] dark:text-success-soft-foreground shadow-sm shadow-success/10 dark:border-success/30"><h2 className="inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success-soft px-3 py-1.5 font-semibold text-inherit"><Check aria-hidden className="size-5" />{t("Semana 1 activa")}</h2><p className="mt-2 text-sm">{t("Fecha de inicio local: {date}", { date: applied?.startLocalDate ?? data.enrollment.startLocalDate })} · {data.enrollment.timezone}</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt>{t("Plan nutricional aplicado")}</dt><dd className="font-semibold">{content?.nutritionPlan?.name ?? t("Contenido de la plantilla")}</dd></div><div><dt>{t("Rutina aplicada")}</dt><dd className="font-semibold">{content?.routine?.name ?? t("Contenido de la plantilla")}</dd></div></dl><Link className="mt-4 inline-block rounded text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" href={`/program/gestion?view=perfil-360&patient=${encodeURIComponent(data.patientId)}`}>{t("Ver contenido del programa")}</Link></section>}
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <AssignmentProfile profile={data.profileSnapshot} />
      <div className="min-w-0 space-y-6"><section aria-labelledby="assignment-proposal" className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6 wrap-anywhere"><h2 id="assignment-proposal" className="text-lg font-semibold">{t("Propuesta del programa")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("El motor sugiere el contenido; tú confirmas la decisión clínica.")}</p><div className="my-5 grid gap-3 sm:grid-cols-2">{[["Plan nutricional", suggestedPlan], ["Rutina", suggestedRoutine]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/40 p-4"><h3 className="text-xs font-medium text-muted-foreground">{t(label)}</h3><p className="mt-2 font-semibold">{value || t("Contenido de la plantilla")}</p></div>)}</div>
        <h3 className="mb-3 text-sm font-semibold">{t("Reglas activadas")}</h3><ul className="space-y-3">{data.proposal.matchedRules?.map((rule, index) => <li key={rule.ruleId ?? `${rule.ruleCode}-${index}`}><span className="inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{rule.ruleCode ?? rule.conditionCode ?? t("Regla del motor")}</span><p className="mt-1 text-sm">{t(rule.reason)}</p><cite className="text-xs not-italic text-muted-foreground">{rule.sourceRef ?? rule.source_ref}</cite></li>)}</ul>{!data.proposal.matchedRules?.length && <p className="text-sm text-muted-foreground">{t("Se utilizará el contenido predeterminado de la plantilla.")}</p>}
        {adjusting && !terminal && <div className="mt-5 space-y-4 border-t border-border pt-5"><AssignmentCatalogInput kind="nutrition" value={plan} onChange={setPlan} disabled={submitting || uncertain} /><AssignmentCatalogInput kind="routine" value={routine} onChange={setRoutine} disabled={submitting || uncertain} /></div>}
      </section>
      <section aria-labelledby="assignment-narrative" className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="assignment-narrative" className="text-lg font-semibold">{t("Narrativa IA")}</h2><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={submitting || regenerating || confirmingDismiss} aria-busy={regenerating} onClick={() => void regenerateNarrative()}><RefreshCw aria-hidden />{t(regenerating ? "Generando narrativa…" : "Regenerar narrativa")}</Button><Button variant="ghost" disabled={submitting || (regenerating && !narrativeQueued)} onClick={refresh}>{t("Actualizar narrativa")}</Button></div></div><p className="mt-2 text-xs text-muted-foreground">{t("Consulta de nuevo la narrativa disponible. La generación se realiza en segundo plano.")}</p>{(data.narrativePending || narrativeQueued) && <p role="status" className="mt-4 rounded-xl bg-muted p-3 text-sm">{t("Narrativa en preparación. Puedes revisar y aplicar la propuesta mientras tanto.")}</p>}<Tabs defaultValue="es" className="mt-4"><TabsList aria-label={t("Idioma de la narrativa")}><TabsTrigger value="es">{t("Español")}</TabsTrigger><TabsTrigger value="en">{t("Inglés")}</TabsTrigger></TabsList>{(["es", "en"] as const).map((language) => <TabsContent key={language} value={language} className="pt-3 leading-relaxed" lang={language}>{data.narrative?.[language] ? <Markdown content={data.narrative[language]!} /> : <p className="text-sm text-muted-foreground">{t("Narrativa no disponible en este idioma.")}</p>}</TabsContent>)}</Tabs></section></div>
    </div>
    <section aria-label={t("Acciones de asignación")} className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-4 text-sm text-muted-foreground">{t("Al aplicar, se activa la semana 1 desde hoy en la zona horaria del paciente.")}</p>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-10" disabled={terminal || submitting || uncertain || confirmingDismiss} onClick={() => void apply(false)}>
          {t(submitting && !confirmingDismiss ? "Aplicando…" : "Aplicar tal cual")}
        </Button>
        {!adjusting ? (
          <Button className="min-h-10" variant="outline" disabled={terminal || submitting || uncertain || confirmingDismiss} onClick={() => setAdjusting(true)}>{t("Ajustar propuesta")}</Button>
        ) : (
          <Button className="min-h-10" variant="outline" disabled={terminal || submitting || uncertain || confirmingDismiss || !validAdjustment} onClick={() => void apply(true)}>{t("Aplicar con ajuste")}</Button>
        )}
        <Button ref={dismissTrigger} className="min-h-10" variant="ghost" disabled={terminal || submitting || uncertain} aria-expanded={confirmingDismiss} aria-controls={confirmingDismiss ? "dismiss-confirmation" : undefined} onClick={() => setConfirmingDismiss(true)}>
          {t("Desestimar")}
        </Button>
      </div>
      {confirmingDismiss && !terminal && (
        <div id="dismiss-confirmation" role="group" aria-labelledby="dismiss-title" aria-describedby="dismiss-description" aria-busy={submitting} className="mt-5 rounded-xl border border-border bg-muted/40 p-4" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelDismiss(); } }}>
          <h3 id="dismiss-title" className="font-semibold">{t("¿Desestimar esta recomendación?")}</h3>
          <p id="dismiss-description" className="mt-2 max-w-prose text-sm text-muted-foreground">{t("Se desestimará la recomendación; después de 7 días, el contenido predeterminado se iniciará automáticamente.")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button autoFocus className="min-h-10" variant="outline" disabled={submitting} onClick={cancelDismiss}>{t("Cancelar")}</Button>
            <Button className="min-h-10" variant="destructive" disabled={submitting || uncertain} onClick={() => void confirmDismiss()}>{t(submitting ? "Desestimando…" : "Confirmar desestimación")}</Button>
          </div>
        </div>
      )}
      {uncertain && <div role="alert" className="mt-4"><p className="mb-2 text-sm">{t("Verifica el estado actual antes de volver a aplicar.")}</p><Button variant="outline" onClick={refresh}>{t("Verificar estado")}</Button></div>}
    </section>
    <div aria-live="polite"><ProgramToastContainer toasts={toasts} onDismiss={dismiss} /></div>
  </div>;
}
