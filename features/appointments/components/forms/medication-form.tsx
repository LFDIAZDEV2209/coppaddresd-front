"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, FlaskConical, Pill, Timer, Zap } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { MedicationDraft } from "../../hooks/use-form-drafts";
import { newItemId } from "../../hooks/use-form-drafts";
import { searchMedications } from "@/features/patients/services/catalogs-service";
import { CatalogSearchSelect } from "./catalog-search-select";
import {
  AddRowButton,
  DraftActions,
  FormField,
  formInput,
  formTextarea,
  ItemRow,
  RemoveRowButton,
} from "./form-ui";

const ROUTES = [
  "Oral",
  "IV",
  "IM",
  "Subcutánea",
  "Inhalatoria",
  "Tópica",
  "Otro",
];

const FREQUENCIES = [
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "Cada 6 horas",
  "Cada 4 horas",
  "A demanda",
];

function allergyWarning(
  medicationName: string,
  allergies: string[],
): string | null {
  const normalized = medicationName.toLowerCase();
  return (
    allergies.find(
      (a) =>
        normalized.includes(a.toLowerCase()) ||
        a.toLowerCase().includes(normalized),
    ) ?? null
  );
}

/**
 * Órdenes de medicamentos de la teleconsulta: filas dinámicas con
 * autocompletado del catálogo de medicamentos del backend, alerta de alergia
 * cruzada contra las alergias registradas del paciente y notas. Borrador en
 * localStorage vía useFormDrafts.
 */
export function MedicationForm({
  draft,
  onUpdate,
  onClear,
  allergies = [],
}: {
  draft: MedicationDraft;
  onUpdate: (patch: Partial<MedicationDraft>) => void;
  onClear: () => void;
  allergies?: string[];
}) {
  const t = useT();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const updateItem = useCallback(
    (id: string, patch: Partial<MedicationDraft["items"][number]>) => {
      onUpdate({
        items: draft.items.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
    },
    [draft.items, onUpdate],
  );

  const addItem = useCallback(() => {
    onUpdate({
      items: [
        ...draft.items,
        {
          id: newItemId(),
          name: "",
          dose: "",
          route: "Oral",
          frequency: "Cada 8 horas",
          duration: "",
        },
      ],
    });
  }, [draft.items, onUpdate]);

  const removeItem = useCallback(
    (id: string) => {
      onUpdate({ items: draft.items.filter((m) => m.id !== id) });
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

  const itemCount = draft.items.filter((m) => m.name.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-500/10 px-3 py-2.5">
        <Pill className="size-4 text-amber-600" />
        <p className="text-[12px] text-amber-700">
          <span className="font-mono font-semibold">{itemCount}</span>{" "}
          {t("{label} en la orden", {
            label: itemCount === 1 ? t("medicamento") : t("medicamentos"),
          })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {draft.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
            {t(
              "Agregá los medicamentos que querés formular en esta consulta. Buscá por nombre en el catálogo del sistema.",
            )}
          </p>
        )}
        {draft.items.map((item) => {
          const warning = allergyWarning(item.name, allergies);
          return (
            <ItemRow key={item.id}>
              <div
                className={`rounded-xl p-2.5 ${
                  warning ? "border border-destructive/30 bg-destructive/10" : ""
                }`}
              >
                {warning && (
                  <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-[11.5px] font-medium text-destructive">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    {t("Alergia registrada: {name}", { name: warning })}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                  <FormField
                    label={t("Medicamento")}
                    htmlFor={`med-name-${item.id}`}
                    icon={Pill}
                  >
                    <input
                      id={`med-name-${item.id}`}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, { name: e.target.value })
                      }
                      placeholder={t("Ej. Metformina 850 mg")}
                      className={formInput}
                    />
                  </FormField>
                  <FormField
                    label={t("Dosis")}
                    htmlFor={`med-dose-${item.id}`}
                    icon={Zap}
                  >
                    <input
                      id={`med-dose-${item.id}`}
                      value={item.dose}
                      onChange={(e) =>
                        updateItem(item.id, { dose: e.target.value })
                      }
                      placeholder={t("Ej. 1 tableta")}
                      className={formInput}
                    />
                  </FormField>
                  <FormField label={t("Vía")}>
                    <select
                      value={item.route}
                      onChange={(e) =>
                        updateItem(item.id, { route: e.target.value })
                      }
                      className={formInput}
                    >
                      {ROUTES.map((r) => (
                        <option key={r} value={r}>
                          {t(r)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t("Frecuencia")}>
                    <select
                      value={item.frequency}
                      onChange={(e) =>
                        updateItem(item.id, { frequency: e.target.value })
                      }
                      className={formInput}
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>
                          {t(f)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <div className="mt-2 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <FormField
                    label={t("Duración")}
                    htmlFor={`med-duration-${item.id}`}
                    icon={Timer}
                  >
                    <input
                      id={`med-duration-${item.id}`}
                      value={item.duration}
                      onChange={(e) =>
                        updateItem(item.id, { duration: e.target.value })
                      }
                      placeholder={t("Ej. 10 días")}
                      className={formInput}
                    />
                  </FormField>
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground">
                      <FlaskConical className="size-3.5 text-muted-foreground" />
                      {t("Catálogo del sistema")}
                    </span>
                    <CatalogSearchSelect
                      search={searchMedications}
                      placeholder={t("Buscar medicamento…")}
                      accent="amber"
                      icon={Pill}
                      onSelect={(item) =>
                        updateItem(item.id, { name: item.name })
                      }
                    />
                  </div>
                  <RemoveRowButton
                    onClick={() => removeItem(item.id)}
                    label={t("Eliminar {name}", {
                      name: item.name || t("medicamento"),
                    })}
                  />
                </div>
              </div>
            </ItemRow>
          );
        })}
        <AddRowButton onClick={addItem} label={t("Agregar medicamento")} />
      </div>

      <FormField
        label={t("Notas")}
        hint={t("Instrucciones para el paciente (ej. con alimentos)")}
      >
        <textarea
          value={draft.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder={t("Ej. Tomar con las comidas")}
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
