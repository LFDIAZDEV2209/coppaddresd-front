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
  DraftActions,
  FormField,
  formInput,
  formTextarea,
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
                className={`h-7 rounded-full px-3 text-[12px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/20 ${
                  draft.sampleType === type
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </FormField>
        <div className="flex flex-col justify-end gap-1.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground">
            <FlaskConical className="size-3.5 text-muted-foreground" />
            Pruebas solicitadas
          </p>
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-[12.5px] text-muted-foreground">
            <span className="font-mono font-semibold text-primary">
              {testCount}
            </span>{" "}
            {testCount === 1 ? "prueba" : "pruebas"} ·{" "}
            {draft.sampleType.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground">
          <Microscope className="size-3.5 text-muted-foreground" />
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
              className="h-7 rounded-full border border-border bg-background px-3 text-[11.5px] text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-primary/20"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {draft.tests.length === 0 && (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
            <Microscope className="size-4 text-muted-foreground" />
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
                  className={formInput}
                />
              </FormField>
              <div className="flex min-w-32 flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground">
                  <Flag className="size-3.5 text-muted-foreground" />
                  Prioridad
                </span>
                <select
                  value={test.priority}
                  onChange={(e) =>
                    updateTest(test.id, {
                      priority: e.target.value as (typeof PRIORITIES)[number],
                    })
                  }
                  className={formInput}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
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
          className={formTextarea}
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
