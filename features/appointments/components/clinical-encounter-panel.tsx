"use client";

import { useT } from "@/providers/i18n-provider";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardPenLine,
  FileClock,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  addEncounterAddendum,
  completeEncounter,
  fetchEncounter,
  fetchEncounterAddenda,
  saveEncounter,
} from "../services/appointments-service";
import { encounterStatusLabel, formatDateTime } from "../utils/format";
import { searchIcd10Codes } from "@/features/patients/services/catalogs-service";
import { CatalogSearchSelect } from "./forms/catalog-search-select";
import type { ClinicalDataDto, EncounterAddendumDto } from "../types";

/**
 * Límite de la adenda en la UI. El backend valida 1–4000; el ERP es más
 * conservador (1–2000) por tratarse de una corrección puntual del registro.
 */
const ADDENDUM_MAX_LENGTH = 2000;

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
  const [addenda, setAddenda] = useState<EncounterAddendumDto[]>([]);
  const [addendaError, setAddendaError] = useState(false);
  const [addendaLoadedFor, setAddendaLoadedFor] = useState<string | null>(null);
  const [addendumBody, setAddendumBody] = useState("");
  const [addendumBusy, setAddendumBusy] = useState(false);
  const [addendumError, setAddendumError] = useState<string | null>(null);

  const isCompleted = status === "Completed";
  // Derivado (sin setState en efectos): hay carga pendiente solo con el
  // encuentro completado y la lista de la cita actual aún sin resolver.
  const addendaLoading = isCompleted && addendaLoadedFor !== appointmentId;

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
          // Fallo de red u otro error: el backend ya devuelve 200 con borrador
          // vacío cuando no hay encuentro; aquí tratamos igual (borrador).
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

  // Las adendas solo existen sobre un encuentro completado y son append-only:
  // el registro original queda intacto y no se ofrecen acciones de edición.
  useEffect(() => {
    if (!isCompleted) return;
    let active = true;
    (async () => {
      try {
        const result = await fetchEncounterAddenda(appointmentId);
        if (!active) return;
        setAddenda(result);
        setAddendaError(false);
      } catch {
        if (active) setAddendaError(true);
      } finally {
        if (active) setAddendaLoadedFor(appointmentId);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId, isCompleted]);

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

  // Append-only: el POST devuelve la adenda creada y se agrega al final.
  const submitAddendum = async () => {
    const body = addendumBody.trim();
    if (!body || addendumBusy) return;
    setAddendumBusy(true);
    setAddendumError(null);
    try {
      const created = await addEncounterAddendum(appointmentId, body);
      setAddenda((prev) => [...prev, created]);
      setAddendumBody("");
    } catch {
      setAddendumError("No se pudo guardar la adenda.");
    } finally {
      setAddendumBusy(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <ClipboardPenLine className="size-4 text-primary" />
          {t("Historia clínica")}
        </h2>
        <StatusBadge
          status={t(
            encounterStatusLabel[
              (status as "Draft" | "Completed" | "Cancelled") ?? "Draft"
            ] ?? "Borrador",
          )}
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
          {t(error)}
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
          <Label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            {t("CIE-10 (búsqueda)")}
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
            {t("Seleccioná un código para agregarlo al diagnóstico")}
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

        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
        <Label htmlFor="encounter-notes">{t("Notas")}</Label>
        <textarea
          id="encounter-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("Notas adicionales de la consulta")}
          disabled={isCompleted}
          className="min-h-20 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => persist(false)}
            disabled={busy}
            className="h-10 rounded-xl gap-1.5"
          >
            <Save className="size-4" />
            {t("Guardar borrador")}
          </Button>
          <Button
            onClick={() => persist(true)}
            disabled={busy}
            className="h-10 rounded-xl gap-1.5"
          >
            <CheckCircle2 className="size-4" />
            {t("Completar encuentro")}
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <FileClock className="size-4 text-primary" />
              {t("Adendas")}
            </h3>
            {addenda.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                {addenda.length}
              </span>
            )}
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            {t(
              "El registro original no se modifica. Cada adenda queda firmada con autor y fecha.",
            )}
          </p>

          {addendaLoading ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : addendaError ? (
            <p
              className="rounded-xl bg-destructive-soft px-4 py-3 text-[12px] text-destructive"
              role="alert"
            >
              {t("No se pudieron cargar las adendas.")}
            </p>
          ) : addenda.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-center text-[12px] text-muted-foreground">
              {t("Sin adendas")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {addenda.map((addendum) => (
                <li
                  key={addendum.id}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-[12px] font-semibold text-foreground">
                      {addendum.authorName ?? t("Profesional")}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {formatDateTime(addendum.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-foreground">
                    {addendum.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
            <Label htmlFor="encounter-addendum">{t("Agregar adenda")}</Label>
            <textarea
              id="encounter-addendum"
              value={addendumBody}
              onChange={(event) => setAddendumBody(event.target.value)}
              placeholder={t("Escribí la corrección o aclaración…")}
              maxLength={ADDENDUM_MAX_LENGTH}
              rows={3}
              disabled={addendumBusy}
              className="min-h-20 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10.5px] tabular-nums text-muted-foreground">
                {addendumBody.trim().length}/{ADDENDUM_MAX_LENGTH}
              </span>
              <Button
                onClick={() => void submitAddendum()}
                disabled={addendumBusy || addendumBody.trim().length === 0}
                className="h-9 rounded-xl gap-1.5"
              >
                {addendumBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {t("Agregar adenda")}
              </Button>
            </div>
            {addendumError && (
              <p className="text-[11.5px] text-destructive" role="alert">
                {t(addendumError)}
              </p>
            )}
          </div>
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
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border/70 bg-muted/20 p-3">
      <Label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        className="min-h-14 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
    </div>
  );
}
