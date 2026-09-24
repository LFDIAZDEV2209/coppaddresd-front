"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  ClipboardPenLine,
  FlaskConical,
  Pill,
  ShieldCheck,
  Syringe,
  User,
  Users,
  X,
} from "lucide-react";
import { useFormDrafts } from "../hooks/use-form-drafts";
import { getPatient } from "@/features/patients/services/patients-service";
import type { Patient } from "@/features/patients/types";
import { ClinicalEncounterPanel } from "./clinical-encounter-panel";
import { LabOrderForm } from "./forms/lab-order-form";
import { MedicationForm } from "./forms/medication-form";
import { ProcedureForm } from "./forms/procedure-form";
import { FormHeader } from "./forms/form-ui";
import { PatientContextCard } from "./forms/patient-context-card";
import type { AppointmentDto } from "../types";

export type ConsultationPanelTab = "participants" | "forms";

type FormKind = "history" | "lab" | "medications" | "procedures";

/** Altura del panel inferior (debe coincidir con el spacer de VirtualRoom). */
export const PANEL_HEIGHT = "h-[min(48vh,440px)]";

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
}: {
  open: boolean;
  onClose: () => void;
  tab: ConsultationPanelTab;
  onTabChange: (tab: ConsultationPanelTab) => void;
  appointment: AppointmentDto;
  patientConnected: boolean;
  isProfessional: boolean;
  canManage: boolean;
  localLabel: { name: string; role: string };
  remoteLabels: { name: string; role: string }[];
}) {
  const [selectedForm, setSelectedForm] = useState<FormKind | null>(null);
  const drafts = useFormDrafts(appointment.id);
  const [patient, setPatient] = useState<{
    patient: Patient;
    age: number | null;
  } | null>(null);

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

  return (
    <>
      <aside
        aria-label="Panel de la consulta"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-40 flex ${PANEL_HEIGHT} flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        <header className="flex h-11 shrink-0 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            {selectedForm ? (
              <>
                <button
                  type="button"
                  onClick={backToForms}
                  aria-label="Volver a los formularios"
                  className="flex size-7 items-center justify-center rounded-lg text-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {FORM_CATALOG.find((f) => f.kind === selectedForm)?.title}
                </p>
              </>
            ) : (
              <p className="truncate text-[13px] font-semibold text-foreground">
                {tab === "participants"
                  ? "Participantes"
                  : "Formularios médicos"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="flex size-7 items-center justify-center rounded-lg text-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <X className="size-4" />
          </button>
        </header>

        {!selectedForm && (
          <div className="flex shrink-0 gap-1 px-4 pb-2">
            <TabButton
              active={tab === "participants"}
              onClick={() => onTabChange("participants")}
              label="Participantes"
              icon={Users}
            />
            {canManage && (
              <TabButton
                active={tab === "forms"}
                onClick={() => onTabChange("forms")}
                label="Formularios médicos"
                icon={ClipboardList}
              />
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
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
                  />
                )}
                {canManage && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
                      <ShieldCheck className="size-3.5" /> Consulta en curso
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-primary/70">
                      Los formularios guardan borradores automáticos por cita.
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
          aria-label="Cerrar panel"
          className="fixed inset-0 z-30 bg-foreground/40 lg:bg-foreground/20"
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground/85"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function ParticipantsBody({
  localLabel,
  remoteLabels,
  patientConnected,
  isProfessional,
  appointment,
}: {
  localLabel: { name: string; role: string };
  remoteLabels: { name: string; role: string }[];
  patientConnected: boolean;
  isProfessional: boolean;
  appointment: AppointmentDto;
}) {
  const waitingName = isProfessional
    ? (appointment.patientName ?? "Paciente")
    : (appointment.professionalName ?? "Profesional");
  const waitingRole = isProfessional ? "Paciente" : "Profesional";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ParticipantRow
          name={localLabel.name}
          role={localLabel.role}
          isLocal
          connected
        />
        {remoteLabels.length === 0 && (
          <ParticipantRow
            name={waitingName}
            role={waitingRole}
            connected={patientConnected}
          />
        )}
        {remoteLabels.map((info) => (
          <ParticipantRow
            key={info.name}
            name={info.name}
            role={info.role}
            connected
          />
        ))}
      </div>
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
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 pb-1 text-[11.5px] leading-relaxed text-muted-foreground">
        Documentos de la consulta. Los formularios guardan borradores que
        sobreviven a recargas.
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
              className="group flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-left outline-none transition-colors hover:border-border hover:bg-white/[0.08] focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  {
                    teal: "bg-primary/10 text-primary",
                    violet: "bg-violet-500/15 text-violet-300",
                    amber: "bg-amber-500/15 text-amber-300",
                    rose: "bg-rose-500/15 text-destructive",
                  }[form.tint]
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  {form.title}
                  {count > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                      {count} borrador
                      {count === 1 ? "" : "es"}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  {form.description}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/80 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70" />
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
  const meta = FORM_CATALOG.find((f) => f.kind === kind)!;
  return (
    <div className="flex flex-col gap-4">
      <FormHeader
        icon={meta.icon}
        title={meta.title}
        subtitle={meta.description}
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

function ParticipantRow({
  name,
  role,
  connected,
  isLocal,
}: {
  name: string;
  role: string;
  connected: boolean;
  isLocal?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <User className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-foreground">
          {name}
          {isLocal ? " (tú)" : ""}
        </p>
        <p className="text-[10.5px] text-muted-foreground">{role}</p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-1 text-[10.5px] font-medium ${
          connected ? "text-emerald-400" : "text-muted-foreground/80"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-600"}`}
        />
        {connected ? "Conectado" : "Esperando"}
      </span>
    </div>
  );
}
