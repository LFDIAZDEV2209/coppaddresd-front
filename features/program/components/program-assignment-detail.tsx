"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/markdown";
import { useI18n, useT } from "@/providers/i18n-provider";
import { ApiError } from "@/lib/api/http";
import { useAssignmentResource } from "../hooks/use-assignment-resource";
import { useProgramToast } from "../hooks/use-program-toast";
import { applyAssignment, dismissAssignment, fetchAssignment, regenerateAssignmentNarrative } from "../services/program-assignments-service";
import type { AppliedAssignment, AssignmentDetail } from "../types/assignments";
import { AssignmentError, AssignmentSkeleton, AssignmentStatus } from "./assignment-shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  const { lang } = useI18n();
  const { toast, toasts, dismiss } = useProgramToast();
  const [applied, setApplied] = useState<AppliedAssignment>();
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const dismissTrigger = useRef<HTMLButtonElement>(null);
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [confirmApply, setConfirmApply] = useState<"suggested" | "adjusted" | null>(null);
  const adjustmentRef = useRef<HTMLDivElement>(null);
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
      setConfirmApply(null);
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
      toast(error instanceof Error ? t(error.message) : t("No pudimos descartar la sugerencia."), "error");
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
        toast(t("No pudimos preparar la explicación. Intenta de nuevo."), "error");
        return;
      }
      setNarrativeQueued(true);
      toast(t("Explicación en preparación. Actualizaremos la ficha en 15 segundos."), "info");
      narrativeTimer.current = setTimeout(() => {
        regenerationRequest.current = null;
        setRegenerating(false);
        refresh();
      }, 15_000);
    } catch (error) {
      if (controller.signal.aborted) return;
      regenerationRequest.current = null;
      setRegenerating(false);
      toast(error instanceof Error ? t(error.message) : t("No pudimos volver a generar la explicación."), "error");
    }
  }

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-12 sm:p-8">
    <Link href="/program/asignacion" className="flex w-fit items-center gap-2 rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"><ArrowLeft aria-hidden className="size-4" />{t("Volver a asignaciones")}</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{data.patientName}</h1><p className="mt-2 text-sm text-muted-foreground">{data.patientDocument ?? t("Sin documento")} · {t("{days} días", { days: String(data.daysWaiting) })}</p></div><AssignmentStatus state={state} /></header>
    {active && <section role="status" className="rounded-2xl border border-success/25 bg-success-soft p-5 text-success-soft-foreground shadow-sm shadow-success/10"><h2 className="inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success-soft px-3 py-1.5 font-semibold text-inherit"><Check aria-hidden className="size-5" />{t("Semana 1 activa")}</h2><p className="mt-2 text-sm">{t("Fecha de inicio local: {date}", { date: new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${applied?.startLocalDate ?? data.enrollment.startLocalDate}T12:00:00Z`)) })} · {data.enrollment.timezone}</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt>{t("Plan nutricional aplicado")}</dt><dd className="font-semibold">{content?.nutritionPlan?.name ?? t("Contenido de la plantilla")}</dd></div><div><dt>{t("Rutina aplicada")}</dt><dd className="font-semibold">{content?.routine?.name ?? t("Contenido de la plantilla")}</dd></div></dl><Link className="mt-4 inline-block rounded text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" href={`/program/gestion?view=perfil-360&patient=${encodeURIComponent(data.patientId)}`}>{t("Ver contenido del programa")}</Link></section>}
    <nav aria-label={t("Secciones de la ficha")} className="sticky top-0 z-20 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/95 p-1 backdrop-blur-md">{[["patient-profile", "Perfil del paciente"], ["suggestion", "Sugerencia"], ["justification", "Justificación IA"]].map(([anchor, label]) => <a key={anchor} href={`#${anchor}`} className="flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-xs sm:px-4 sm:text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-ring">{t(label)}</a>)}</nav>
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <AssignmentProfile profile={data.profileSnapshot} />
      <div className="flex min-w-0 flex-col gap-6"><section id="suggestion" aria-labelledby="assignment-proposal" className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6 scroll-mt-24 wrap-anywhere"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="assignment-proposal" className="font-heading text-xl font-semibold">{t("Su primera semana")}</h2><span className="rounded-md bg-info-soft px-3 py-1 text-xs font-semibold text-info-soft-foreground">{t("Sugerencia clínica")}</span></div><p className="mt-1 text-sm text-muted-foreground">{t("Revisa el plan de alimentación y la actividad física. La decisión final es tuya.")}</p><div className="my-6 grid grid-flow-dense gap-0 overflow-hidden rounded-xl border border-border sm:grid-cols-2">{[["Plan nutricional", suggestedPlan], ["Actividad física semanal", suggestedRoutine]].map(([label, value]) => <div key={label} className="bg-primary-soft/40 p-5 first:border-b first:border-border sm:first:border-b-0 sm:first:border-r"><h3 className="text-xs font-medium text-muted-foreground">{t(label)}</h3><p className="mt-3 text-xl font-semibold leading-snug">{value || t("Contenido de la plantilla")}</p></div>)}</div>
        <h3 className="mb-3 text-sm font-semibold">{t("Por qué se sugiere")}</h3><ul className="flex list-disc flex-col gap-4 pl-5">{data.proposal.matchedRules?.map((rule, index) => <li key={rule.ruleId ?? `${rule.ruleCode}-${index}`}><p className="text-sm leading-relaxed">{t(rule.ruleCode === "movimiento-subscales-v1" ? "La rutina corresponde al nivel de actividad registrado en la evaluación de movimiento." : rule.conditionCode && data.profileSnapshot.conditions?.some((condition) => condition.active && condition.code === rule.conditionCode) ? "El perfil cumple los criterios registrados para esta condición clínica." : rule.reason.includes("snapshot") ? "La sugerencia se basa en los criterios clínicos registrados en el perfil." : rule.reason === "Demo visual: dificultad media" ? "Actividad física de dificultad media, según el criterio registrado." : rule.reason === "Demo visual: plan base registrado" ? "Plan de alimentación base para obesidad, según el criterio registrado." : rule.reason)}</p><cite className="mt-1 block text-xs not-italic text-muted-foreground">{rule.sourceRef ?? rule.source_ref ?? rule.criteria?.sourceRef ?? rule.criteria?.safety?.sourceRef ?? data.profileSnapshot.conditions?.find((condition) => condition.active && condition.code === rule.conditionCode)?.sourceRef ?? t("Sin fuente clínica publicada para este criterio")}</cite></li>)}</ul>{!data.proposal.matchedRules?.length && <p className="text-sm text-muted-foreground">{t("Se utilizará el contenido predeterminado de la plantilla.")}</p>}
        {adjusting && !terminal && <div ref={adjustmentRef} tabIndex={-1} className="mt-6 flex scroll-mt-24 flex-col gap-4 border-t border-border pt-5 outline-none"><h3 className="font-semibold">{t("Ajustar antes de aplicar")}</h3><AssignmentCatalogInput kind="nutrition" value={plan} onChange={setPlan} disabled={submitting || uncertain} /><AssignmentCatalogInput kind="routine" value={routine} onChange={setRoutine} disabled={submitting || uncertain} /></div>}
      </section>
      <section id="justification" aria-labelledby="assignment-narrative" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="assignment-narrative" className="text-lg font-semibold">{t("Justificación IA")}</h2><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={submitting || regenerating || confirmingDismiss} aria-busy={regenerating} onClick={() => void regenerateNarrative()}><RefreshCw aria-hidden />{t(regenerating ? "Preparando explicación…" : "Volver a generar")}</Button><Button variant="ghost" disabled={submitting || (regenerating && !narrativeQueued)} onClick={refresh}>{t("Actualizar explicación")}</Button></div></div><p className="mt-2 text-xs text-muted-foreground">{t("La IA explica la sugerencia a partir del perfil y los criterios registrados; no elige el plan ni la rutina.")}</p>{(data.narrativePending || narrativeQueued) && <p role="status" className="mt-4 rounded-xl bg-muted p-3 text-sm">{t("La explicación se está preparando. Puedes revisar los datos y la sugerencia mientras tanto.")}</p>}<Tabs defaultValue="es" className="mt-4"><TabsList aria-label={t("Idioma de la explicación")}><TabsTrigger value="es">{t("Español")}</TabsTrigger><TabsTrigger value="en">{t("Inglés")}</TabsTrigger></TabsList>{(["es", "en"] as const).map((language) => <TabsContent key={language} value={language} className="pt-3 leading-relaxed" lang={language}>{data.narrative?.[language] ? <Markdown content={data.narrative[language]!} /> : <p className="text-sm text-muted-foreground">{t("La explicación todavía no está disponible en este idioma.")}</p>}</TabsContent>)}</Tabs><p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">{t("Contrasta esta explicación con los resultados del paciente. Las fuentes clínicas disponibles aparecen junto a cada criterio de la sugerencia.")}</p></section></div>
    </div>
    <section aria-label={t("Acciones de asignación")} className="sticky bottom-3 z-30 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:p-5">
      <p className="mb-4 text-sm text-muted-foreground">{t("Al aplicar, se activa la semana 1 desde hoy en la zona horaria del paciente.")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <Button className="min-h-10" disabled={terminal || submitting || uncertain || confirmingDismiss} onClick={() => setConfirmApply("suggested")}>
          {t(submitting && !confirmingDismiss ? "Aplicando…" : "Aplicar plan sugerido")}
        </Button>
        {!adjusting ? (
          <Button className="min-h-10" variant="outline" disabled={terminal || submitting || uncertain || confirmingDismiss} onClick={() => { setAdjusting(true); requestAnimationFrame(() => { adjustmentRef.current?.scrollIntoView({ block: "center", behavior: "instant" }); adjustmentRef.current?.focus(); }); }}>{t("Ajustar antes de aplicar")}</Button>
        ) : (
          <Button className="min-h-10" variant="outline" disabled={terminal || submitting || uncertain || confirmingDismiss || !validAdjustment} onClick={() => setConfirmApply("adjusted")}>{t("Aplicar con ajuste")}</Button>
        )}
        <Button ref={dismissTrigger} className="min-h-10" variant="ghost" disabled={terminal || submitting || uncertain} aria-expanded={confirmingDismiss} aria-controls={confirmingDismiss ? "dismiss-confirmation" : undefined} onClick={() => setConfirmingDismiss(true)}>
          {t("Descartar sugerencia")}
        </Button>
      </div>
      {confirmingDismiss && !terminal && (
        <div id="dismiss-confirmation" role="group" aria-labelledby="dismiss-title" aria-describedby="dismiss-description" aria-busy={submitting} className="mt-5 rounded-xl border border-border bg-muted/40 p-4" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelDismiss(); } }}>
          <h3 id="dismiss-title" className="font-semibold">{t("¿Descartar esta sugerencia?")}</h3>
          <p id="dismiss-description" className="mt-2 max-w-prose text-sm text-muted-foreground">{t("Al descartar no se aplica esta sugerencia. Después de 7 días se iniciará automáticamente el contenido predeterminado del programa.")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button autoFocus className="min-h-10" variant="outline" disabled={submitting} onClick={cancelDismiss}>{t("Cancelar")}</Button>
            <Button className="min-h-10" variant="destructive" disabled={submitting || uncertain} onClick={() => void confirmDismiss()}>{t(submitting ? "Descartando…" : "Confirmar descarte")}</Button>
          </div>
        </div>
      )}
      {uncertain && <div role="alert" className="mt-4"><p className="mb-2 text-sm">{t("Verifica el estado actual antes de volver a aplicar.")}</p><Button variant="outline" onClick={refresh}>{t("Verificar estado")}</Button></div>}
    </section>
    <Dialog open={confirmApply !== null} onOpenChange={(open) => { if (!submitting && !open) setConfirmApply(null); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t("¿Activar la primera semana?")}</DialogTitle><DialogDescription>{t("El paciente verá este contenido y sus misiones de la semana en su aplicación.")}</DialogDescription></DialogHeader>
        <dl className="grid gap-4 rounded-xl bg-muted/40 p-4"><div><dt className="text-xs text-muted-foreground">{t("Plan nutricional")}</dt><dd className="mt-1 font-semibold wrap-anywhere">{confirmApply === "adjusted" ? plan : suggestedPlan || t("Contenido de la plantilla")}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Actividad física semanal")}</dt><dd className="mt-1 font-semibold wrap-anywhere">{confirmApply === "adjusted" ? routine : suggestedRoutine || t("Contenido de la plantilla")}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Inicio de la semana 1")}</dt><dd className="mt-1 font-semibold">{new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", { timeZone: data.enrollment.timezone, dateStyle: "long" }).format(new Date())}</dd><dd className="mt-1 text-xs text-muted-foreground">{data.enrollment.timezone}</dd></div></dl>
        <p className="text-sm text-muted-foreground">{t("Se activarán las misiones definidas en el programa del paciente.")}</p>
        <DialogFooter><Button variant="outline" disabled={submitting} onClick={() => setConfirmApply(null)}>{t("Seguir revisando")}</Button><Button disabled={submitting || uncertain || terminal} aria-busy={submitting} onClick={() => void apply(confirmApply === "adjusted")}>{t(submitting ? "Aplicando…" : "Confirmar y activar semana 1")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <div aria-live="polite"><ProgramToastContainer toasts={toasts} onDismiss={dismiss} /></div>
  </div>;
}
