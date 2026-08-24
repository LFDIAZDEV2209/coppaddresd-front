"use client";

import { useEffect, useState } from "react";
import { ClipboardPenLine, Save, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  fetchEncounter,
  saveEncounter,
  completeEncounter,
} from "../services/telemedicine-service";
import { encounterStatusLabel } from "../utils/format";
import { searchIcd10Codes } from "@/features/patients/services/catalogs-service";
import { CatalogSearchSelect } from "./forms/catalog-search-select";
import type { ClinicalDataDto } from "../types";

const EMPTY_CLINICAL_DATA: ClinicalDataDto = {
  motivoConsulta: "",
  evaluacion: "",
  diagnostico: "",
  plan: "",
  indicaciones: "",
  observaciones: "",
  seguimiento: "",
};

/**
 * Formulario del encuentro clínico de una cita: nota SOAP simplificada
 * (motivo, evaluación, diagnóstico, plan, indicaciones, observaciones,
 * seguimiento) + notas libres. Guarda borradores y permite completar la
 * consulta. Reutilizado en el detalle de cita (variant "light") y en el
 * panel de formularios de la sala virtual (variant "dark").
 */
export function ClinicalEncounterPanel({
  appointmentId,
  variant = "light",
}: {
  appointmentId: string;
  variant?: "light" | "dark";
}) {
  const [encounter, setEncounter] =
    useState<ClinicalDataDto>(EMPTY_CLINICAL_DATA);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchEncounter(appointmentId);
        if (!active) return;
        setEncounter(result.clinicalData ?? EMPTY_CLINICAL_DATA);
        setNotes(result.notes ?? "");
        setStatus(result.status);
      } catch {
        if (active) {
          // No hay encuentro todavía (creación perezosa).
          setStatus("Draft");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  const update = (field: keyof ClinicalDataDto, value: string) => {
    setEncounter((prev) => ({ ...prev, [field]: value }));
  };

  const persist = async (complete: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (complete) {
        await completeEncounter(appointmentId, {
          clinicalData: encounter,
          notes,
        });
        setStatus("Completed");
      } else {
        await saveEncounter(appointmentId, { clinicalData: encounter, notes });
        setStatus("Draft");
      }
    } catch {
      setError("No se pudo guardar el encuentro clínico.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const isCompleted = status === "Completed";
  const dark = variant === "dark";

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border p-4 ${
        dark ? "border-white/10 bg-white/[0.04]" : "border-border bg-card p-5"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2
          className={`flex items-center gap-2 text-[14px] font-semibold ${
            dark ? "text-white" : "text-[15px] text-foreground"
          }`}
        >
          <ClipboardPenLine
            className={`size-4 ${dark ? "text-teal-300" : "text-primary"}`}
          />
          Historia clínica
        </h2>
        <StatusBadge
          status={
            encounterStatusLabel[
              (status as "Draft" | "Completed" | "Cancelled") ?? "Draft"
            ] ?? "Borrador"
          }
          color={
            isCompleted
              ? dark
                ? { bg: "#0B2E22", text: "#4ADE80", dot: "#10B981" }
                : { bg: "#E6F7EF", text: "#0E7A4D", dot: "#10B981" }
              : dark
                ? { bg: "#3A2E0E", text: "#FCD34D", dot: "#F59E0B" }
                : { bg: "#FDF2E3", text: "#9A6A0A", dot: "#F59E0B" }
          }
        />
      </div>

      {error && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            dark
              ? "bg-rose-500/10 text-rose-300"
              : "bg-destructive-soft text-destructive"
          }`}
          role="alert"
        >
          {error}
        </p>
      )}

      <div
        className={`grid grid-cols-1 gap-3 ${dark ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        <Field
          label="Motivo de consulta"
          value={encounter.motivoConsulta ?? ""}
          onChange={(v) => update("motivoConsulta", v)}
          disabled={isCompleted}
          dark={dark}
        />
        <Field
          label="Evaluación"
          value={encounter.evaluacion ?? ""}
          onChange={(v) => update("evaluacion", v)}
          disabled={isCompleted}
          dark={dark}
        />
        <Field
          label="Diagnóstico"
          value={encounter.diagnostico ?? ""}
          onChange={(v) => update("diagnostico", v)}
          disabled={isCompleted}
          dark={dark}
        />
        {dark && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11.5px] font-semibold text-slate-300">
              CIE-10 (búsqueda)
            </Label>
            <CatalogSearchSelect
              search={searchIcd10Codes}
              placeholder="Agregar código CIE-10…"
              icon={ClipboardPenLine}
              onSelect={(item) => {
                const label = `${item.code ?? ""} — ${item.name}`.trim();
                const current = (encounter.diagnostico ?? "").trim();
                if (current.includes(label)) return;
                update("diagnostico", current ? `${current}\n${label}` : label);
              }}
            />
            <p className="text-[11px] text-slate-500">
              Seleccioná un código para agregarlo al diagnóstico
            </p>
          </div>
        )}
        <Field
          label="Plan"
          value={encounter.plan ?? ""}
          onChange={(v) => update("plan", v)}
          disabled={isCompleted}
          dark={dark}
        />
        <Field
          label="Indicaciones"
          value={encounter.indicaciones ?? ""}
          onChange={(v) => update("indicaciones", v)}
          disabled={isCompleted}
          dark={dark}
        />
        <Field
          label="Observaciones"
          value={encounter.observaciones ?? ""}
          onChange={(v) => update("observaciones", v)}
          disabled={isCompleted}
          dark={dark}
        />
        <Field
          label="Seguimiento"
          value={encounter.seguimiento ?? ""}
          onChange={(v) => update("seguimiento", v)}
          disabled={isCompleted}
          dark={dark}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="encounter-notes"
          className={
            dark ? "text-[11.5px] font-semibold text-slate-300" : undefined
          }
        >
          Notas
        </Label>
        <textarea
          id="encounter-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales de la consulta"
          disabled={isCompleted}
          className={
            dark
              ? "min-h-16 w-full resize-y rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 py-2 text-[13px] text-white outline-none placeholder:text-slate-500 transition-colors focus-visible:border-teal-400/60 focus-visible:ring-3 focus-visible:ring-teal-400/20 disabled:opacity-50"
              : "min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          }
        />
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => persist(false)}
            disabled={busy}
            className={
              dark
                ? "gap-1.5 border-slate-600/60 bg-slate-800/80 text-slate-100 hover:bg-slate-700/80 hover:text-white"
                : "gap-1.5"
            }
          >
            <Save className="size-4" />
            Guardar borrador
          </Button>
          <Button
            onClick={() => persist(true)}
            disabled={busy}
            className={
              dark
                ? "gap-1.5 bg-teal-500 text-slate-950 hover:bg-teal-400"
                : "gap-1.5"
            }
          >
            <CheckCircle2 className="size-4" />
            Completar encuentro
          </Button>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  dark = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        className={
          dark ? "text-[11.5px] font-semibold text-slate-300" : undefined
        }
      >
        {label}
      </Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        className={
          dark
            ? "min-h-14 w-full resize-y rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 py-2 text-[13px] text-white outline-none placeholder:text-slate-500 transition-colors focus-visible:border-teal-400/60 focus-visible:ring-3 focus-visible:ring-teal-400/20 disabled:opacity-50"
            : "min-h-14 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        }
      />
    </div>
  );
}
