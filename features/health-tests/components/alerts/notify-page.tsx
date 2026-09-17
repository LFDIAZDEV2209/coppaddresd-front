"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquare,
  Search,
  Send,
  Smartphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDate } from "../../lib/format";
import { useAlerts } from "../../hooks/use-health-tests";
import { useNotificationTemplates } from "../../hooks/use-notifications";
import {
  NOTIFICATION_PLACEHOLDERS,
  notificationsApi,
} from "../../services/notifications-service";
import type { NotificationTemplatePreview } from "../../services/notifications-service";
import type {
  AlertSeverity,
  AlertStatus,
  HealthAlert,
  NotificationChannel,
  NotificationLanguage,
  NotifyAlertItemResult,
  PatientProfile,
} from "../../types";
import { SeverityBadge } from "../shared/badges";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";

type WizardStep = 1 | 2 | 3;

const PICKER_PAGE_SIZE = 10;

/** Clave de sessionStorage donde la página de alertas entrega la selección. */
export const NOTIFY_SELECTION_KEY = "ht-notify-alert-ids";

/** Lee la selección que dejó la página de alertas (sessionStorage, URL limpia). */
function readStoredSelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(NOTIFY_SELECTION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

// Referencias estables mientras no hay datos (evita memos que cambian en cada render).
const EMPTY_ALERTS: HealthAlert[] = [];
const EMPTY_PATIENTS: PatientProfile[] = [];

const STATUS_LABELS: Record<AlertStatus, string> = {
  activa: "Activa",
  "en-revision": "En revisión",
  atendida: "Atendida",
  cerrada: "Cerrada",
};

const RESULT_META: Record<
  string,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  sent: { icon: CheckCircle2, className: "text-success", label: "Enviada" },
  queued: { icon: Send, className: "text-muted-foreground", label: "En cola" },
  skipped: { icon: XCircle, className: "text-warning", label: "Omitida" },
  failed: { icon: TriangleAlert, className: "text-destructive", label: "Fallida" },
};

/** Segmentos SMS (GSM-7): 160 en un solo mensaje, 153 por segmento encadenado. */
function smsSegments(body: string): number {
  return body.length <= 160 ? 1 : Math.ceil(body.length / 153);
}

/** Cuerpo de la plantilla en el idioma pedido (fallback al español si falta EN). */
function templateBodyFor(
  template: { bodyTemplateEs: string; bodyTemplateEn: string | null },
  language: NotificationLanguage,
): string {
  return language === "en"
    ? (template.bodyTemplateEn ?? template.bodyTemplateEs)
    : template.bodyTemplateEs;
}

