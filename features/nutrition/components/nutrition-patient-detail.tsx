"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  Flame,
  Layers,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-provider";
import { useAppContext } from "@/providers/context-provider";
import { useI18n, useT } from "@/providers/i18n-provider";
import { useNutritionResource } from "../hooks/use-nutrition-resource";
import { useNutritionEditor } from "../hooks/use-nutrition-editor";
import { fetchNutritionWorkspace } from "../services/nutrition-service";
import {
  cycleIsComplete,
  mealDefinitions,
} from "../lib/nutrition-calculations";
import type {
  NutritionAction,
  NutritionActionOptions,
  NutritionFood,
  NutritionPatientDetail as PatientDetail,
} from "../types/nutrition";
import {
  NutritionError,
  NutritionIssueMessage,
  NutritionSkeleton,
} from "./nutrition-feedback";
import {
  NutritionStateChip,
  NutritionTargetsPanel,
  NutritionValidity,
} from "./nutrition-shared";
import { NutritionGenerateForm } from "./nutrition-generate-form";
import {
  NutritionClinicalAlerts,
  NutritionClinicalHeader,
} from "./nutrition-clinical-profile";
import { NutritionPlanEditor } from "./nutrition-plan-editor";
import { NutritionDisclaimer } from "./nutrition-disclaimer";
import { NutritionReviewDialog } from "./nutrition-review-dialog";
import {
  NutritionMonthEnergy,
  NutritionVerification,
} from "./nutrition-plan-verification";
import {
  groupNutritionCycles,
  NutritionProgramCycles,
} from "./nutrition-program-cycles";
import { NutritionCycleSwitcher } from "./nutrition-cycle-switcher";
import "../nutrition.css";

type DetailTab = "resultados" | "programacion" | "plan";
interface DetailProps {
  patientId: string;
  prescriptionId?: string;
  onBack?: () => void;
  onNavigationLock?: (locked: boolean) => void;
  onPlanChanged?: () => void;
  onOpenPrescription?: (
    id: string,
    history?: boolean,
    keepTab?: DetailTab,
  ) => void;
  /** Tras una acción que cambia la prescripción activa, sincroniza bandeja y URL sin duplicar controles. */
  onPrescriptionActive?: (id: string) => void;
}

export function NutritionPatientDetail({
  patientId,
  prescriptionId,
  onBack,
  onNavigationLock,
  onPlanChanged,
  onOpenPrescription,
  onPrescriptionActive,
}: DetailProps) {
  const { can } = useAppContext();
  const load = useCallback(
    (signal: AbortSignal) =>
      fetchNutritionWorkspace(patientId, signal, prescriptionId),
    [patientId, prescriptionId],
  );
  const { data, scope, loading, error, retry } = useNutritionResource(load);
  useBreadcrumbTitle(data?.patient?.patientName ?? null);
  if (loading) return <NutritionSkeleton />;
  if (error)
    return (
      <div className="p-5">
        <NutritionError retry={retry} issue={error} />
      </div>
    );
  if (!data?.patient) return <NutritionError retry={retry} />;
  return (
    <PatientWorkspace
      key={`${scope.userId}:${scope.clinicId}:${patientId}:${prescriptionId ?? ""}`}
      initial={data.patient}
      catalog={data.catalog}
      canManage={can("Nutrition.Manage")}
      canApprove={can("Nutrition.Approve")}
      onBack={onBack}
      onNavigationLock={onNavigationLock}
      onPlanChanged={onPlanChanged}
      onOpenPrescription={onOpenPrescription}
      onPrescriptionActive={onPrescriptionActive}
    />
  );
}

