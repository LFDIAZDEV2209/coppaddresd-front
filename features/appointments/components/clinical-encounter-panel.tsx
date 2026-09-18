"use client";

import { useT } from "@/providers/i18n-provider";
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
} from "../services/appointments-service";
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
 * consulta. Se reutiliza en el detalle de cita y en el panel de formularios
 * de la sala virtual, siempre con el tema claro del ERP.
 */
export function ClinicalEncounterPanel({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const t = useT();
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

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <ClipboardPenLine className="size-4 text-primary" />
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
              ? { bg: "#E6F7EF", text: "#0E7A4D", dot: "#10B981" }
              : { bg: "#FDF2E3", text: "#9A6A0A", dot: "#F59E0B" }
          }
        />
      </div>

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Field
          label={t("Motivo de consulta")}
          value={encounter.motivoConsulta ?? ""}
          onChange={(v) => update("motivoConsulta", v)}
          disabled={isCompleted}
        />
        <Field
          label={t("Evaluación")}
          value={encounter.evaluacion ?? ""}
          onChange={(v) => update("evaluacion", v)}
          disabled={isCompleted}
        />
        <Field
          label={t("Diagnóstico")}
          value={encounter.diagnostico ?? ""}
          onChange={(v) => update("diagnostico", v)}
          disabled={isCompleted}
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11.5px] font-semibold text-muted-foreground">
            CIE-10 (búsqueda)
          </Label>
          <CatalogSearchSelect
            search={searchIcd10Codes}
            placeholder={t("Agregar código CIE-10…")}
            icon={ClipboardPenLine}
            onSelect={(item) => {
              const label = `${item.code ?? ""} — ${item.name}`.trim();
              const current = (encounter.diagnostico ?? "").trim();
              if (current.includes(label)) return;
              update("diagnostico", current ? `${current}\n${label}` : label);
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Seleccioná un código para agregarlo al diagnóstico
          </p>
        </div>
        <Field
          label={t("Plan")}
          value={encounter.plan ?? ""}
          onChange={(v) => update("plan", v)}
          disabled={isCompleted}
        />
        <Field
          label={t("Indicaciones")}
          value={encounter.indicaciones ?? ""}
          onChange={(v) => update("indicaciones", v)}
          disabled={isCompleted}
        />
        <Field
          label={t("Observaciones")}
          value={encounter.observaciones ?? ""}
          onChange={(v) => update("observaciones", v)}
          disabled={isCompleted}
        />
        <Field
          label={t("Seguimiento")}
          value={encounter.seguimiento ?? ""}
          onChange={(v) => update("seguimiento", v)}
          disabled={isCompleted}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="encounter-notes">
          Notas
        </Label>
        <textarea
          id="encounter-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("Notas adicionales de la consulta")}
          disabled={isCompleted}
          className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => persist(false)}
            disabled={busy}
            className="gap-1.5"
          >
            <Save className="size-4" />
            Guardar borrador
          </Button>
          <Button
            onClick={() => persist(true)}
            disabled={busy}
            className="gap-1.5"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        className="min-h-14 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
    </div>
  );
}