export function NotifyPage() {
  const t = useT();
  const { data, loading, error, reload } = useAlerts();
  const { data: templates } = useNotificationTemplates({ isActive: true });

  const [step, setStep] = useState<WizardStep>(1);
  const [alertIds, setAlertIds] = useState<string[]>(readStoredSelection);
  const [channels, setChannels] = useState<NotificationChannel[]>(["community"]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState<NotificationLanguage>("es");
  const [results, setResults] = useState<NotifyAlertItemResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Filtros del selector de alertas
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all");
  const [status, setStatus] = useState<AlertStatus | "all">("all");
  const [indicator, setIndicator] = useState<string>("all");
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: "",
    page: 1,
  });

  // La selección ya quedó en memoria: se limpia la clave para no re-sembrar.
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(NOTIFY_SELECTION_KEY);
    } catch {
      // sessionStorage no disponible: sin efecto.
    }
  }, []);

  const alerts = data?.alerts ?? EMPTY_ALERTS;
  const patients = data?.patients ?? EMPTY_PATIENTS;

  const indicators = useMemo(
    () => Array.from(new Set(alerts.map((alert) => alert.indicatorName))).sort(),
    [alerts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (severity !== "all" && alert.severity !== severity) return false;
      if (status !== "all" && alert.status !== status) return false;
      if (indicator !== "all" && alert.indicatorName !== indicator) return false;
      if (term) {
        const patient = patients.find((item) => item.id === alert.patientId);
        const haystack = [
          patient ? `${patient.firstName} ${patient.lastName}`.trim() : "",
          alert.indicatorName,
          alert.message,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [alerts, patients, severity, status, indicator, search]);

  const filterKey = [search, severity, status, indicator].join("\u0000");
  const pageCount = Math.max(1, Math.ceil(filtered.length / PICKER_PAGE_SIZE));
  const currentPage = Math.min(
    pageState.key === filterKey ? pageState.page : 1,
    pageCount,
  );
  const pagedAlerts = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * PICKER_PAGE_SIZE,
        currentPage * PICKER_PAGE_SIZE,
      ),
    [filtered, currentPage],
  );

  const selectedAlerts = useMemo(
    () => alerts.filter((alert) => alertIds.includes(alert.id)),
    [alerts, alertIds],
  );
  const allPageSelected =
    pagedAlerts.length > 0 && pagedAlerts.every((alert) => alertIds.includes(alert.id));

  function toggleAlert(id: string) {
    setAlertIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function togglePage() {
    const pageIds = pagedAlerts.map((alert) => alert.id);
    setAlertIds((current) =>
      allPageSelected
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds])),
    );
  }

  function toggleChannel(channel: NotificationChannel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  function applyTemplate(id: string) {
    setTemplateId(id === "none" ? null : id);
    const template = (templates ?? []).find((item) => item.id === id);
    if (template) setBody(templateBodyFor(template, language));
  }

  function changeLanguage(next: NotificationLanguage) {
    setLanguage(next);
    const template = (templates ?? []).find((item) => item.id === templateId);
    if (template) setBody(templateBodyFor(template, next));
  }

  function insertPlaceholder(placeholder: string) {
    setBody((current) => `${current}[${placeholder}]`);
  }

  // Alcanzabilidad en vivo: vista previa real (no envía ni registra nada).
  const [reachability, setReachability] = useState<{
    key: string;
    items: NotifyAlertItemResult[];
  } | null>(null);
  const reachabilityKey = `${alertIds.slice().sort().join(",")}|${channels.slice().sort().join(",")}`;

  useEffect(() => {
    if (alertIds.length === 0 || channels.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await notificationsApi.notify({
            alertIds,
            channels,
            templateId,
            bodyOverride: body.trim() === "" ? null : body,
            language,
            preview: true,
          });
          if (!cancelled) setReachability({ key: reachabilityKey, items: result.items });
        } catch {
          if (!cancelled) setReachability(null);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [alertIds, channels, templateId, body, language, reachabilityKey]);

  const reachabilityItems =
    reachability && reachability.key === reachabilityKey ? reachability.items : null;
  const reachableCount =
    reachabilityItems?.filter((item) => item.status !== "skipped").length ?? null;
  const skippedItems = reachabilityItems?.filter((item) => item.status === "skipped") ?? [];

  async function run(preview: boolean) {
    setBusy(true);
    setSendError(null);
    try {
      const result = await notificationsApi.notify({
        alertIds,
        channels,
        templateId,
        bodyOverride: body.trim() === "" ? null : body,
        language,
        preview,
      });
      setResults(result.items);
    } catch {
      setSendError(t("No se pudo completar el envío. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    const rows: string[][] = [
      ["Paciente", "Canal", "Idioma", "Estado", "Motivo", "Mensaje"],
    ];
    for (const item of results ?? []) {
      rows.push([
        item.patientName ?? "",
        item.channel,
        item.language,
        RESULT_META[item.status]?.label ?? item.status,
        item.reason ?? "",
        item.renderedBody,
      ]);
    }
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "notificaciones.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const canStep1 = alertIds.length > 0 && channels.length > 0;
  const canStep2 = body.trim() !== "" || templateId !== null;

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={3} />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title={t("Notificar a pacientes")}
          description={t("Envía el resultado de las alertas seleccionadas por comunidad o SMS.")}
          icon={BellRing}
        />
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Notificar a pacientes")}
        description={t("Envía el resultado de las alertas seleccionadas por comunidad o SMS.")}
        icon={BellRing}
        actions={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/health-tests/alertas" />}>
            <ChevronLeft className="size-3.5" />
            {t("Volver a alertas")}
          </Button>
        }
      />

      <WizardSteps
        step={step}
        canStep1={canStep1}
        canStep2={canStep2}
        onStep={(next) => setStep(next)}
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-8">
          {step === 1 && (
            <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <SectionHeader
                title={t("Destinatarios")}
                description={t("Elige las alertas y los canales de envío")}
                icon={Search}
                variant="primary"
                actions={
                  <span className="text-[11.5px] text-white/80">
                    {filtered.length} {t("alertas")}
                  </span>
                }
              />
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <div className="relative min-w-[12rem] flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("Buscar...")}
                    aria-label={t("Buscar alertas")}
                    className="h-9 w-full pl-8"
                  />
                </div>
                <Select
                  value={severity}
                  onValueChange={(value) => setSeverity(value as AlertSeverity | "all")}
                  items={{
                    all: t("Toda severidad"),
                    critica: t("Crítica"),
                    alta: t("Alta"),
                    media: t("Media"),
                    baja: t("Baja"),
                    informativa: t("Informativa"),
                  }}
                >
                  <SelectTrigger className="h-9 w-36" aria-label={t("Filtrar por severidad")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("Toda severidad")}</SelectItem>
                    <SelectItem value="critica">{t("Crítica")}</SelectItem>
                    <SelectItem value="alta">{t("Alta")}</SelectItem>
                    <SelectItem value="media">{t("Media")}</SelectItem>
                    <SelectItem value="baja">{t("Baja")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as AlertStatus | "all")}
                  items={{ all: t("Todo estado"), ...STATUS_LABELS }}
                >
                  <SelectTrigger className="h-9 w-36" aria-label={t("Filtrar por estado")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("Todo estado")}</SelectItem>
                    {(Object.keys(STATUS_LABELS) as AlertStatus[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(STATUS_LABELS[key])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={indicator}
                  onValueChange={(value) => setIndicator(value ?? "all")}
                  items={{
                    all: t("Todo indicador"),
                    ...Object.fromEntries(indicators.map((item) => [item, item])),
                  }}
                >
                  <SelectTrigger className="h-9 w-40" aria-label={t("Filtrar por indicador")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("Todo indicador")}</SelectItem>
                    {indicators.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {pagedAlerts.length === 0 ? (
                <ModuleEmptyState
                  title={t("Sin alertas que mostrar")}
                  description={t("Ninguna alerta coincide con los filtros aplicados.")}
                  filtered
                  onClear={() => {
                    setSearch("");
                    setSeverity("all");
                    setStatus("all");
                    setIndicator("all");
                  }}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="w-10 px-3 py-2">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={allPageSelected}
                              onChange={togglePage}
                              aria-label={t("Seleccionar alertas de esta página")}
                            />
                          </th>
                          <th className="px-2 py-2 font-semibold">{t("Paciente")}</th>
                          <th className="px-2 py-2 font-semibold">{t("Indicador")}</th>
                          <th className="whitespace-nowrap px-2 py-2 font-semibold">
                            {t("Severidad")}
                          </th>
                          <th className="whitespace-nowrap px-2 py-2 font-semibold">
                            {t("Fecha")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedAlerts.map((alert) => {
                          const patient = patients.find((item) => item.id === alert.patientId);
                          const checked = alertIds.includes(alert.id);
                          return (
                            <tr
                              key={alert.id}
                              className={cn(
                                "border-t border-border transition-colors",
                                checked ? "bg-primary-soft/20" : "hover:bg-muted/40",
                              )}
                            >
                              <td className="px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  className="size-4 accent-primary"
                                  checked={checked}
                                  onChange={() => toggleAlert(alert.id)}
                                  aria-label={t("Seleccionar alerta")}
                                />
                              </td>
                              <td className="max-w-[16rem] px-2 py-2.5">
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate font-semibold text-foreground">
                                    {patient
                                      ? `${patient.firstName} ${patient.lastName}`.trim()
                                      : t("Paciente sin nombre")}
                                  </span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    {alert.message}
                                  </span>
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-muted-foreground">
                                {alert.indicatorName}
                              </td>
                              <td className="px-2 py-2.5">
                                <SeverityBadge severity={alert.severity} />
                              </td>
                              <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
                                {formatDate(alert.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {pageCount > 1 && (
                    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                      <span className="text-[11.5px] text-muted-foreground">
                        {t("Página")} {currentPage} {t("de")} {pageCount} · {filtered.length}{" "}
                        {t("alertas")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("Anterior")}
                          disabled={currentPage <= 1}
                          onClick={() =>
                            setPageState({ key: filterKey, page: currentPage - 1 })
                          }
                        >
                          <ChevronLeft className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("Siguiente")}
                          disabled={currentPage >= pageCount}
                          onClick={() =>
                            setPageState({ key: filterKey, page: currentPage + 1 })
                          }
                        >
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </span>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {step === 2 && (
            <StepCompose
              alerts={selectedAlerts}
              patients={patients}
              channels={channels}
              templates={templates ?? []}
              templateId={templateId}
              onTemplateChange={applyTemplate}
              body={body}
              onBodyChange={setBody}
              onInsertPlaceholder={insertPlaceholder}
              language={language}
              onLanguageChange={changeLanguage}
            />
          )}

          {step === 3 && (
            <StepReview
              alerts={selectedAlerts}
              channels={channels}
              language={language}
              templateName={
                (() => {
                  const template = (templates ?? []).find((item) => item.id === templateId);
                  if (!template) return null;
                  return language === "en"
                    ? (template.nameEn ?? template.nameEs)
                    : template.nameEs;
                })()
              }
              results={results}
              previewItems={reachabilityItems}
              onDownloadCsv={downloadCsv}
            />
          )}
        </div>

        <div className="flex flex-col gap-5 xl:sticky xl:top-4 xl:col-span-4 xl:self-start">
          <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <SectionHeader
              title={t("Canales")}
              description={t("Cómo se entrega la notificación")}
              icon={Send}
              variant="primary"
            />
            <div className="flex flex-col gap-3 p-4">
              {(Object.keys(CHANNEL_META) as NotificationChannel[]).map((channel) => {
                const meta = CHANNEL_META[channel];
                const Icon = meta.icon;
                const active = channels.includes(channel);
                const channelReach =
                  reachabilityItems?.filter(
                    (item) => item.channel === channel && item.status !== "skipped",
                  ).length ?? null;
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary-soft/40 shadow-sm ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[13px] font-semibold text-foreground">
                        {t(meta.label)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t(meta.description)}
                      </span>
                    </span>
                    {active && channelReach !== null && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-primary">
                        {channelReach} {t("alcanzables")}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Alcance estimado")}
                </span>
                {alertIds.length === 0 ? (
                  <span className="text-[11.5px] text-muted-foreground">
                    {t("Selecciona alertas para calcular el alcance.")}
                  </span>
                ) : reachableCount === null ? (
                  <span className="text-[11.5px] text-muted-foreground">
                    {t("Calculando alcance...")}
                  </span>
                ) : (
                  <>
                    <span className="text-[12.5px] font-semibold text-foreground">
                      {reachableCount} {t("alcanzables")} · {skippedItems.length}{" "}
                      {t("sin contacto")}
                    </span>
                    {skippedItems.length > 0 && (
                      <ul className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        {Array.from(new Set(skippedItems.map((item) => item.reason))).map(
                          (reason) => (
                            <li key={reason ?? "sin-motivo"} className="flex items-start gap-1.5">
                              <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
                              {reason ?? t("Sin contacto para este canal.")}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </>
                )}
              </div>

              <span className="text-[11px] text-muted-foreground">
                {t("Los pacientes sin el contacto elegido se omitirán y se reportarán.")}
              </span>
            </div>
          </section>

          <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <SectionHeader
              title={t("Resumen")}
              description={t("Selección actual")}
              icon={BellRing}
              variant="primary"
            />
            <div className="grid grid-cols-2 gap-3 p-4">
              <SummaryTile label={t("Pacientes")} value={String(alertIds.length)} />
              <SummaryTile label={t("Canales")} value={String(channels.length)} />
              <SummaryTile
                label={t("Idioma")}
                value={language === "en" ? "English" : t("Español")}
              />
              <SummaryTile
                label={t("Plantilla")}
                value={
                  templateId ? t("Seleccionada") : t("Texto libre")
                }
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((step - 1) as WizardStep)}
                >
                  <ChevronLeft className="size-3.5" />
                  {t("Atrás")}
                </Button>
              )}
              {step < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={step === 1 ? !canStep1 : !canStep2}
                  onClick={() => setStep((step + 1) as WizardStep)}
                >
                  {t("Continuar")}
                  <ChevronRight className="size-3.5" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || !canStep1}
                    onClick={() => void run(true)}
                  >
                    {t("Vista previa")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !canStep1}
                    onClick={() => void run(false)}
                  >
                    <Send className="size-3.5" />
                    {t("Enviar")} {alertIds.length}
                  </Button>
                </>
              )}
              {sendError && (
                <p className="flex items-start gap-1.5 text-[11px] text-destructive">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {sendError}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WizardSteps({
  step,
  canStep1,
  canStep2,
  onStep,
}: {
  step: WizardStep;
  canStep1: boolean;
  canStep2: boolean;
  onStep: (step: WizardStep) => void;
}) {
  const t = useT();
  const steps: { id: WizardStep; label: string; enabled: boolean }[] = [
    { id: 1, label: "Destinatarios", enabled: true },
    { id: 2, label: "Mensaje", enabled: canStep1 },
    { id: 3, label: "Envío", enabled: canStep1 && canStep2 },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((item) => {
        const active = step === item.id;
        const done = step > item.id;
        return (
          <li key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!item.enabled}
              onClick={() => item.enabled && onStep(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-primary/40 bg-primary-soft/40 text-foreground"
                    : "border-border text-muted-foreground",
                !item.enabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-bold",
                  active
                    ? "bg-primary-foreground/20"
                    : done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                )}
              >
                {item.id}
              </span>
              {t(item.label)}
            </button>
            {item.id < 3 && <ChevronRight className="size-3.5 text-muted-foreground" />}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-muted/30 px-3 py-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-[15px] font-bold text-foreground">{value}</span>
    </div>
  );
}

const CHANNEL_META: Record<
  NotificationChannel,
  { icon: typeof Send; label: string; description: string }
> = {
  community: {
    icon: MessageSquare,
    label: "Comunidad (app)",
    description: "Mensaje directo en la app del paciente",
  },
  sms: {
    icon: Smartphone,
    label: "SMS",
    description: "Mensaje de texto al teléfono del paciente",
  },
};

function StepCompose({
  alerts,
  patients,
  channels,
  templates,
  templateId,
  onTemplateChange,
  body,
  onBodyChange,
  onInsertPlaceholder,
  language,
  onLanguageChange,
}: {
  alerts: HealthAlert[];
  patients: { id: string; firstName: string; lastName: string }[];
  channels: NotificationChannel[];
  templates: {
    id: string;
    nameEs: string;
    nameEn: string | null;
    channel: NotificationChannel;
  }[];
  templateId: string | null;
  onTemplateChange: (id: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  onInsertPlaceholder: (placeholder: string) => void;
  language: NotificationLanguage;
  onLanguageChange: (language: NotificationLanguage) => void;
}) {
  const t = useT();

  const primaryChannel = channels[0] ?? "community";
  const firstAlert = alerts[0];
  const firstAlertPatient = patients.find((item) => item.id === firstAlert?.patientId);
  const firstAlertName = firstAlertPatient
    ? `${firstAlertPatient.firstName} ${firstAlertPatient.lastName}`.trim()
    : null;
  const previewTemplateId =
    templateId ??
    templates.find((template) => template.channel === primaryChannel)?.id ??
    templates[0]?.id ??
    null;

  const [previewState, setPreviewState] = useState<{
    id: string;
    data: NotificationTemplatePreview;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!previewTemplateId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setPreviewLoading(true);
        try {
          const data = await notificationsApi.previewTemplate(previewTemplateId, {
            alertId: firstAlert?.id,
            channel: primaryChannel,
            bodyOverride: body.trim() === "" ? undefined : body,
            language,
          });
          if (!cancelled) setPreviewState({ id: previewTemplateId, data });
        } catch {
          if (!cancelled) setPreviewState(null);
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewTemplateId, primaryChannel, firstAlert?.id, body, language]);

  const realPreview =
    previewState && previewState.id === previewTemplateId ? previewState.data : null;
  const previewBody =
    realPreview?.renderedBody ??
    (body.trim() === "" ? t("El mensaje aparecerá aquí mientras escribes.") : body);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <SectionHeader
        title={t("Mensaje")}
        description={t("Elige plantilla, idioma y ajusta el texto")}
        icon={MessageSquare}
        variant="primary"
      />
      <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-5">
        <div className="flex flex-col gap-3 lg:col-span-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">{t("Plantilla")}</span>
              <Tabs
                value={language}
                onValueChange={(value) => onLanguageChange(value as NotificationLanguage)}
              >
                <TabsList variant="line">
                  <TabsTrigger value="es">{t("Español")}</TabsTrigger>
                  <TabsTrigger value="en">{t("English")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Select
              value={templateId ?? "none"}
              onValueChange={(value) => onTemplateChange(value ?? "none")}
            >
              <SelectTrigger aria-label={t("Elegir plantilla")}>
                <SelectValue>{t("Sin plantilla (texto libre)")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("Sin plantilla (texto libre)")}</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {language === "en"
                      ? (template.nameEn ?? template.nameEs)
                      : template.nameEs}{" "}
                    · {template.channel === "sms" ? "SMS" : t("Comunidad")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">{t("Mensaje")}</span>
            <Textarea
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={7}
              placeholder={t("Escribe el mensaje con datos entre corchetes")}
              aria-label={t("Mensaje de la notificación")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("Insertar dato del paciente")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {NOTIFICATION_PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => onInsertPlaceholder(placeholder)}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {`[${placeholder}]`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">{t("Vista previa")}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {firstAlert
                ? `${t("Ejemplo")}: ${firstAlertName ?? t("Paciente")}`
                : t("Sin paciente de ejemplo")}
            </span>
          </div>

          {channels.map((channel) =>
            channel === "sms" ? (
              <div
                key={channel}
                className="mx-auto w-full max-w-[300px] rounded-[26px] border border-border bg-background p-3 shadow-sm"
              >
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
                <div className="rounded-2xl bg-muted px-3 py-2 text-[12.5px] text-foreground">
                  {previewBody}
                </div>
                <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
                  {previewBody.length} {t("caracteres")} · {smsSegments(previewBody)}{" "}
                  {t("segmento(s)")}
                </p>
              </div>
            ) : (
              <div
                key={channel}
                className="mx-auto w-full max-w-[340px] rounded-2xl border border-border bg-background p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BellRing className="size-3.5" />
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {t("Equipo CoppAddresd")}
                  </span>
                </div>
                <div className="mt-2 w-fit rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-[12.5px] text-foreground">
                  {previewBody}
                </div>
              </div>
            ),
          )}

          {previewLoading && (
            <span className="text-[11px] text-muted-foreground">
              {t("Actualizando vista previa...")}
            </span>
          )}

          {realPreview && !realPreview.isReachable && (
            <p className="flex items-start gap-1.5 text-[11px] text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {realPreview.skipReason ?? t("El paciente no tiene el contacto de este canal.")}
            </p>
          )}

          {realPreview && realPreview.usedFallbackLanguage && (
            <p className="flex items-start gap-1.5 text-[11px] text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {t("Esta plantilla aún no tiene traducción al inglés; se enviará en español.")}
            </p>
          )}

          {realPreview && realPreview.missingPlaceholders.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("Sin dato para")}:{" "}
              {realPreview.missingPlaceholders.map((item) => `[${item}]`).join(" · ")}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            {t(
              "Los datos se completan automáticamente con la información de cada paciente al enviar.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function StepReview({
  alerts,
  channels,
  language,
  templateName,
  results,
  previewItems,
  onDownloadCsv,
}: {
  alerts: HealthAlert[];
  channels: NotificationChannel[];
  language: NotificationLanguage;
  templateName: string | null;
  results: NotifyAlertItemResult[] | null;
  previewItems: NotifyAlertItemResult[] | null;
  onDownloadCsv: () => void;
}) {
  const t = useT();

  const sent = results?.filter((item) => item.status === "sent").length ?? 0;
  const skipped = results?.filter((item) => item.status === "skipped").length ?? 0;
  const failed = results?.filter((item) => item.status === "failed").length ?? 0;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <SectionHeader
        title={t("Envío")}
        description={t("Revisa y confirma el envío")}
        icon={Send}
        variant="primary"
        actions={
          results ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={onDownloadCsv}
            >
              <Download className="size-3.5" />
              {t("Descargar CSV")}
            </Button>
          ) : null
        }
      />
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile label={t("Pacientes")} value={String(alerts.length)} />
          <SummaryTile label={t("Canales")} value={String(channels.length)} />
          <SummaryTile label={t("Enviadas")} value={String(sent)} />
          <SummaryTile label={t("Omitidas")} value={String(skipped)} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Plantilla")}
          </span>
          <span className="text-[12.5px] font-semibold text-foreground">
            {templateName ?? t("Texto libre")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {language === "en" ? "English" : t("Español")}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {channels.map((channel) => {
              const meta = CHANNEL_META[channel];
              const Icon = meta.icon;
              return (
                <span
                  key={channel}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  <Icon className="size-3" />
                  {channel === "sms" ? "SMS" : t("Comunidad")}
                </span>
              );
            })}
          </span>
        </div>

        {results && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {t("Resultado por paciente")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {sent} {t("enviadas")} · {skipped} {t("omitidas")} · {failed}{" "}
                {t("fallidas")}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{t("Paciente")}</th>
                    <th className="px-2 py-2 font-semibold">{t("Canal")}</th>
                    <th className="px-2 py-2 font-semibold">{t("Estado")}</th>
                    <th className="px-2 py-2 font-semibold">{t("Detalle")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => {
                    const meta = RESULT_META[item.status];
                    const Icon = meta.icon;
                    return (
                      <tr key={`${item.alertId}-${item.channel}-${index}`} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">
                          {item.patientName ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {item.channel === "sms" ? "SMS" : t("Comunidad")}
                        </td>
                        <td className="px-2 py-2">
                          <span className={cn("inline-flex items-center gap-1.5", meta.className)}>
                            <Icon className="size-3.5" />
                            {t(meta.label)}
                          </span>
                        </td>
                        <td className="max-w-[24rem] px-2 py-2">
                          <span className="line-clamp-2 text-muted-foreground">
                            {item.reason ?? item.renderedBody}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/health-tests/alertas/notificaciones" />}>
                {t("Ver historial")}
              </Button>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/health-tests/alertas" />}>
                {t("Volver a alertas")}
              </Button>
            </div>
          </div>
        )}

        {!results && (
          <div className="flex flex-col gap-3">
            {previewItems && previewItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Vista previa por paciente")}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">
                    {previewItems.length} {t("pacientes")}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">{t("Paciente")}</th>
                        <th className="px-3 py-2 text-left font-semibold">{t("Canal")}</th>
                        <th className="px-3 py-2 text-left font-semibold">{t("Detalle")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item) => (
                        <tr
                          key={`${item.alertId ?? "sin-alerta"}-${item.channel}`}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2 align-top font-medium text-foreground">
                            {item.patientName ?? "—"}
                          </td>
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            {item.channel === "sms" ? "SMS" : t("Comunidad")}
                          </td>
                          <td className="max-w-[26rem] px-3 py-2 align-top">
                            <span className="line-clamp-2 text-muted-foreground">
                              {item.reason ?? item.renderedBody}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="text-[11.5px] text-muted-foreground">
              {t("Usa Vista previa para revisar sin enviar, o Enviar para entregar ahora.")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
