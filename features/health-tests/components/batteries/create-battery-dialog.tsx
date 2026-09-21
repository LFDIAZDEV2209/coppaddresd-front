"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Search, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HealthTest } from "../../types";
import type { CreateBatteryInput } from "../../services/health-tests-service";
import { categoryAccent } from "../shared/colors";

interface DraftItem {
  testId: string;
  required: boolean;
  frequencyDays: string;
}

const fieldClassName =
  "w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/**
 * Formulario de creación de batería (usado por la página /health-tests/baterias/new):
 * código, nombre, descripción, auto-asignación y picker de tests con orden,
 * obligatoriedad y frecuencia.
 */
export function CreateBatteryFields({
  tests,
  saving,
  onCreate,
  onCancel,
}: {
  tests: HealthTest[];
  saving: boolean;
  onCreate: (input: CreateBatteryInput) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const testsById = new Map(tests.map((test) => [test.id, test]));
  const normalized = deferredSearch.trim().toLowerCase();
  const filteredTests = tests.filter(
    (test) =>
      !normalized ||
      test.name.toLowerCase().includes(normalized) ||
      test.code.toLowerCase().includes(normalized),
  );

  const toggleTest = (test: HealthTest) => {
    setItems((prev) =>
      prev.some((item) => item.testId === test.id)
        ? prev.filter((item) => item.testId !== test.id)
        : [...prev, { testId: test.id, required: true, frequencyDays: "" }],
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const patchItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setValidationError(t("El código es obligatorio"));
      return;
    }
    if (!name.trim()) {
      setValidationError(t("El nombre es obligatorio"));
      return;
    }
    if (items.length === 0) {
      setValidationError(t("Selecciona al menos un test"));
      return;
    }
    setValidationError(null);
    const input: CreateBatteryInput = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      autoAssignOnPatientCreate: autoAssign,
      items: items.map((item, index) => {
        const days = Number.parseInt(item.frequencyDays, 10);
        return {
          instrumentId: item.testId,
          versionId: testsById.get(item.testId)?.versionId ?? undefined,
          sortOrder: index + 1,
          isRequired: item.required,
          frequencyDays: Number.isFinite(days) && days > 0 ? days : undefined,
        };
      }),
    };
    try {
      await onCreate(input);
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : t("No se pudo crear la batería"),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-6 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="battery-code">{t("Código")}</Label>
                <Input
                  id="battery-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="bateria-seguimiento"
                  maxLength={64}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="battery-name">{t("Nombre")}</Label>
                <Input
                  id="battery-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("Batería de seguimiento")}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="battery-description">{t("Descripción")}</Label>
              <textarea
                id="battery-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                className={`${fieldClassName} min-h-20 resize-y py-2`}
              />
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium">
                  {t("Auto-asignación de pacientes nuevos")}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t(
                    "Los pacientes nuevos recibirán automáticamente los tests de esta batería.",
                  )}
                </span>
              </span>
              <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
            </label>

            <section className="flex flex-col gap-3">
              <div>
                <h3 className="text-[13px] font-semibold">
                  {t("Tests de la batería")}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "Selecciona los tests y ajusta el orden, la obligatoriedad y la frecuencia.",
                  )}
                </p>
              </div>

              {items.length > 0 && (
                <ol className="flex flex-col gap-2">
                  {items.map((item, index) => {
                    const test = testsById.get(item.testId);
                    if (!test) return null;
                    return (
                      <li
                        key={item.testId}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span aria-hidden>{test.icon}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium">
                              {test.name}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {test.code}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Switch
                            size="sm"
                            checked={item.required}
                            onCheckedChange={(checked) =>
                              patchItem(index, { required: checked })
                            }
                            aria-label={t("Obligatorio")}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {item.required ? t("Obligatorio") : t("Opcional")}
                          </span>
                        </span>
                        <Input
                          type="number"
                          min={1}
                          value={item.frequencyDays}
                          onChange={(event) =>
                            patchItem(index, { frequencyDays: event.target.value })
                          }
                          placeholder={t("Días")}
                          aria-label={t("Frecuencia (días)")}
                          className="h-8 w-20 shrink-0"
                        />
                        <span className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === 0}
                            onClick={() => moveItem(index, -1)}
                            aria-label={t("Mover arriba")}
                          >
                            <ChevronUp />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                            aria-label={t("Mover abajo")}
                          >
                            <ChevronDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleTest(test)}
                            aria-label={t("Quitar")}
                          >
                            <X />
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="flex flex-col gap-2 rounded-xl border border-border">
                <label className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("Buscar test…")}
                    aria-label={t("Buscar test…")}
                    className="h-7 w-full bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <div className="max-h-56 overflow-x-hidden overflow-y-auto p-1 [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                  {filteredTests.map((test) => (
                    <label
                      key={test.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={items.some((item) => item.testId === test.id)}
                        onCheckedChange={() => toggleTest(test)}
                      />
                      <span aria-hidden className="text-base">
                        {test.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">
                          {test.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {test.code}
                        </span>
                      </span>
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryAccent(test.category) }}
                        aria-hidden
                      />
                    </label>
                  ))}
                  {filteredTests.length === 0 && (
                    <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                      {t("Sin resultados")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {validationError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive-soft/50 px-3 py-2 text-[12px] font-medium text-destructive"
              >
                {validationError}
              </p>
            )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <LoaderCircle className="animate-spin" />}
          {saving ? t("Guardando…") : t("Crear batería")}
        </Button>
      </div>
    </form>
  );
}
