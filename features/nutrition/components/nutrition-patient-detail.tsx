"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
import { useI18n, useT } from "@/providers/i18n-provider";
import { useNutritionResource } from "../hooks/use-nutrition-resource";
import { useNutritionEditor } from "../hooks/use-nutrition-editor";
import { fetchNutritionWorkspace } from "../services/nutrition-service";
import { cycleIsComplete } from "../lib/nutrition-calculations";
import type { NutritionActor, NutritionFood, NutritionPatientDetail as PatientDetail, NutritionScope } from "../types/nutrition";
import { NutritionError, NutritionSkeleton } from "./nutrition-feedback";
import { NutritionDemoNotice, NutritionStateChip, NutritionTargetsPanel } from "./nutrition-shared";
import { NutritionClinicalAlerts, NutritionClinicalHeader } from "./nutrition-clinical-profile";
import { NutritionPlanEditor } from "./nutrition-plan-editor";
import { NutritionReviewDialog } from "./nutrition-review-dialog";
import "../nutrition.css";

export function NutritionPatientDetail({ patientId }: { patientId: string }) {
  const t = useT();
  const { user } = useAuth();
  const { can } = useAppContext();
  const load = useCallback((signal: AbortSignal, scope: NutritionScope) => fetchNutritionWorkspace(patientId, signal, scope), [patientId]);
  const { data, scope, loading, error, retry } = useNutritionResource(load);
  useBreadcrumbTitle(data?.patient?.patientName ?? null);
  if (loading) return <NutritionSkeleton />;
  if (error) return <div className="p-6"><NutritionError retry={retry} /></div>;
  if (!data?.patient) return <div className="nutrition-module mx-auto max-w-7xl space-y-6 p-6"><NutritionDemoNotice /><h1 className="nutrition-display text-2xl font-semibold">{t("Paciente no disponible en esta demostración")}</h1><p className="text-muted-foreground">{t("Abre uno de los pacientes sintéticos de la bandeja. No se generan datos para identificadores reales.")}</p><Link className="nutrition-link" href="/nutrition">{t("Volver a la bandeja")}</Link></div>;
  return <PatientWorkspace key={`${scope.userId}:${scope.clinicId}:${patientId}:${can("Nutrition.Manage")}:${can("Nutrition.Approve")}`} initial={data.patient} catalog={data.catalog} scope={scope} actor={{ id: user?.id ?? "", name: user?.name ?? t("Profesional demo") }} canManage={can("Nutrition.Manage")} canApprove={can("Nutrition.Approve")} canViewProgram={can("Program.View")} />;
}

