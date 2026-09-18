"use client";

import { useCallback, useState } from "react";
import { MapPin, MessageSquareText, Syringe } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { ProcedureDraft } from "../../hooks/use-form-drafts";
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

/**
 * Órdenes de procedimientos de la teleconsulta: filas dinámicas
 * (procedimiento, sitio, indicaciones) + notas generales. Borrador en
 * localStorage vía useFormDrafts.
 */
export function ProcedureForm({
  draft,
  onUpdate,
  onClear,
}: {
  draft: ProcedureDraft;
  onUpdate: (patch: Partial<ProcedureDraft>) => void;
  onClear: () => void;
}) {
  const t = useT();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const updateItem = useCallback(
    (id: string, patch: Partial<ProcedureDraft["items"][number]>) => {
      onUpdate({
        items: draft.items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    [draft.items, onUpdate],
  );

  const addItem = useCallback(() => {
    onUpdate({
      items: [
        ...draft.items,
        { id: newItemId(), name: "", site: "", notes: "" },
      ],
    });
  }, [draft.items, onUpdate]);

  const removeItem = useCallback(
    (id: string) => {
      onUpdate({ items: draft.items.filter((p) => p.id !== id) });
    },
    [draft.items, onUpdate],
  );

  const handleSave = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }, 350);
  };

  const itemCount = draft.items.filter((p) => p.name.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-500/10 px-3 py-2.5">
        <Syringe className="size-4 text-rose-600" />
        <p className="text-[12px] text-rose-700">
          <span className="font-mono font-semibold">{itemCount}</span>{" "}
          {t("{label} en la orden", {
            label: itemCount === 1 ? t("procedimiento") : t("procedimientos"),
          })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {draft.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
            {t(
              "Agregá los procedimientos a programar (curaciones, infiltraciones, exámenes, etc.).",
            )}
          </p>
        )}
        {draft.items.map((item) => (
          <ItemRow key={item.id}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
              <FormField
                label={t("Procedimiento")}
                htmlFor={`proc-name-${item.id}`}
                icon={Syringe}
              >
                <input
                  id={`proc-name-${item.id}`}
                  value={item.name}
                  onChange={(e) =>
                    updateItem(item.id, { name: e.target.value })
                  }
                  placeholder={t("Ej. Curación de herida")}
                  className={formInput}
                />
              </FormField>
              <FormField
                label={t("Sitio")}
                htmlFor={`proc-site-${item.id}`}
                icon={MapPin}
              >
                <input
                  id={`proc-site-${item.id}`}
                  value={item.site}
                  onChange={(e) =>
                    updateItem(item.id, { site: e.target.value })
                  }
                  placeholder={t("Ej. Miembro inferior derecho")}
                  className={formInput}
                />
              </FormField>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField
                  label={t("Indicaciones")}
                  htmlFor={`proc-notes-${item.id}`}
                  icon={MessageSquareText}
                >
                  <textarea
                    id={`proc-notes-${item.id}`}
                    value={item.notes}
                    onChange={(e) =>
                      updateItem(item.id, { notes: e.target.value })
                    }
                    placeholder={t("Preparación, asepsia, materiales…")}
                    rows={2}
                    className={formTextarea}
                  />
                </FormField>
              </div>
              <RemoveRowButton
                onClick={() => removeItem(item.id)}
                label={t("Eliminar {name}", {
                  name: item.name || t("procedimiento"),
                })}
              />
            </div>
          </ItemRow>
        ))}
        <AddRowButton
          onClick={addItem}
          label={t("Agregar procedimiento")}
        />
      </div>

      <DraftActions
        onSave={handleSave}
        onClear={onClear}
        busy={busy}
        saved={saved}
      />
    </div>
  );
}
