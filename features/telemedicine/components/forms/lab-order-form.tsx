"use client";

import { useCallback, useState } from "react";
import {
  FlaskConical,
  Flag,
  Microscope,
  TestTube,
  MessageSquareText,
} from "lucide-react";
import type { LabOrderDraft } from "../../hooks/use-form-drafts";
import { newItemId } from "../../hooks/use-form-drafts";
import {
  AddRowButton,
  darkInput,
  darkTextarea,
  DraftActions,
  FormField,
  ItemRow,
  RemoveRowButton,
} from "./form-ui";

const SAMPLE_TYPES = ["Sangre", "Orina", "Heces", "Saliva", "Hisopado", "Otro"];

const PRIORITIES = ["Rutina", "Prioritaria", "Urgente"] as const;

const SUGGESTED_TESTS = [
  "Hemograma completo",
  "Glucosa en ayunas",
  "Hemoglobina glicosilada (HbA1c)",
  "Perfil lipídico",
  "Creatinina",
  "TSH",
  "Transaminasas (TGO/TGP)",
  "Urocultivo",
];

/**
 * Orden de laboratorio de la teleconsulta: tipo de muestra + pruebas
 * dinámicas (agregar/eliminar filas) + observaciones. Borrador en
 * localStorage vía useFormDrafts.
 */
export function LabOrderForm({
  draft,
  onUpdate,
  onClear,
}: {
  draft: LabOrderDraft;
  onUpdate: (patch: Partial<LabOrderDraft>) => void;
  onClear: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const updateTest = useCallback(
    (id: string, patch: Partial<LabOrderDraft["tests"][number]>) => {
      onUpdate({
        tests: draft.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      });
    },
    [draft.tests, onUpdate],
  );

  const addTest = useCallback(() => {
    onUpdate({
      tests: [
        ...draft.tests,
        { id: newItemId(), test: "", priority: "Rutina" },
      ],
    });
  }, [draft.tests, onUpdate]);

  const removeTest = useCallback(
    (id: string) => {
      onUpdate({ tests: draft.tests.filter((t) => t.id !== id) });
    },
    [draft.tests, onUpdate],
  );

  const handleSave = () => {
    setBusy(true);
    // Persistencia inmediata (ya vive en localStorage); el delay simula el
    // guardado y evita doble click.
    window.setTimeout(() => {
      setBusy(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }, 350);
  };

  const testCount = draft.tests.filter((t) => t.test.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Tipo de muestra" icon={TestTube}>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onUpdate({ sampleType: type })}
                aria-pressed={draft.sampleType === type}
                className={`h-7 rounded-full px-3 text-[12px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-teal-400/30 ${
                  draft.sampleType === type
                    ? "bg-teal-500 text-slate-950"
                    : "border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </FormField>
        <div className="flex flex-col justify-end gap-1.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-300">
            <FlaskConical className="size-3.5 text-slate-500" />
            Pruebas solicitadas
          </p>
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-[12.5px] text-slate-300">
            <span className="font-mono font-semibold text-teal-300">
              {testCount}
            </span>{" "}
            {testCount === 1 ? "prueba" : "pruebas"} ·{" "}
            {draft.sampleType.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-300">
          <Microscope className="size-3.5 text-slate-500" />
          Pruebas sugeridas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_TESTS.filter(
            (s) => !draft.tests.some((t) => t.test === s),
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                onUpdate({
                  tests: [
                    ...draft.tests,
                    { id: newItemId(), test: s, priority: "Rutina" },
                  ],
                })
              }
              className="h-7 rounded-full border border-white/10 bg-white/[0.06] px-3 text-[11.5px] text-slate-300 outline-none transition-colors hover:border-teal-400/40 hover:bg-teal-400/10 hover:text-teal-200 focus-visible:ring-3 focus-visible:ring-teal-400/30"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {draft.tests.length === 0 && (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-3 text-[12px] text-slate-400">
            <Microscope className="size-4 text-slate-500" />
            Agregá las pruebas que querés solicitar al laboratorio.
          </p>
        )}
        {draft.tests.map((test) => (
          <ItemRow key={test.id}>
            <div className="flex items-center gap-2">
              <FormField
                label="Prueba"
                htmlFor={`lab-test-${test.id}`}
                icon={Microscope}
              >
                <input
                  id={`lab-test-${test.id}`}
                  value={test.test}
                  onChange={(e) =>
                    updateTest(test.id, { test: e.target.value })
                  }
                  placeholder="Ej. Hemograma completo"
                  className={darkInput}
                />
              </FormField>
              <div className="flex min-w-32 flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-300">
                  <Flag className="size-3.5 text-slate-500" />
                  Prioridad
                </span>
                <select
                  value={test.priority}
                  onChange={(e) =>
                    updateTest(test.id, {
                      priority: e.target.value as (typeof PRIORITIES)[number],
                    })
                  }
                  className={darkInput}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <RemoveRowButton
                onClick={() => removeTest(test.id)}
                label={`Eliminar prueba ${test.test || "sin nombre"}`}
              />
            </div>
          </ItemRow>
        ))}
        <AddRowButton onClick={addTest} label="Agregar prueba" />
      </div>

      <FormField
        label="Observaciones"
        hint="Indicaciones para el laboratorio o el paciente"
        icon={MessageSquareText}
      >
        <textarea
          value={draft.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Ej. Paciente en ayuno de 8 horas"
          className={darkTextarea}
        />
      </FormField>

      <DraftActions
        onSave={handleSave}
        onClear={onClear}
        busy={busy}
        saved={saved}
      />
    </div>
  );
}

export function LabOrderIcon() {
  return <FlaskConical className="size-4" />;
}