function PatientWorkspace({ initial, catalog, scope, actor, canManage, canApprove, canViewProgram }: { initial: PatientDetail; catalog: NutritionFood[]; scope: NutritionScope; actor: NutritionActor; canManage: boolean; canApprove: boolean; canViewProgram: boolean }) {
  const t = useT();
  const { lang } = useI18n();
  const { patient, editable, updateCycle, saveStatus, busy, actionError, act, retrySave } = useNutritionEditor(initial, scope, actor, canManage, canApprove);
  const [review, setReview] = useState<"approve" | "return" | null>(null);
  const cycle = patient.cycle;
  const returnComment = patient.audit.find((entry) => entry.action === "returned" && entry.version === cycle?.version)?.comment;
  const autoApproved = patient.audit.some((entry) => entry.action === "approved" && entry.version === cycle?.version && entry.autoApproved);
  const labels = { created: "Borrador creado", saved: "Borrador guardado", submitted: "Enviado a aprobación", approved: "Plan aprobado en demo", returned: "Plan devuelto", version_created: "Nueva versión creada", regenerated: "Menú demo regenerado" };
  return <div className="nutrition-module nutrition-workspace mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/nutrition" className="nutrition-link"><ArrowLeft aria-hidden="true" className="size-4" />{t("Volver a la bandeja")}</Link>{canViewProgram && patient.profile.programPatientId && <Link className="nutrition-link" href={`/program/gestion?view=perfil-360&patient=${encodeURIComponent(patient.profile.programPatientId)}`}>{t("Ver Perfil 360 del programa")}</Link>}</div>
    <header className="flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><h1 className="nutrition-display break-words text-3xl font-semibold sm:text-4xl">{patient.patientName}</h1><p className="mt-3 text-sm text-muted-foreground">{patient.patientDocument ?? t("Sin documento")}</p><div className="mt-4 flex flex-wrap items-center gap-3"><NutritionStateChip state={cycle?.state ?? "sin_plan"} />{cycle && <span className="nutrition-measure text-sm">{t("Versión {version}", { version: String(cycle.version) })}</span>}{cycle?.provisional && <span className="nutrition-chip" data-status="informational">{t("Provisional")}</span>}{autoApproved && <span className="nutrition-chip" data-status="aprobado">{t("Auto-aprobado")}</span>}</div></div>
      <div className="flex flex-wrap gap-3">{cycle?.state === "aprobado" && canManage && <Button variant="outline" disabled={busy} onClick={() => void act("new-version")}>{t("Crear nueva versión demo")}</Button>}{cycle && ["borrador_ia", "devuelto"].includes(cycle.state) && canManage && <Button disabled={busy || saveStatus !== "saved" || !cycleIsComplete(cycle, catalog)} onClick={() => void act("submit")}>{t("Enviar a aprobación demo")}</Button>}{cycle?.state === "en_aprobacion" && canApprove && <><Button variant="outline" disabled={busy} onClick={() => setReview("return")}>{t("Devolver con comentario")}</Button><Button disabled={busy} onClick={() => setReview("approve")}>{t("Aprobar plan demo")}</Button></>}</div>
    </header>
    <NutritionDemoNotice />
    {canApprove && patient.nextPendingPatientId && cycle && ["aprobado", "devuelto"].includes(cycle.state) && <Link className="nutrition-link self-start" href={`/nutrition/${encodeURIComponent(patient.nextPendingPatientId)}`}>{t("Revisar siguiente pendiente")}</Link>}
    <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">{t(saveStatus === "saving" ? "Guardando borrador demo…" : saveStatus === "error" ? "No se guardaron los últimos cambios." : "Guardado en esta sesión demo")}{saveStatus === "error" && <Button variant="outline" onClick={retrySave}>{t("Reintentar guardado")}</Button>}</div>
    {actionError && !review && <p role="alert" className="nutrition-notice">{t("No pudimos completar la acción. Revisa el guardado e inténtalo de nuevo.")}</p>}
    <NutritionClinicalHeader profile={patient.profile} />
    {cycle?.provisional && <section className="nutrition-notice"><h2 className="font-semibold">{t("Plan provisional")}</h2><p className="mt-2 text-sm">{cycle.provisionalReason ? t(cycle.provisionalReason) : t("Batería de tests pendiente.")}</p><p className="mt-2 text-sm">{t("Al completar los tests se podrá regenerar con el perfil medido. Conserva los ajustes para revisarlos antes de reemplazar el menú.")}</p>{patient.profile.completedTests === 9 && editable && <Button className="nutrition-ai-button mt-4" variant="outline" onClick={() => void act("regenerate")}><Sparkles aria-hidden="true" className="size-4" />{t("Regenerar menú demo")}</Button>}</section>}
    {returnComment && cycle?.state === "devuelto" && <section className="nutrition-notice"><h2 className="font-semibold">{t("Motivo de devolución")}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{returnComment}</p></section>}
    {cycle ? <>
      <NutritionClinicalAlerts alerts={cycle.alerts} />
      <section className="nutrition-section" aria-labelledby="nutrition-targets-title"><h2 id="nutrition-targets-title" className="nutrition-display text-xl font-semibold">{t("Metas diarias del plan")}</h2><div className="mt-5"><NutritionTargetsPanel targets={cycle.targets} /></div><p className="mt-5 text-sm text-muted-foreground">{t("Vigencia demo: {start} a {end} · zona {zone}", { start: cycle.startDate ?? t("Sin definir"), end: cycle.endDate ?? t("Sin definir"), zone: cycle.patientTimeZone })}</p></section>
      {patient.publishedCycle && <section className="nutrition-notice"><h2 className="font-semibold">{t("Versión publicada en demo: v{version}", { version: String(patient.publishedCycle.version) })}</h2><p className="mt-2 text-sm">{t("El borrador no cambia esta copia hasta una nueva aprobación.")}</p><details className="mt-3"><summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">{t("Ver copia publicada demo")}</summary><div className="mt-4"><NutritionTargetsPanel targets={patient.publishedCycle.targets} /><p className="mt-4 whitespace-pre-wrap break-words text-sm">{patient.publishedCycle.instructions}</p></div></details></section>}
      <NutritionPlanEditor cycle={cycle} catalog={catalog} editable={editable} update={updateCycle} regenerate={() => void act("regenerate")} />
    </> : <section className="nutrition-section"><h2 className="nutrition-display text-xl font-semibold">{t("Este paciente aún no tiene plan")}</h2><p className="my-4 text-sm text-muted-foreground">{t("Puedes crear una propuesta sintética para explorar el editor. No se utiliza información clínica real.")}</p>{canManage && <Button variant="outline" className="nutrition-ai-button" disabled={busy} onClick={() => void act("create")}><Sparkles aria-hidden="true" className="size-4" />{t("Generar propuesta demo con IA simulada")}</Button>}</section>}
    <section className="nutrition-section" aria-labelledby="nutrition-audit-title"><h2 id="nutrition-audit-title" className="nutrition-display text-xl font-semibold">{t("Bitácora demo")}</h2>{patient.audit.length ? <ol className="mt-5 divide-y divide-border">{patient.audit.map((entry) => <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><p className="font-medium">{t(labels[entry.action])} · {t("v{version}", { version: String(entry.version) })}</p><p className="mt-1 text-sm text-muted-foreground">{entry.actorName} · <time dateTime={entry.occurredAt}>{new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.occurredAt))}</time></p>{entry.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.comment}</p>}{entry.criticalAlertsConfirmed > 0 && <p className="mt-2 text-sm text-muted-foreground">{t("{count} alertas críticas confirmadas", { count: String(entry.criticalAlertsConfirmed) })}</p>}</div>{entry.autoApproved && <span className="nutrition-chip" data-status="aprobado">{t("Auto-aprobado")}</span>}</li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">{t("Sin acciones registradas")}</p>}</section>
    {review && cycle && canApprove && <NutritionReviewDialog mode={review} patient={patient} catalog={catalog} busy={busy} failed={actionError} onClose={() => setReview(null)} onConfirm={(options) => act(review, options)} />}
  </div>;
}
