"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Send,
  Smartphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotificationTemplates } from "../../hooks/use-notifications";
import {
  NOTIFICATION_PLACEHOLDERS,
  notificationsApi,
} from "../../services/notifications-service";
import type { NotificationTemplatePreview } from "../../services/notifications-service";
import type {
  HealthAlert,
  NotificationChannel,
  NotifyAlertItemResult,
} from "../../types";
import { SeverityBadge } from "../shared/badges";

type WizardStep = 1 | 2 | 3;

/** Segmentos SMS (GSM-7): 160 en un solo mensaje, 153 por segmento encadenado. */
function smsSegments(body: string): number {
  return body.length <= 160 ? 1 : Math.ceil(body.length / 153);
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

const RESULT_META: Record<
  string,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  sent: { icon: CheckCircle2, className: "text-success", label: "Enviada" },
  queued: { icon: Eye, className: "text-info", label: "Previsualizada" },
  failed: { icon: XCircle, className: "text-destructive", label: "Fallida" },
  skipped: { icon: TriangleAlert, className: "text-warning", label: "Omitida" },
};

/**
 * Asistente de envío de notificaciones (SPEC A13): selección de destinatarios y
 * canales → redacción con plantilla y placeholders → revisión, envío y
 * resultado por paciente.
 */
export function NotifyWizard({
  open,
  onOpenChange,
  alerts,
  patients,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: HealthAlert[];
  patients?: { id: string; firstName: string; lastName: string }[];
  onCompleted?: () => void;
}) {
  const t = useT();
  const { data: templates } = useNotificationTemplates({ isActive: true });
  const [step, setStep] = useState<WizardStep>(1);
  const [alertIds, setAlertIds] = useState<string[]>(() =>
    alerts.map((alert) => alert.id),
  );
  const [channels, setChannels] = useState<NotificationChannel[]>(["community"]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [results, setResults] = useState<NotifyAlertItemResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wasOpenRef = useRef(false);

  // Al abrir el diálogo, sembrar la selección con las alertas recibidas.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setAlertIds(alerts.map((alert) => alert.id));
    }
    wasOpenRef.current = open;
  }, [open, alerts]);

  const selectedAlerts = useMemo(
    () => alerts.filter((alert) => alertIds.includes(alert.id)),
    [alerts, alertIds],
  );

  const channelTemplates = useMemo(
    () =>
      (templates ?? []).filter(
        (template) =>
          channels.length === 0 || channels.includes(template.channel),
      ),
    [templates, channels],
  );

  function reset() {
    setStep(1);
    setAlertIds(alerts.map((alert) => alert.id));
    setChannels(["community"]);
    setTemplateId(null);
    setBody("");
    setResults(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
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
    if (template) setBody(template.bodyTemplate);
  }

  function insertPlaceholder(placeholder: string) {
    setBody((current) => `${current}[${placeholder}]`);
  }

  async function run(preview: boolean) {
    setBusy(true);
    setError(null);
    try {
      const result = await notificationsApi.notify({
        alertIds,
        channels,
        templateId,
        bodyOverride: body.trim() === "" ? null : body,
        preview,
      });
      setResults(result.items);
      if (!preview) onCompleted?.();
    } catch {
      setError(t("No se pudo completar el envío. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  const canAdvance = step !== 1 || (alertIds.length > 0 && channels.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="size-4 text-primary" />
            {t("Notificar a pacientes")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Envía el resultado de las alertas seleccionadas por comunidad o SMS.",
            )}
          </DialogDescription>
        </DialogHeader>

        <WizardSteps step={step} />

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {step === 1 && (
            <StepRecipients
              alerts={alerts}
              alertIds={alertIds}
              onToggle={(id) =>
                setAlertIds((current) =>
                  current.includes(id)
                    ? current.filter((item) => item !== id)
                    : [...current, id],
                )
              }
              channels={channels}
              onToggleChannel={toggleChannel}
              patients={patients}
            />
          )}

          {step === 2 && (
            <StepCompose
              alerts={selectedAlerts}
              patients={patients}
              channels={channels}
              templates={channelTemplates}
              templateId={templateId}
              onTemplateChange={applyTemplate}
              body={body}
              onBodyChange={setBody}
              onInsertPlaceholder={insertPlaceholder}
            />
          )}

          {step === 3 && (
            <StepReview
              alerts={selectedAlerts}
              channels={channels}
              templateName={
                templates?.find((item) => item.id === templateId)?.name ?? null
              }
              results={results}
            />
          )}
        </div>

        {error && (
          <p className="text-xs font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="text-[11.5px] text-muted-foreground">
            {t("Paso")} {step} {t("de")} 3
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((current) => (current - 1) as WizardStep)}
                disabled={busy}
              >
                <ChevronLeft data-icon="inline-start" />
                {t("Atrás")}
              </Button>
            )}
            {step < 3 && (
              <Button
                size="sm"
                disabled={!canAdvance}
                onClick={() => setStep((current) => (current + 1) as WizardStep)}
              >
                {t("Continuar")}
                <ChevronRight data-icon="inline-end" />
              </Button>
            )}
            {step === 3 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(true)}
                >
                  <Eye data-icon="inline-start" />
                  {t("Vista previa")}
                </Button>
                <Button size="sm" disabled={busy} onClick={() => void run(false)}>
                  <Send data-icon="inline-start" />
                  {t("Enviar")}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WizardSteps({ step }: { step: WizardStep }) {
  const t = useT();
  const steps = [t("Destinatarios"), t("Mensaje"), t("Revisión")];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, index) => {
        const value = (index + 1) as WizardStep;
        const active = value === step;
        const done = value < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                active && "bg-primary text-primary-foreground",
                done && "bg-primary/15 text-primary",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              {value}
            </span>
            <span
              className={cn(
                "text-[12px] font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepRecipients({
  alerts,
  alertIds,
  onToggle,
  channels,
  onToggleChannel,
  patients,
}: {
  alerts: HealthAlert[];
  alertIds: string[];
  onToggle: (id: string) => void;
  channels: NotificationChannel[];
  onToggleChannel: (channel: NotificationChannel) => void;
  patients?: { id: string; firstName: string; lastName: string }[];
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(Object.keys(CHANNEL_META) as NotificationChannel[]).map((channel) => {
          const meta = CHANNEL_META[channel];
          const Icon = meta.icon;
          const active = channels.includes(channel);
          return (
            <button
              key={channel}
              type="button"
              onClick={() => onToggleChannel(channel)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary-soft/40"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{t(meta.label)}</span>
                <span className="text-[11.5px] text-muted-foreground">
                  {t(meta.description)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">
          {t("Pacientes a notificar")} ({alertIds.length})
        </span>
        <span className="text-[11px] text-muted-foreground">
          {t("Los pacientes sin el contacto elegido se omitirán y se reportarán.")}
        </span>
      </div>

      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
        {alerts.map((alert) => {
          const checked = alertIds.includes(alert.id);
          const patient = patients?.find((item) => item.id === alert.patientId);
          return (
            <label
              key={alert.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                checked ? "bg-primary-soft/30" : "hover:bg-muted/50",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={checked}
                onChange={() => onToggle(alert.id)}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[12.5px] font-semibold text-foreground">
                  {patient
                    ? `${patient.firstName} ${patient.lastName}`.trim()
                    : t("Paciente sin nombre")}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {alert.indicatorName} · {alert.message}
                </span>
              </span>
              <SeverityBadge severity={alert.severity} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
}: {
  alerts: HealthAlert[];
  patients?: { id: string; firstName: string; lastName: string }[];
  channels: NotificationChannel[];
  templates: { id: string; name: string; channel: NotificationChannel }[];
  templateId: string | null;
  onTemplateChange: (id: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  onInsertPlaceholder: (placeholder: string) => void;
}) {
  const t = useT();

  // Vista previa con datos reales: se usa el primer paciente seleccionado como
  // ejemplo (el envío completa los datos de cada paciente por separado).
  const primaryChannel = channels[0] ?? "community";
  const firstAlert = alerts[0];
  const firstAlertPatient = patients?.find((item) => item.id === firstAlert?.patientId);
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
  }, [previewTemplateId, primaryChannel, firstAlert?.id, body]);

  const realPreview =
    previewState && previewState.id === previewTemplateId ? previewState.data : null;
  const previewBody =
    realPreview?.renderedBody ??
    (body.trim() === "" ? t("El mensaje aparecerá aquí mientras escribes.") : body);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-3 lg:col-span-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            {t("Plantilla")}
          </span>
          <Select
            value={templateId ?? "none"}
            onValueChange={(value) => onTemplateChange(value ?? "none")}
          >
            <SelectTrigger aria-label={t("Elegir plantilla")}>
              <SelectValue>{t("Sin plantilla (texto libre)")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t("Sin plantilla (texto libre)")}
              </SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ·{" "}
                  {template.channel === "sms" ? "SMS" : t("Comunidad")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            {t("Mensaje")}
          </span>
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
          <span className="text-xs font-semibold text-foreground">
            {t("Vista previa")}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {firstAlert
              ? `${t("Ejemplo")}: ${firstAlertName ?? t("Paciente")}`
              : t("Sin paciente de ejemplo")}
          </span>
        </div>

        {primaryChannel === "sms" ? (
          <div className="mx-auto w-full max-w-[300px] rounded-[26px] border border-border bg-background p-3 shadow-sm">
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
          <div className="mx-auto w-full max-w-[340px] rounded-2xl border border-border bg-background p-3 shadow-sm">
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
        <span className="text-[11px] text-muted-foreground">
          {t("Canales activos")}:{" "}
          {channels
            .map((channel) => (channel === "sms" ? "SMS" : t("Comunidad")))
            .join(" · ")}
        </span>
      </div>
    </div>
  );
}

function StepReview({
  alerts,
  channels,
  templateName,
  results,
}: {
  alerts: HealthAlert[];
  channels: NotificationChannel[];
  templateName: string | null;
  results: NotifyAlertItemResult[] | null;
}) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  // Agrupa resultados idénticos (mismo estado y mismo texto/motivo) para no
  // repetir la misma fila una vez por paciente.
  const grouped = useMemo(() => {
    const map = new Map<string, { item: NotifyAlertItemResult; count: number }>();
    for (const item of results ?? []) {
      const key = `${item.status}|${item.reason ?? item.renderedBody ?? ""}`;
      const current = map.get(key);
      if (current) current.count += 1;
      else map.set(key, { item, count: 1 });
    }
    return Array.from(map.values());
  }, [results]);

  const VISIBLE_GROUPS = 3;
  const visibleGroups = showAll ? grouped : grouped.slice(0, VISIBLE_GROUPS);
  const hiddenGroups = Math.max(0, grouped.length - VISIBLE_GROUPS);
  const renderedExample =
    results?.find((item) => item.renderedBody)?.renderedBody ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label={t("Pacientes")} value={String(alerts.length)} />
        <SummaryTile label={t("Canales")} value={String(channels.length)} />
        <SummaryTile
          label={t("Enviadas")}
          value={String(results?.filter((item) => item.status === "sent").length ?? 0)}
        />
        <SummaryTile
          label={t("Omitidas")}
          value={String(
            results?.filter((item) => item.status === "skipped").length ?? 0,
          )}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Plantilla")}
          </span>
          <span className="text-[12.5px] font-semibold text-foreground">
            {templateName ?? t("Texto libre")}
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
        {renderedExample && (
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Ejemplo real")}
            </span>
            <p className="rounded-lg bg-card px-2.5 py-2 text-[12.5px] text-foreground">
              {renderedExample}
            </p>
          </div>
        )}
      </div>

      {grouped.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {visibleGroups.map(({ item, count }, index) => {
            const meta = RESULT_META[item.status] ?? RESULT_META.queued;
            const Icon = meta.icon;
            return (
              <div
                key={`${item.status}-${index}`}
                className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12.5px] font-semibold text-foreground">
                    {count > 1
                      ? `${count} ${t("pacientes")}`
                      : `${item.patientName ?? t("Paciente")} · ${
                          item.channel === "sms" ? "SMS" : t("Comunidad")
                        }`}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {item.reason ?? item.renderedBody}
                  </span>
                </span>
                <span className={cn("text-[11px] font-semibold", meta.className)}>
                  {t(meta.label)}
                </span>
              </div>
            );
          })}

          {hiddenGroups > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-[11.5px] text-muted-foreground"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll
                ? t("Ver menos")
                : `+${hiddenGroups} ${t("más")}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-bold text-foreground">{value}</span>
    </div>
  );
}
