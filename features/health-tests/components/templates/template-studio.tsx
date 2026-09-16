"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  Copy,
  History,
  Loader2,
  MessageSquare,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Smartphone,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";

import { useNotificationTemplates } from "../../hooks/use-notifications";
import {
  NOTIFICATION_PLACEHOLDERS,
  notificationsApi,
} from "../../services/notifications-service";
import type { NotificationTemplatePreview } from "../../services/notifications-service";
import { healthTestsApi } from "../../services/health-tests-service";
import type {
  AlertSeverity,
  HealthAlert,
  NotificationChannel,
  NotificationTemplate,
  NotificationTemplateVersion,
} from "../../types";
import { formatDate } from "../../lib/format";
import { TableSkeleton, StatSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

const SEVERITY_OPTIONS: AlertSeverity[] = [
  "critica",
  "alta",
  "media",
  "baja",
  "informativa",
];

const SAMPLE_CONTEXT: Record<string, string> = {
  paciente: "Ana Pérez",
  documento: "CC 10203040",
  test: "Perfil cardiometabólico",
  indicador: "ORP",
  valor: "4.2",
  umbral: "3.0",
  severidad: "alta",
  accion: "Agendar seguimiento",
  profesional: "Dr. Gómez",
  fecha: "16/09/2026",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  community: "Comunidad",
  sms: "SMS",
};

/** Render local (datos de ejemplo) usado como respaldo mientras carga la vista previa real. */
function renderPreview(template: string): string {
  return template.replace(/\[([a-zA-Z0-9_]+)\]/g, (match, key: string) => {
    const value = SAMPLE_CONTEXT[key.toLowerCase()];
    return value ?? match;
  });
}

function smsSegments(body: string): number {
  const length = body.length;
  if (length <= 160) {
    return 1;
  }
  return Math.ceil(length / 153);
}

interface EditorState {
  id: string | null;
  code: string;
  name: string;
  channel: NotificationChannel;
  bodyTemplate: string;
  severity: AlertSeverity | "none";
  testCategory: string;
  indicatorCode: string;
  subject: string;
  isActive: boolean;
  note: string;
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  code: "",
  name: "",
  channel: "community",
  bodyTemplate: "Hola [paciente], tu resultado de [indicador] fue [valor] ([severidad]). [accion]",
  severity: "none",
  testCategory: "",
  indicatorCode: "",
  subject: "",
  isActive: true,
  note: "",
};

export function TemplateStudio() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | "all">(
    "all",
  );
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  const { data, loading, error, reload } = useNotificationTemplates({
    channel: channelFilter === "all" ? undefined : channelFilter,
    search: search.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [versions, setVersions] = useState<NotificationTemplateVersion[] | null>(
    null,
  );
  const [versionsOpen, setVersionsOpen] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<NotificationChannel>("sms");
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  // Vista previa con datos reales: se elige una alerta reciente como ejemplo.
  const [sampleAlerts, setSampleAlerts] = useState<HealthAlert[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [sampleAlertId, setSampleAlertId] = useState("");
  const [realPreview, setRealPreview] = useState<{
    key: string;
    data: NotificationTemplatePreview;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [alerts, patients] = await Promise.all([
          healthTestsApi.listAlerts(),
          healthTestsApi.listPatients(),
        ]);
        if (cancelled) return;
        const sample = alerts.slice(0, 10);
        setSampleAlerts(sample);
        // Por defecto se previsualiza con una alerta real (la más reciente).
        setSampleAlertId((current) => current || (sample[0]?.id ?? ""));
        setPatientNames(
          Object.fromEntries(
            patients.map((patient) => [
              patient.id,
              `${patient.firstName} ${patient.lastName}`.trim(),
            ]),
          ),
        );
      } catch {
        if (!cancelled) setSampleAlerts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewKey = `${editor.id ?? "draft"}|${sampleAlertId}|${editor.channel}|${editor.bodyTemplate}`;

  useEffect(() => {
    // "sample" = datos de ejemplo locales (sin alerta real) → sin llamada al backend.
    if (!editor.id || !sampleAlertId || sampleAlertId === "sample") return;
    const templateId = editor.id;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await notificationsApi.previewTemplate(templateId, {
            alertId: sampleAlertId,
            channel: editor.channel,
            bodyOverride: editor.bodyTemplate,
          });
          if (!cancelled) setRealPreview({ key: previewKey, data });
        } catch {
          if (!cancelled) setRealPreview(null);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  const templates = data ?? [];
  const isDraft = editor.id === null;

  const activeRealPreview = realPreview?.key === previewKey ? realPreview.data : null;

  const previewBody =
    activeRealPreview?.renderedBody ?? renderPreview(editor.bodyTemplate);

  function selectTemplate(template: NotificationTemplate) {
    setEditor({
      id: template.id,
      code: template.code,
      name: template.name,
      channel: template.channel,
      bodyTemplate: template.bodyTemplate,
      severity: template.severity ?? "none",
      testCategory: template.testCategory ?? "",
      indicatorCode: template.indicatorCode ?? "",
      subject: template.subject ?? "",
      isActive: template.isActive,
      note: "",
    });
    setFeedback(null);
  }

  function newTemplate() {
    setEditor({ ...EMPTY_EDITOR });
    setFeedback(null);
  }

  async function save() {
    if (!editor.name.trim() || !editor.bodyTemplate.trim()) {
      setFeedback(t("Completa el nombre y el mensaje antes de guardar."));
      return;
    }
    if (isDraft && !editor.code.trim()) {
      setFeedback(t("El código es obligatorio para una plantilla nueva."));
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const input = {
        name: editor.name.trim(),
        channel: editor.channel,
        bodyTemplate: editor.bodyTemplate.trim(),
        severity: editor.severity === "none" ? null : editor.severity,
        testCategory: editor.testCategory.trim() || null,
        indicatorCode: editor.indicatorCode.trim() || null,
        subject: editor.subject.trim() || null,
        isActive: editor.isActive,
        note: editor.note.trim() || null,
      };

      if (isDraft) {
        await notificationsApi.createTemplate({ ...input, code: editor.code.trim() });
        setFeedback(t("Plantilla creada."));
      } else {
        await notificationsApi.updateTemplate(editor.id!, input);
        setFeedback(t("Plantilla actualizada."));
      }
      reload();
    } catch {
      setFeedback(t("No se pudo guardar la plantilla."));
    } finally {
      setBusy(false);
    }
  }

  async function clone(template: NotificationTemplate) {
    const code = window.prompt(
      t("Código de la copia"),
      `${template.code}_COPIA`,
    );
    if (!code) {
      return;
    }
    try {
      await notificationsApi.cloneTemplate(template.id, code);
      reload();
    } catch {
      setFeedback(t("No se pudo clonar la plantilla."));
    }
  }

  async function openVersions(template: NotificationTemplate) {
    setVersionsOpen(true);
    setVersions(null);
    try {
      const list = await notificationsApi.listTemplateVersions(template.id);
      setVersions(list);
    } catch {
      setVersions([]);
    }
  }

  async function restore(templateId: string, version: number) {
    try {
      await notificationsApi.restoreTemplateVersion(templateId, version);
      setVersionsOpen(false);
      reload();
    } catch {
      setFeedback(t("No se pudo restaurar la versión."));
    }
  }

  async function sendTest() {
    if (!editor.id) {
      return;
    }
    setTestResult(null);
    try {
      const result = await notificationsApi.sendTest(editor.id, {
        channel: testChannel,
        phoneNumber: testChannel === "sms" ? testPhone.trim() || undefined : undefined,
      });
      setTestResult(
        result.status === "sent"
          ? t("Prueba enviada correctamente.")
          : result.reason ?? t("La prueba no pudo enviarse."),
      );
    } catch {
      setTestResult(t("No se pudo enviar la prueba."));
    }
  }

  const header = (
    <PageHeader
      title={t("Estudio de plantillas")}
      description={t("Crea, versiona y prueba los mensajes que se envían a los pacientes")}
      icon={Sparkles}
      actions={
        <Button onClick={newTemplate} size="sm">
          <Plus className="size-4" />
          {t("Nueva plantilla")}
        </Button>
      }
    />
  );

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
        {header}
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Galería */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Plantillas")}
            description={t("Selecciona una plantilla para editarla")}
            icon={BellRing}
            variant="primary"
            actions={
              <Select
                value={channelFilter}
                onValueChange={(value) =>
                  setChannelFilter(value as NotificationChannel | "all")
                }
              >
                <SelectTrigger className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todo canal")}</SelectItem>
                  <SelectItem value="community">{t("Comunidad")}</SelectItem>
                  <SelectItem value="sms">{t("SMS")}</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar plantilla...")}
                aria-label={t("Buscar plantillas")}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeFilter === "all" ? "default" : "outline"}
                onClick={() => setActiveFilter("all")}
              >
                {t("Todas")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeFilter === "active" ? "default" : "outline"}
                onClick={() => setActiveFilter("active")}
              >
                {t("Activas")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeFilter === "inactive" ? "default" : "outline"}
                onClick={() => setActiveFilter("inactive")}
              >
                {t("Inactivas")}
              </Button>
            </div>
          </div>

          <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto p-3">
            {templates.length === 0 ? (
              <ModuleEmptyState
                title={t("Sin plantillas")}
                description={t("Crea tu primera plantilla para empezar.")}
                filtered={search.trim() !== "" || channelFilter !== "all"}
                onClear={() => {
                  setSearch("");
                  setChannelFilter("all");
                }}
              />
            ) : (
              templates.map((template) => {
                const selected = editor.id === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {template.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                          template.channel === "sms"
                            ? "bg-info/10 text-info"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        {CHANNEL_LABELS[template.channel]}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11.5px] text-muted-foreground">
                      {template.bodyTemplate}
                    </p>
                    <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
                      <span>{template.code}</span>
                      <span>·</span>
                      <span>{t("v")}{template.versionCount}</span>
                      <span>·</span>
                      <span>{template.usageCount} {t("envíos")}</span>
                      {!template.isActive && (
                        <span className="text-destructive">{t("Inactiva")}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Editor */}
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title={isDraft ? t("Nueva plantilla") : editor.name || t("Plantilla")}
            description={
              isDraft
                ? t("Define el canal, el alcance y el mensaje")
                : `${editor.code} · ${CHANNEL_LABELS[editor.channel]}`
            }
            icon={PencilLine}
            variant="primary"
            actions={
              !isDraft ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const current = templates.find((item) => item.id === editor.id);
                      if (current) {
                        void clone(current);
                      }
                    }}
                  >
                    <Copy className="size-3.5" />
                    {t("Clonar")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const current = templates.find((item) => item.id === editor.id);
                      if (current) {
                        void openVersions(current);
                      }
                    }}
                  >
                    <History className="size-3.5" />
                    {t("Versiones")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!editor.isActive}
                    onClick={() => setTestOpen(true)}
                  >
                    <Send className="size-3.5" />
                    {t("Enviar prueba")}
                  </Button>
                </div>
              ) : null
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Nombre")}
              </span>
              <Input
                value={editor.name}
                onChange={(event) =>
                  setEditor((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t("Alerta de riesgo alto")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Código")}
              </span>
              <Input
                value={editor.code}
                disabled={!isDraft}
                onChange={(event) =>
                  setEditor((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="HT_ALERTA_ALTA"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Canal")}
              </span>
              <Select
                value={editor.channel}
                onValueChange={(value) =>
                  setEditor((prev) => ({
                    ...prev,
                    channel: value as NotificationChannel,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="community">{t("Comunidad")}</SelectItem>
                  <SelectItem value="sms">{t("SMS")}</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Severidad objetivo")}
              </span>
              <Select
                value={editor.severity}
                onValueChange={(value) =>
                  setEditor((prev) => ({
                    ...prev,
                    severity: value as AlertSeverity | "none",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("Cualquiera")}</SelectItem>
                  {SEVERITY_OPTIONS.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Indicador")}
              </span>
              <Input
                value={editor.indicatorCode}
                onChange={(event) =>
                  setEditor((prev) => ({
                    ...prev,
                    indicatorCode: event.target.value,
                  }))
                }
                placeholder="ORP"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Categoría de test")}
              </span>
              <Input
                value={editor.testCategory}
                onChange={(event) =>
                  setEditor((prev) => ({
                    ...prev,
                    testCategory: event.target.value,
                  }))
                }
                placeholder={t("cardiometabolico")}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Insertar dato")}:
              </span>
              {NOTIFICATION_PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() =>
                    setEditor((prev) => ({
                      ...prev,
                      bodyTemplate: `${prev.bodyTemplate}[${placeholder}]`,
                    }))
                  }
                  className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {`[${placeholder}]`}
                </button>
              ))}
            </div>
            <Textarea
              value={editor.bodyTemplate}
              onChange={(event) =>
                setEditor((prev) => ({ ...prev, bodyTemplate: event.target.value }))
              }
              rows={4}
              className="min-h-[110px]"
              placeholder={t("Escribe el mensaje con datos entre corchetes")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={editor.isActive}
              onChange={(event) =>
                setEditor((prev) => ({ ...prev, isActive: event.target.checked }))
              }
              className="size-4 rounded border-border"
            />
            {t("Plantilla activa")}
          </label>

          {feedback && (
            <p className="text-xs text-muted-foreground" role="status">
              {feedback}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={newTemplate}>
              {t("Limpiar")}
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("Guardar")}
            </Button>
          </div>

          {/* Previsualización */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {t("Paciente de ejemplo")}
              </span>
              <Select
                value={sampleAlertId || "sample"}
                onValueChange={(value) => setSampleAlertId(value === "sample" ? "" : (value ?? ""))}
              >
                <SelectTrigger
                  className="h-8 w-56"
                  aria-label={t("Paciente de ejemplo")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample">{t("Datos de ejemplo")}</SelectItem>
                  {sampleAlerts.map((alert) => (
                    <SelectItem key={alert.id} value={alert.id}>
                      {patientNames[alert.patientId] ?? t("Paciente")} ·{" "}
                      {alert.indicatorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeRealPreview && !activeRealPreview.isReachable && (
              <p className="mb-2 flex items-start gap-1.5 text-[11px] text-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {activeRealPreview.skipReason ??
                  t("El paciente no tiene el contacto de este canal.")}
              </p>
            )}

            <Tabs defaultValue="sms">
              <TabsList variant="line">
                <TabsTrigger value="sms">
                  <Smartphone className="size-3.5" />
                  {t("SMS")}
                </TabsTrigger>
                <TabsTrigger value="community">
                  <MessageSquare className="size-3.5" />
                  {t("Comunidad")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sms">
                <div className="mx-auto mt-3 max-w-[320px] rounded-[26px] border border-border bg-background p-3 shadow-sm">
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
                  <div className="rounded-2xl bg-muted px-3 py-2 text-[12.5px] text-foreground">
                    {previewBody}
                  </div>
                  <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
                    {previewBody.length} {t("caracteres")} · {smsSegments(previewBody)}{" "}
                    {t("segmento(s)")}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="community">
                <div className="mx-auto mt-3 max-w-[360px] rounded-2xl border border-border bg-background p-3 shadow-sm">
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
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      {/* Historial de versiones */}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Historial de versiones")}</DialogTitle>
            <DialogDescription>
              {t("Restaura una versión anterior para volver a su contenido.")}
            </DialogDescription>
          </DialogHeader>

          {versions === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("Cargando versiones...")}
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Esta plantilla todavía no tiene versiones.")}
            </p>
          ) : (
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {t("Versión")} {version.version} · {formatDate(version.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] text-muted-foreground">
                      {version.bodyTemplate}
                    </p>
                    {version.note && (
                      <p className="mt-1 text-[10.5px] italic text-muted-foreground">
                        {version.note}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => editor.id && restore(editor.id, version.version)}
                  >
                    <RotateCcw className="size-3.5" />
                    {t("Restaurar")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enviar prueba */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Enviar prueba")}</DialogTitle>
            <DialogDescription>
              {t("Envía esta plantilla a un destinatario de prueba y revisa el log.")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("Canal")}
              </span>
              <Select
                value={testChannel}
                onValueChange={(value) =>
                  setTestChannel(value as NotificationChannel)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">{t("SMS")}</SelectItem>
                  <SelectItem value="community">{t("Comunidad")}</SelectItem>
                </SelectContent>
              </Select>
            </label>

            {testChannel === "sms" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("Teléfono de prueba")}
                </span>
                <Input
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                  placeholder="+573001234567"
                />
              </label>
            )}

            {testResult && (
              <p className="text-xs text-muted-foreground" role="status">
                {testResult}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTestOpen(false)}>
              {t("Cerrar")}
            </Button>
            <Button type="button" onClick={sendTest}>
              <Send className="size-4" />
              {t("Enviar prueba")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
