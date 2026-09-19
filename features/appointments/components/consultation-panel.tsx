"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  FlaskConical,
  Loader2,
  MessageSquare,
  Pill,
  RotateCcw,
  Send,
  ShieldCheck,
  Syringe,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormDrafts } from "../hooks/use-form-drafts";
import { useRoomChat } from "../hooks/use-room-chat";
import type { RoomChatMessage } from "../hooks/use-room-chat";
import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { getPatient } from "@/features/patients/services/patients-service";
import type { Patient } from "@/features/patients/types";
import { fetchPreVisitIntake } from "../services/appointments-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRange, formatTime } from "../utils/format";
import { ClinicalEncounterPanel } from "./clinical-encounter-panel";
import { LabOrderForm } from "./forms/lab-order-form";
import { MedicationForm } from "./forms/medication-form";
import { ProcedureForm } from "./forms/procedure-form";
import { FormHeader } from "./forms/form-ui";
import { PatientContextCard } from "./forms/patient-context-card";
import type { AppointmentDto, PreVisitIntakeDto } from "../types";

export type ConsultationPanelTab = "participants" | "forms" | "chat";

type FormKind = "history" | "lab" | "medications" | "procedures";

/** Límites de altura del panel inferior (35%–80% del alto de la ventana). */
export function panelHeightBounds(): { min: number; max: number } {
  const viewport = typeof window === "undefined" ? 900 : window.innerHeight;
  return { min: Math.round(viewport * 0.35), max: Math.round(viewport * 0.8) };
}

/** Normaliza la altura del panel al rango permitido (px). */
export function clampPanelHeight(px: number): number {
  const { min, max } = panelHeightBounds();
  return Math.round(Math.min(max, Math.max(min, px)));
}

/** Altura por defecto: equivalente al histórico min(48vh, 440px). */
export function defaultPanelHeight(): number {
  const viewport = typeof window === "undefined" ? 900 : window.innerHeight;
  return clampPanelHeight(Math.min(viewport * 0.48, 440));
}

const FORM_CATALOG: {
  kind: FormKind;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: "teal" | "violet" | "amber" | "rose";
}[] = [
  {
    kind: "history",
    title: "Historia clínica",
    description:
      "Nota SOAP: motivo, evaluación, diagnóstico CIE-10, plan e indicaciones.",
    icon: ClipboardPenLine,
    tint: "teal",
  },
  {
    kind: "lab",
    title: "Orden de laboratorio",
    description:
      "Muestra, pruebas sugeridas y prioridades para el laboratorio.",
    icon: FlaskConical,
    tint: "violet",
  },
  {
    kind: "medications",
    title: "Medicamentos",
    description: "Fórmula con catálogo: dosis, vía, frecuencia y duración.",
    icon: Pill,
    tint: "amber",
  },
  {
    kind: "procedures",
    title: "Procedimientos",
    description:
      "Curaciones, infiltraciones y otros procedimientos a programar.",
    icon: Syringe,
    tint: "rose",
  },
];

/**
 * Panel inferior de la consulta (bottom sheet): participantes y formularios
 * médicos. Se desliza desde abajo y empuja el escenario de video (spacer en
 * VirtualRoom) para aprovechar el ancho. Los formularios nuevos guardan
 * borradores en localStorage por cita; la historia clínica persiste en el
 * backend.
 */