function PatientWorkspace({
  initial,
  catalog,
  canManage,
  canApprove,
  onBack,
  onNavigationLock,
  onPlanChanged,
  onOpenPrescription,
  onPrescriptionActive,
}: {
  initial: PatientDetail;
  catalog: NutritionFood[];
  canManage: boolean;
  canApprove: boolean;
  onBack?: () => void;
  onNavigationLock?: (locked: boolean) => void;
  onPlanChanged?: () => void;
  onOpenPrescription?: (
    id: string,
    history?: boolean,
    keepTab?: DetailTab,
  ) => void;
  onPrescriptionActive?: (id: string) => void;
}) {
  const t = useT();
  const { lang } = useI18n();
  const {
    patient,
    editable,
    updateCycle,
    saveStatus,
    saveError,
    busy,
    actionError,
    reloadRequired,
    act,
    retrySave,
  } = useNutritionEditor(initial, catalog, canManage, canApprove);
  const [review, setReview] = useState<"approve" | "return" | null>(null);
  const [tab, setTab] = useState<DetailTab>(() => {
    const value =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null;
    return value === "plan" || value === "programacion" ? value : "resultados";
  });
  const auditRef = useRef<HTMLDetailsElement>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("history") === "1" &&
      auditRef.current
    ) {
      auditRef.current.open = true;
      auditRef.current.scrollIntoView({ block: "start" });
      auditRef.current.querySelector("summary")?.focus();
    }
  }, []);
  useEffect(() => {
    // Al abrir o cambiar de prescripción, el recorrido empieza desde arriba.
    document.querySelector(".nutrition-detail-panel")?.scrollTo?.({ top: 0 });
  }, []);
  const cycle = patient.cycle;
  // La zona no se deduce del ordenador; el workspace nuevo la aportará.
  const today = patient.timeZone
    ? (() => {
        try {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: patient.timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
        } catch {
          return null;
        }
      })()
    : null;
  const headers = (patient.cycleHeaders ?? []).map((header) =>
    header.id === cycle?.id
      ? {
          ...header,
          version: cycle.version,
          state: cycle.state,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          isPublished: cycle.publishedVersionId === cycle.id,
          targets: cycle.targets,
        }
      : header,
  );
  // La etiqueta C1/C2/C3 es presentación; la identidad persistida es cycleId.
  const cycleNumber = groupNutritionCycles(headers).find((group) =>
    group.versions.some((version) => version.id === cycle?.id),
  )?.number;
  function openPrescription(id: string, history = false, keepTab?: DetailTab) {
    if (locked) return;
    if (id !== cycle?.id) {
      // El destino lo define el disparador: "Ver" aterriza en el plan,
      // el selector de ciclo conserva la pestaña actual (keepTab explícito).
      onOpenPrescription?.(id, history, keepTab);
      return;
    }
    changeTab(history ? "resultados" : (keepTab ?? "plan"));
    if (history && auditRef.current) {
      auditRef.current.open = true;
      requestAnimationFrame(() => {
        auditRef.current?.scrollIntoView({ block: "start" });
        auditRef.current?.querySelector("summary")?.focus();
      });
    }
  }
  const criticalCount =
    cycle?.alerts.filter((alert) => alert.severity === "critical").length ?? 0;
  const locked = busy || saveStatus !== "saved" || reloadRequired;
  useEffect(() => {
    onNavigationLock?.(locked);
    return () => onNavigationLock?.(false);
  }, [locked, onNavigationLock]);

  function changeTab(value: DetailTab) {
    setTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  }
  async function run(
    action: NutritionAction,
    options: NutritionActionOptions = {},
  ): Promise<boolean> {
    const updated = await act(action, options);
    if (updated && ["create", "new-version", "regenerate"].includes(action))
      changeTab("plan");
    if (updated && action === "submit") changeTab("programacion");
    if (updated) {
      // El estado local y la URL viajan juntos; sin esto, volver a una
      // prescripción ya montada se percibe como un no-op.
      onPrescriptionActive?.(updated.cycle?.id ?? "");
      onPlanChanged?.();
    }
    return !!updated;
  }
  const returnComment = patient.audit.find(
    (entry) => entry.action === "returned" && entry.version === cycle?.version,
  )?.comment;
  const labels = {
    created: "Borrador creado",
    saved: "Borrador guardado",
    submitted: "Preparado para publicar",
    approved: "Plan aprobado",
    published: "Plan publicado",
    returned: "Plan devuelto",
    version_created: "Nueva versión creada",
    regenerated: "Propuesta regenerada",
    publication_replaced: "Publicación sustituida",
  };

  return (
    <div className="nutrition-detail-body">
      <div className="nutrition-detail-toolbar">
        <Button
          variant="ghost"
          size="sm"
          disabled={locked}
          onClick={() => onBack?.()}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("Volver a la bandeja")}
        </Button>
        <span role="status" className="text-xs text-muted-foreground">
          {t(
            saveStatus === "saving"
              ? "Guardando borrador…"
              : saveStatus === "error"
                ? "No se guardaron los últimos cambios."
                : "Todos los cambios guardados",
          )}
        </span>
      </div>
      <header className="nutrition-detail-header">
        <div className="nutrition-header-identity min-w-0">
          <h2 className="nutrition-display nutrition-patient-title">
            {patient.patientName}
          </h2>
          <p className="nutrition-measure mt-1 text-xs text-muted-foreground">
            {patient.patientDocument ?? t("Sin documento")}
          </p>
        </div>
          <div className="nutrition-header-state flex flex-wrap items-center gap-2">
            <NutritionStateChip state={cycle?.state ?? "sin_plan"} />
            {cycle && headers.length < 2 && (
              <span className="nutrition-measure text-xs">
                {t("Versión {version}", { version: String(cycle.version) })}
                {cycleNumber &&
                  ` · ${t("Ciclo {cycle}", { cycle: String(cycleNumber) })}`}
              </span>
            )}
            {cycle?.provisional && (
              <span className="nutrition-chip" data-status="informational">
                {t("Provisional")}
              </span>
            )}
          </div>
        <div className="nutrition-detail-actions">
          {!cycle && canManage && (
            <Button onClick={() => changeTab("plan")}>
              {t("Crear propuesta")}
            </Button>
          )}
          {cycle?.state === "aprobado" && canManage && (
            <Button
              variant="outline"
              disabled={locked}
              onClick={() => void run("new-version")}
            >
              {t("Crear nueva versión")}
            </Button>
          )}
          {cycle &&
            ["borrador_ia", "devuelto", "en_aprobacion"].includes(cycle.state) &&
            canManage && (
              <Button
                disabled={locked || !cycleIsComplete(cycle, catalog)}
                onClick={() => void run("publish")}
              >
                {t("Publicar plan")}
              </Button>
            )}
          {cycle?.state === "en_aprobacion" && canApprove && (
            <>
              <Button
                variant="outline"
                disabled={locked}
                onClick={() => setReview("return")}
              >
                {t("Devolver con comentario")}
              </Button>

            </>
          )}
        </div>
      </header>
      {cycle && <NutritionDisclaimer />}
      {saveError && <NutritionIssueMessage issue={saveError} />}
      {saveStatus === "error" && !reloadRequired && (
        <Button variant="outline" onClick={retrySave}>
          {t("Reintentar guardado")}
        </Button>
      )}
      {actionError && !review && <NutritionIssueMessage issue={actionError} />}
      {reloadRequired && (
        <div className="nutrition-notice">
          <p>
            {t(
              "No se pudo confirmar el resultado. Recarga la ficha antes de reintentar.",
            )}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("Recargar ficha")}
          </Button>
        </div>
      )}
      {patient.identityIssue && (
        <NutritionIssueMessage issue={patient.identityIssue} />
      )}
      {returnComment && cycle?.state === "devuelto" && (
        <div className="nutrition-notice">
          <strong>{t("Motivo de devolución")}</strong>
          <p>{returnComment}</p>
        </div>
      )}
      <NutritionCycleSwitcher
        cycle={cycle}
        headers={headers}
        publishedId={patient.publishedCycle?.id ?? null}
        locked={locked}
        onOpen={(id) => openPrescription(id, false, tab)}
      />
      <Tabs
        value={tab}
        onValueChange={(value) => changeTab(value as DetailTab)}
        className="nutrition-detail-tabs"
      >
        <div className="nutrition-context-bar">
        <TabsList
          variant="line"
          aria-label={t("Secciones de la ficha nutricional")}
          className="nutrition-tab-list"
        >
          <TabsTrigger value="resultados">
            <Activity className="size-4" aria-hidden="true" />
            {t("Resultados y ciclos")}
          </TabsTrigger>
          <TabsTrigger value="programacion">
            <CalendarDays className="size-4" aria-hidden="true" />
            {t("Programación")}
          </TabsTrigger>
          <TabsTrigger value="plan">
            <FileText className="size-4" aria-hidden="true" />
            {t("Plan de 30 días")}
          </TabsTrigger>
        </TabsList>
        <div ref={setToolbarHost} hidden={tab !== "plan" || !cycle} />
        </div>
        <TabsContent value="resultados" keepMounted>
          <div className="nutrition-tab-body">
            <NutritionProgramCycles
              headers={headers}
              selectedId={cycle?.id}
              today={today}
              locked={locked}
              onOpen={openPrescription}
              onCreate={
                canManage && !cycle ? () => changeTab("plan") : undefined
              }
            />
            {cycle && (
              <div className="nutrition-overview-stats">
                <StatCard
                  label={t("Meta diaria")}
                  value={cycle.targets.kcal}
                  suffix=" kcal"
                  icon={Flame}
                  variant="primary"
                />
                <StatCard
                  label={t("Versión")}
                  value={String(cycle.version)}
                  icon={Layers}
                  variant="info"
                />
                <StatCard
                  label={t("Alertas críticas")}
                  value={String(criticalCount)}
                  icon={ShieldAlert}
                  variant={criticalCount ? "destructive" : "success"}
                />
              </div>
            )}
            <NutritionReadings patient={patient} />
            {cycle ? (
              <>
                {cycle.provisional && (
                  <div className="nutrition-provisional">
                    <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                    <div>
                      <strong>{t("Plan provisional")}</strong>
                      <p>
                        {t(
                          "Los datos pendientes requieren revisión profesional.",
                        )}
                      </p>
                      {cycle.canRegenerate && editable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void run("regenerate")}
                        >
                          {t("Regenerar propuesta")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <NutritionClinicalAlerts alerts={cycle.alerts} />
                <section className="nutrition-section">
                  <SectionHeader
                    title={t("Resultados y ciclos")}
                    icon={Layers}
                    variant="tertiary"
                  />
                  <div className="nutrition-cycle-summary">
                    <NutritionStateChip state={cycle.state} />
                    <span className="nutrition-measure">
                      {t("Versión {version}", {
                        version: String(cycle.version),
                      })}
                    </span>
                    <NutritionValidity
                      start={cycle.startDate}
                      end={cycle.endDate}
                    />
                  </div>
                  {patient.publishedCycle && (
                    <details className="nutrition-disclosure">
                      <summary>
                        {t("Versión publicada: v{version}", {
                          version: String(patient.publishedCycle.version),
                        })}
                      </summary>
                      <p className="my-3 text-xs text-muted-foreground">
                        {t(
                          "El borrador no cambia esta copia hasta una nueva publicación.",
                        )}
                      </p>
                      <NutritionTargetsPanel
                        targets={patient.publishedCycle.targets}
                      />
                      <p className="mt-4 whitespace-pre-wrap text-sm">
                        {patient.publishedCycle.instructions}
                      </p>
                    </details>
                  )}
                </section>
              </>
            ) : (
              <div className="nutrition-empty-plan">
                <ClipboardCheck
                  className="size-7 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3>{t("Sin plan nutricional")}</h3>
                <p>
                  {t(
                    "Revisa las lecturas y prepara la primera propuesta para este paciente.",
                  )}
                </p>
                {canManage && (
                  <Button variant="outline" onClick={() => changeTab("plan")}>
                    {t("Crear propuesta")}
                  </Button>
                )}
              </div>
            )}
            <details className="nutrition-disclosure nutrition-section">
              <summary>{t("Perfil clínico completo")}</summary>
              <NutritionClinicalHeader profile={patient.profile} />
            </details>
            <details
              ref={auditRef}
              className="nutrition-disclosure nutrition-section"
            >
              <summary>
                {t("Bitácora del plan")}{" "}
                <span className="nutrition-measure">
                  ({patient.audit.length})
                </span>
              </summary>
              {patient.auditIssue && (
                <NutritionIssueMessage issue={patient.auditIssue} />
              )}
              {patient.audit.length ? (
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Fecha")}</TableHead>
                      <TableHead>{t("Acción")}</TableHead>
                      <TableHead>{t("Versión")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.audit.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-normal text-xs">
                          <time dateTime={entry.occurredAt}>
                            {new Intl.DateTimeFormat(
                              lang === "en" ? "en-US" : "es-CO",
                              { dateStyle: "short" },
                            ).format(new Date(entry.occurredAt))}
                          </time>
                        </TableCell>
                        <TableCell className="whitespace-normal text-xs">
                          {t(labels[entry.action])}
                          {entry.comment && (
                            <p className="mt-1 break-words text-muted-foreground">
                              {entry.comment}
                            </p>
                          )}
                          {entry.criticalAlertsConfirmed > 0 && (
                            <p className="mt-1 text-muted-foreground">
                              {t("{count} alertas críticas confirmadas", {
                                count: String(entry.criticalAlertsConfirmed),
                              })}
                            </p>
                          )}
                          {entry.action === "approved" && entry.autoApproved && (
                            <span
                              className="mt-1 block text-xs text-muted-foreground"
                            >
                              {t("Aprobado por el mismo profesional que creó la versión")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="nutrition-measure">
                          v{entry.version}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("Sin acciones registradas")}
                </p>
              )}
            </details>
          </div>
        </TabsContent>
        <TabsContent value="programacion" keepMounted>
          <div className="nutrition-tab-body">
            <section className="nutrition-section">
              <SectionHeader
                title={t("Programación del ciclo")}
                icon={CalendarDays}
                variant="tertiary"
              />
              <div className="nutrition-cycle-summary">
                <NutritionValidity
                  start={cycle?.startDate ?? null}
                  end={cycle?.endDate ?? null}
                />
                <span className="text-xs text-muted-foreground">
                  {patient.timeZone || t("Zona sin definir")}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t(
                  "La vigencia se confirma al publicar. Cada ciclo comprende 30 días.",
                )}
              </p>
              <div className="nutrition-meal-schedule">
                {mealDefinitions.map((meal) => (
                  <div key={meal.type}>
                    <Clock
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>{t(meal.label)}</span>
                    <strong className="nutrition-measure">{meal.time}</strong>
                  </div>
                ))}
              </div>
            </section>
            {cycle && (
              <section className="nutrition-section">
                <SectionHeader
                  title={t("Revisión del plan")}
                  icon={ClipboardCheck}
                  variant="tertiary"
                />
                <NutritionVerification cycle={cycle} catalog={catalog} />
                <NutritionMonthEnergy cycle={cycle} catalog={catalog} />
                <p className="my-4 text-xs text-muted-foreground">
                  {t(
                    "Esta comprobación estructural no sustituye la revisión clínica.",
                  )}
                </p>

              </section>
            )}
          </div>
        </TabsContent>
        <TabsContent value="plan" keepMounted>
          <div className="nutrition-tab-body">
            {cycle ? (
              <NutritionPlanEditor
                cycle={cycle}
                toolbarHost={toolbarHost}
                context={<div className="nutrition-editor-context"><span className="nutrition-context-patient">{patient.patientName}</span><span>{t(saveStatus === "saving" ? "Guardando borrador…" : saveStatus === "error" ? "No se guardaron los últimos cambios." : "Todos los cambios guardados")}</span></div>}
                catalog={catalog}
                editable={editable}
                update={updateCycle}
                regenerate={() => void run("regenerate")}
                applyDay={(sourceDay) => run("apply-day", { sourceDay })}
              />
            ) : (
              <section className="nutrition-section">
                <SectionHeader
                  title={t("Este paciente aún no tiene plan")}
                  icon={BookOpen}
                  variant="tertiary"
                />
                {canManage && (
                  <NutritionGenerateForm
                    profile={patient.profile}
                    busy={busy || reloadRequired}
                    onGenerate={(generate) => run("create", { generate })}
                  />
                )}
              </section>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {review && cycle && canApprove && (
        <NutritionReviewDialog
          key={`${cycle.id}:${review}`}
          mode={review}
          patient={patient}
          catalog={catalog}
          busy={busy}
          failed={actionError}
          reloadRequired={reloadRequired}
          onClose={() => setReview(null)}
          onConfirm={(options) => run(review, options)}
        />
      )}
    </div>
  );
}

function NutritionReadings({ patient }: { patient: PatientDetail }) {
  const t = useT();
  const { can } = useAppContext();
  const p = patient.profile;
  const readings = [
    { label: "Peso", value: p.weightKg, unit: "kg" },
    { label: "Talla", value: p.heightCm, unit: "cm" },
    { label: "IMC", value: p.bmi, unit: "" },
    { label: "HbA1c", value: p.hba1c, unit: "%" },
  ];
  return (
    <section className="nutrition-section nutrition-readings">
      <SectionHeader
        title={t("Lecturas")}
        description={t("Mediciones disponibles para la revisión")}
        icon={Activity}
        variant="tertiary"
      />
      <dl>
        {readings.map((reading) => (
          <div key={reading.label}>
            <dt>{t(reading.label)}</dt>
            <dd className="nutrition-measure">
              {reading.value == null ? "—" : `${reading.value} ${reading.unit}`}
            </dd>
          </div>
        ))}
      </dl>
      <div className="nutrition-readings-foot">
        <span>
          {t(
            "Sin medición disponible se muestra un guion, no un resultado normal.",
          )}
        </span>
        {(can("HealthTests.View") || can("HealthTests.ViewPatients")) && (
          <Link
            className="nutrition-link"
            href={`/health-tests/pacientes/${encodeURIComponent(patient.patientId)}`}
          >
            {t("Ver resultados de salud")}
          </Link>
        )}
      </div>
    </section>
  );
}