export function ConsultationPanel({
  open,
  onClose,
  tab,
  onTabChange,
  appointment,
  patientConnected,
  isProfessional,
  canManage,
  localLabel,
  remoteLabels,
  heightPx,
  onHeightChange,
}: {
  open: boolean;
  onClose: () => void;
  tab: ConsultationPanelTab;
  onTabChange: (tab: ConsultationPanelTab) => void;
  appointment: AppointmentDto;
  patientConnected: boolean;
  isProfessional: boolean;
  canManage: boolean;
  localLabel: { name: string; role: string; connectedAt?: string | null };
  remoteLabels: { name: string; role: string; connectedAt?: string | null }[];
  heightPx: number;
  onHeightChange: (px: number) => void;
}) {
  const t = useT();
  const [selectedForm, setSelectedForm] = useState<FormKind | null>(null);
  const drafts = useFormDrafts(appointment.id);
  const [patient, setPatient] = useState<{
    patient: Patient;
    age: number | null;
  } | null>(null);
  const [intake, setIntake] = useState<PreVisitIntakeDto | null>(null);
  const [intakeError, setIntakeError] = useState(false);
  const [intakeLoadedFor, setIntakeLoadedFor] = useState<string | null>(null);
  // Derivado (sin setState en efectos): cargando mientras no llegó la respuesta
  // de la cita actual.
  const intakeLoading = intakeLoadedFor !== appointment.id;

  // El chat se habilita con la cita confirmada, en curso o finalizada (el
  // paciente puede esperar en la sala con la cita aún Confirmed); el polling
  // corre mientras el panel está abierto (el badge cuenta lo no visto con la
  // pestaña de chat oculta).
  const canChat =
    appointment.status === "Confirmed" ||
    appointment.status === "InProgress" ||
    appointment.status === "Completed";
  const chat = useRoomChat({
    appointmentId: appointment.id,
    polling: open,
    visible: open && tab === "chat" && selectedForm === null,
    canSend: canChat,
  });

  // Ajuste de estado durante el render (patrón recomendado por React): al
  // cerrar el panel se vuelve a la lista de formularios.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (!open) setSelectedForm(null);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await getPatient(appointment.patientId);
        if (!active) return;
        const age = result.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(result.dateOfBirth).getTime()) /
                (365.25 * 24 * 3600 * 1000),
            )
          : null;
        setPatient({ patient: result, age });
      } catch {
        // Sin acceso al detalle: los formularios funcionan igual sin contexto.
      }
    })();
    return () => {
      active = false;
    };
  }, [appointment.patientId]);

  // Pre-consulta reportada por el paciente: se carga junto al contexto y se
  // muestra en solo lectura en la tarjeta (null cuando no la completó).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchPreVisitIntake(appointment.id);
        if (!active) return;
        setIntake(result);
        setIntakeError(false);
      } catch {
        if (!active) return;
        setIntake(null);
        setIntakeError(true);
      } finally {
        if (active) setIntakeLoadedFor(appointment.id);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointment.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const draftCounts: Record<FormKind, number> = {
    history: 0,
    lab: drafts.drafts.labOrder.tests.filter((t) => t.test.trim()).length,
    medications: drafts.drafts.medications.items.filter((m) => m.name.trim())
      .length,
    procedures: drafts.drafts.procedures.items.filter((p) => p.name.trim())
      .length,
  };

  const backToForms = () => {
    setSelectedForm(null);
    onTabChange("forms");
  };

  // --- Redimensionado del panel (arrastre + teclado) ---

  const heightBounds = panelHeightBounds();
  const dragState = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );

  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    dragState.current = { startY: event.clientY, startHeight: heightPx };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const drag = dragState.current;
    if (!drag) return;
    onHeightChange(
      clampPanelHeight(drag.startHeight + (drag.startY - event.clientY)),
    );
  };

  const handleResizePointerEnd = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResizeKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onHeightChange(clampPanelHeight(heightPx + 24));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onHeightChange(clampPanelHeight(heightPx - 24));
    } else if (event.key === "Home") {
      event.preventDefault();
      onHeightChange(defaultPanelHeight());
    }
  };

  return (
    <>
      <aside
        aria-label={t("Panel de la consulta")}
        inert={!open}
        style={{ height: heightPx }}
        className={`fixed inset-x-2 bottom-2 z-40 flex flex-col rounded-[28px] border border-border/80 bg-card shadow-[0_24px_80px_rgba(46,67,97,0.18)] transition-transform duration-300 ease-out sm:inset-x-4 sm:bottom-4 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex shrink-0 justify-center pt-1.5">
          <button
            type="button"
            role="separator"
            aria-orientation="horizontal"
            aria-label={t("Redimensionar panel")}
            aria-valuemin={heightBounds.min}
            aria-valuemax={heightBounds.max}
            aria-valuenow={Math.round(heightPx)}
            title={t("Arrastra para redimensionar")}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerEnd}
            onPointerCancel={handleResizePointerEnd}
            onKeyDown={handleResizeKeyDown}
            onDoubleClick={() => onHeightChange(defaultPanelHeight())}
            className="group flex h-5 w-full cursor-row-resize touch-none items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
          >
            <span className="h-1 w-12 rounded-full bg-muted-foreground/25 transition-colors group-hover:bg-muted-foreground/45" />
          </button>
        </div>

        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 pb-3 pt-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {selectedForm ? (
              <button
                type="button"
                onClick={backToForms}
                aria-label={t("Volver a los formularios")}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/20"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                <ClipboardCheck className="size-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {selectedForm
                    ? t(FORM_CATALOG.find((f) => f.kind === selectedForm)?.title ?? "")
                    : tab === "participants"
                      ? t("Participantes")
                      : tab === "chat"
                        ? t("Chat de la consulta")
                        : t("Formularios médicos")}
                </p>
                <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-primary sm:inline-flex">
                  {t("Consulta virtual")}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {appointment.patientName ?? t("Paciente")} · {appointment.specialtyName ?? t("Especialidad")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Cerrar panel")}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/20"
          >
            <X className="size-4" />
          </button>
        </header>

        {!selectedForm && (
          <div className="mx-4 flex shrink-0 gap-1 rounded-2xl border border-border/70 bg-muted/50 p-1 sm:mx-5">
            <TabButton
              active={tab === "participants"}
              onClick={() => onTabChange("participants")}
              label={t("Participantes")}
              icon={Users}
            />
            {canManage && (
              <TabButton
                active={tab === "forms"}
                onClick={() => onTabChange("forms")}
                label={t("Formularios médicos")}
                icon={ClipboardList}
              />
            )}
            <TabButton
              active={tab === "chat"}
              onClick={() => onTabChange("chat")}
              label={t("Chat")}
              icon={MessageSquare}
              badge={chat.unread}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3 sm:px-5">
          {selectedForm ? (
            <FormBody
              kind={selectedForm}
              appointment={appointment}
              drafts={drafts}
              allergies={
                patient?.patient.allergies.map((a) => a.allergen) ?? []
              }
              draftCounts={draftCounts}
            />
          ) : tab === "chat" ? (
            <ChatBody
              messages={chat.messages}
              loading={chat.loading}
              error={chat.error}
              sending={chat.sending}
              canSend={canChat}
              onSend={chat.send}
              onRetryMessage={chat.retryMessage}
              onRetryLoad={chat.retryLoad}
            />
          ) : tab === "participants" ? (
            <ParticipantsBody
              localLabel={localLabel}
              remoteLabels={remoteLabels}
              patientConnected={patientConnected}
              isProfessional={isProfessional}
              appointment={appointment}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
              <div className="flex flex-col gap-3">
                {patient && (
                  <PatientContextCard
                    patient={patient.patient}
                    age={patient.age}
                    intake={intake}
                    intakeLoading={intakeLoading}
                    intakeError={intakeError}
                  />
                )}
                {canManage && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 shadow-sm">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
                      <ShieldCheck className="size-3.5" />{" "}
                      {t("Consulta en curso")}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-primary/80">
                      {t("Los formularios guardan borradores automáticos por cita.")}
                    </p>
                  </div>
                )}
              </div>
              <FormsBody draftCounts={draftCounts} onSelect={setSelectedForm} />
            </div>
          )}
        </div>
      </aside>

      {open && (
        <button
          aria-label={t("Cerrar panel")}
          className="fixed inset-0 z-30 bg-foreground/20 lg:bg-foreground/10"
          onClick={onClose}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon: Icon,
  badge = 0,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/20 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
      {badge > 0 && (
        <span
          aria-label={t("Nuevos mensajes")}
          className="flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold leading-4 text-primary-foreground"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function ChatBody({
  messages,
  loading,
  error,
  sending,
  canSend,
  onSend,
  onRetryMessage,
  onRetryLoad,
}: {
  messages: RoomChatMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  canSend: boolean;
  onSend: (body: string) => Promise<void>;
  onRetryMessage: (clientId: string) => Promise<void>;
  onRetryLoad: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const initialScrollRef = useRef(false);

  const myId = user?.id ?? null;
  const isLocal = (message: RoomChatMessage) =>
    message.senderUserId === "" || message.senderUserId === myId;

  const roleLabel: Record<string, string> = {
    Professional: "Profesional",
    Patient: "Paciente",
    Supervisor: "Supervisor",
  };

  // Auto-scroll al último mensaje (sin arrastrar la vista si el usuario está
  // leyendo mensajes anteriores).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      160;
    const firstScroll = !initialScrollRef.current;
    if (firstScroll || nearBottom) {
      initialScrollRef.current = true;
      endRef.current?.scrollIntoView({
        block: "end",
        behavior: firstScroll ? "auto" : "smooth",
      });
    }
  }, [messages]);

  const submit = () => {
    const value = text.trim();
    if (!value || !canSend) return;
    setText("");
    void onSend(value);
  };

  const showFullError = error !== null && messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {error && messages.length > 0 && (
        <p
          className="shrink-0 rounded-xl border border-amber-300/60 bg-amber-50/80 px-3.5 py-2 text-[11.5px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-muted/20 p-3"
      >
        {loading && messages.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <p className="text-[12px]">{t("Cargando mensajes…")}</p>
          </div>
        ) : showFullError ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertTriangle className="size-6 text-amber-600" />
            <p className="text-[12.5px] text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryLoad}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" /> {t("Reintentar")}
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="size-6" />
            <p className="text-[12.5px]">{t("Sin mensajes todavía.")}</p>
            <p className="text-[11px]">
              {t("Los mensajes quedan guardados con la consulta.")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((message) => {
              const local = isLocal(message);
              return (
                <div
                  key={message.clientId}
                  className={`flex flex-col ${local ? "items-end" : "items-start"}`}
                >
                  {!local && (
                    <span className="mb-0.5 pl-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      {t(roleLabel[message.senderRole] ?? "Participante")}
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm ${
                      local
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 bg-card text-foreground"
                    } ${message.status === "sending" ? "opacity-70" : ""}`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                  </div>
                  <span className="mt-0.5 flex items-center gap-1.5 px-1 text-[10.5px] text-muted-foreground">
                    {formatTime(message.createdAt)}
                    {message.status === "sending" && (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        {t("Enviando…")}
                      </>
                    )}
                    {message.status === "failed" && (
                      <>
                        <AlertTriangle className="size-3 text-destructive" />
                        {t("No enviado")}
                        <button
                          type="button"
                          onClick={() => void onRetryMessage(message.clientId)}
                          aria-label={t("Reintentar envío")}
                          className="font-semibold text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          {t("Reintentar")}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex shrink-0 items-end gap-2"
      >
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={
            canSend
              ? t("Escribe un mensaje…")
              : t("El chat estará disponible cuando la consulta esté en curso.")
          }
          maxLength={2000}
          rows={2}
          disabled={!canSend}
          aria-label={t("Escribe un mensaje…")}
          className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[12.5px] text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={!canSend || text.trim().length === 0 || sending}
          aria-label={t("Enviar")}
          className="size-11 shrink-0 rounded-xl"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

function ParticipantsBody({
  localLabel,
  remoteLabels,
  patientConnected,
  isProfessional,
  appointment,
}: {
  localLabel: { name: string; role: string; connectedAt?: string | null };
  remoteLabels: { name: string; role: string; connectedAt?: string | null }[];
  patientConnected: boolean;
  isProfessional: boolean;
  appointment: AppointmentDto;
}) {
  const t = useT();
  const [selected, setSelected] = useState<ParticipantInfo | null>(null);
  const waitingName = isProfessional
    ? (appointment.patientName ?? t("Paciente"))
    : (appointment.professionalName ?? t("Profesional"));
  const waitingRole = isProfessional ? t("Paciente") : t("Profesional");
  const participants: ParticipantInfo[] = [
    {
      name: localLabel.name,
      role: localLabel.role,
      connected: true,
      isLocal: true,
      connectedAt: localLabel.connectedAt ?? null,
    },
    ...(remoteLabels.length === 0
      ? [
          {
            name: waitingName,
            role: waitingRole,
            connected: patientConnected,
            isLocal: false,
            connectedAt: null,
          },
        ]
      : remoteLabels.map((info) => ({
          name: info.name,
          role: info.role,
          connected: true,
          isLocal: false,
          connectedAt: info.connectedAt ?? null,
        }))),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <span className="text-[12.5px] font-semibold text-foreground">
            {t("Participantes")}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
            {participants.length}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[11px] text-muted-foreground">
            {appointment.patientName ?? t("Paciente")} ·{" "}
            {appointment.specialtyName ?? t("Especialidad")}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <span
              className={`size-1.5 rounded-full ${patientConnected ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {t(patientConnected ? "Conectado" : "Esperando")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {participants.map((info) => (
          <ParticipantCard
            key={`${info.name}-${info.role}`}
            info={info}
            onOpen={() => setSelected(info)}
          />
        ))}
      </div>
      <ParticipantDialog
        info={selected}
        onOpenChange={(nextOpen) => !nextOpen && setSelected(null)}
        appointment={appointment}
      />
    </div>
  );
}

function FormsBody({
  draftCounts,
  onSelect,
}: {
  draftCounts: Record<FormKind, number>;
  onSelect: (kind: FormKind) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <p className="rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        {t(
          "Documentos de la consulta. Los formularios guardan borradores que sobreviven a recargas.",
        )}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FORM_CATALOG.map((form) => {
          const Icon = form.icon;
          const count = draftCounts[form.kind];
          return (
            <button
              key={form.kind}
              type="button"
              onClick={() => onSelect(form.kind)}
              className="group flex items-center gap-3 rounded-[20px] border border-border/80 bg-card p-3.5 text-left shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-3 focus-visible:ring-primary/20"
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  {
                    teal: "bg-primary/10 text-primary ring-1 ring-primary/10",
                    violet: "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/10",
                    amber: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/10",
                    rose: "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/10",
                  }[form.tint]
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  {t(form.title)}
                  {count > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                      {count}{" "}
                      {t(count === 1 ? "borrador" : "borradores")}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  {t(form.description)}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormBody({
  kind,
  appointment,
  drafts,
  allergies,
  draftCounts,
}: {
  kind: FormKind;
  appointment: AppointmentDto;
  drafts: ReturnType<typeof useFormDrafts>;
  allergies: string[];
  draftCounts: Record<FormKind, number>;
}) {
  const t = useT();
  const meta = FORM_CATALOG.find((f) => f.kind === kind)!;
  return (
    <div className="flex flex-col gap-4">
      <FormHeader
        icon={meta.icon}
        title={t(meta.title)}
        subtitle={t(meta.description)}
        tint={meta.tint}
        count={draftCounts[kind]}
      />
      {kind === "history" && (
        <ClinicalEncounterPanel appointmentId={appointment.id} />
      )}
      {kind === "lab" && (
        <LabOrderForm
          draft={drafts.drafts.labOrder}
          onUpdate={drafts.updateLabOrder}
          onClear={() => drafts.clearForm("labOrder")}
        />
      )}
      {kind === "medications" && (
        <MedicationForm
          draft={drafts.drafts.medications}
          onUpdate={drafts.updateMedications}
          onClear={() => drafts.clearForm("medications")}
          allergies={allergies}
        />
      )}
      {kind === "procedures" && (
        <ProcedureForm
          draft={drafts.drafts.procedures}
          onUpdate={drafts.updateProcedures}
          onClear={() => drafts.clearForm("procedures")}
        />
      )}
    </div>
  );
}

interface ParticipantInfo {
  name: string;
  role: string;
  connected: boolean;
  isLocal: boolean;
  connectedAt: string | null;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ParticipantCard({
  info,
  onOpen,
}: {
  info: ParticipantInfo;
  onOpen: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("Información del participante")}
      className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-left shadow-sm outline-none transition-colors hover:border-primary/30 hover:bg-primary/[0.03] focus-visible:ring-3 focus-visible:ring-primary/20"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-[12px] font-bold text-primary">
        {initialsOf(info.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold text-foreground">
          {info.name}
          {info.isLocal ? ` ${t("(tú)")}` : ""}
        </span>
        <span className="block truncate text-[10.5px] text-muted-foreground">
          {info.role}
        </span>
      </span>
      <span
        className={`flex shrink-0 items-center gap-1 text-[10.5px] font-medium ${
          info.connected ? "text-emerald-600" : "text-muted-foreground"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${info.connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
        />
        {t(info.connected ? "Conectado" : "Esperando")}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ParticipantDialog({
  info,
  onOpenChange,
  appointment,
}: {
  info: ParticipantInfo | null;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentDto;
}) {
  const t = useT();
  return (
    <Dialog open={info !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {info && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-[12px] font-bold text-primary">
                  {initialsOf(info.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">
                    {info.name}
                  </span>
                  <span className="block truncate text-[12px] font-normal text-muted-foreground">
                    {info.role}
                  </span>
                </span>
              </DialogTitle>
              <DialogDescription>
                {t("Información del participante")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2.5">
              {info.connectedAt && (
                <p className="text-[12px] text-muted-foreground">
                  {t("Se unió a las {time}", {
                    time: formatTime(info.connectedAt),
                  })}
                </p>
              )}
              <ParticipantDetailRow
                label={t("Estado")}
                value={t(info.connected ? "Conectado" : "Esperando")}
              />
              <ParticipantDetailRow
                label={t("Especialidad")}
                value={appointment.specialtyName ?? "—"}
              />
              <ParticipantDetailRow
                label={t("Sede")}
                value={appointment.locationName ?? "—"}
              />
              <ParticipantDetailRow
                label={t("Horario")}
                value={formatRange(
                  appointment.scheduledStart,
                  appointment.scheduledEnd,
                )}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ParticipantDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate text-[12.5px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
