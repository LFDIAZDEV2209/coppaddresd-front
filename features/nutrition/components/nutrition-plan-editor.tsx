"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useT } from "@/providers/i18n-provider";
import type {
  NutritionCycle,
  NutritionFood,
  NutritionTargets,
} from "../types/nutrition";
import {
  dayTotals,
  itemTotals,
  mealDefinitions,
  mealTotals,
  nutrientDefinitions,
} from "../lib/nutrition-calculations";
import { NutritionFoodRow } from "./nutrition-food-row";
import { NutritionNutrients, NutritionTargetsPanel, useNutritionNumber } from "./nutrition-shared";
import { NutritionFoodPicker } from "./nutrition-food-picker";

interface EditorProps {
  cycle: NutritionCycle;
  catalog: NutritionFood[];
  editable: boolean;
  update: (transform: (cycle: NutritionCycle) => NutritionCycle) => void;
  regenerate: () => void;
  applyDay: (day: number) => Promise<boolean>;
  toolbarHost?: HTMLElement | null;
  context?: ReactNode;
}

export function NutritionPlanEditor({
  cycle,
  catalog,
  editable,
  update,
  regenerate,
  applyDay,
  toolbarHost,
  context,
}: EditorProps) {
  const t = useT();
  const format = useNutritionNumber();
  const [day, setDay] = useState(1);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const meals = cycle.meals.filter((meal) => meal.dayNumber === day);
  const totals = dayTotals(meals, catalog);

  const toolbar = <>
    {context}
    <div className="nutrition-day-toolbar">
        <label htmlFor="nutrition-day" className="sr-only">
          {t("Día del ciclo")}
        </label>
        <div className="nutrition-day-controls flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            disabled={day === 1}
            aria-label={t("Día anterior")}
            onClick={() => setDay((value) => value - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <select
            id="nutrition-day"
            className="nutrition-select nutrition-measure"
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
          >
            {Array.from({ length: 30 }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {t("Día {day}", { day: String(value) })} / 30
                </option>
              ),
            )}
          </select>
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            disabled={day === 30}
            aria-label={t("Día siguiente")}
            onClick={() => setDay((value) => value + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="nutrition-measure nutrition-context-kcal">{format(totals.kcal)} {t("kcal")}</span>
      </div>
  </>;

  return (
    <section
      className="nutrition-section nutrition-editor"
      aria-labelledby="nutrition-editor-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="nutrition-editor-title"
            className="nutrition-display text-2xl font-semibold"
          >
            {t("Menú de 30 días")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {editable
              ? t(
                  "Ajusta las cantidades. Los cambios se guardan automáticamente.",
                )
              : t(
                  cycle.state === "en_aprobacion"
                    ? "Plan en revisión. Devuélvelo con comentario para solicitar ajustes."
                    : cycle.state === "aprobado"
                      ? "Plan de solo lectura. Para editar un aprobado, crea una nueva versión."
                      : "Plan de solo lectura con tus permisos actuales.",
                )}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => setConfirmCopy(true)}
        >
          {t("Aplicar este día a los 30 días")}
        </Button>
      </div>
      {toolbarHost ? createPortal(toolbar, toolbarHost) : toolbar}
      <section
        aria-labelledby="nutrition-day-totals"
        className="nutrition-daily-totals"
      >
        <h3
          id="nutrition-day-totals"
          className="nutrition-display text-lg font-semibold"
        >
          {t("Totales del día {day}", { day: String(day) })}
        </h3>
        <p className="mt-2 mb-5 text-sm text-muted-foreground">
          {t(
            "Vista previa por catálogo. La revisión clínica y las validaciones del servidor determinan la aprobación.",
          )}
        </p>
        <NutritionTargetsPanel targets={cycle.targets} totals={totals} />
      </section>
      <fieldset disabled={!editable} className="min-w-0">
        <legend className="sr-only">
          {t("Comidas del día {day}", { day: String(day) })}
        </legend>
        {mealDefinitions.map(({ type, label, time }) => {
          const meal = meals.find((entry) => entry.mealType === type);
          if (!meal) return null;
          return (
            <section
              key={type}
              className="nutrition-meal"
              aria-labelledby={`meal-${type}-title`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3
                    id={`meal-${type}-title`}
                    className="nutrition-display text-xl font-semibold"
                  >
                    {t(label)}
                  </h3>
                  <span className="nutrition-measure text-sm text-muted-foreground">
                    {time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`water-${meal.id}`}
                    className="nutrition-label whitespace-nowrap"
                  >
                    {t("Agua (vasos)")}
                  </label>
                  <Input
                    id={`water-${meal.id}`}
                    className="nutrition-measure min-h-11 w-20"
                    type="number"
                    min={0}
                    max={8}
                    step={0.5}
                    value={meal.waterGlasses ?? ""}
                    onChange={(event) => {
                      const waterGlasses = event.target.valueAsNumber;
                      if (
                        Number.isFinite(waterGlasses) &&
                        waterGlasses >= 0 &&
                        waterGlasses <= 8
                      )
                        update((draft) => ({
                          ...draft,
                          meals: draft.meals.map((entry) =>
                            entry.id === meal.id
                              ? { ...entry, waterGlasses }
                              : entry,
                          ),
                        }));
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setAddingTo(meal.id)}
                    aria-label={t("Agregar alimento a {meal}", {
                      meal: t(label),
                    })}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    {t("Agregar alimento")}
                  </Button>
                </div>
              </div>
              {meal.items.length > 0 && (
                <div className="nutrition-meal-total">
                  <span className="text-sm font-semibold">{t("Total de {meal}", { meal: t(label) })}</span>
                  <NutritionNutrients totals={mealTotals(meal, catalog)} />
                </div>
              )}
              <ul role="list" className="nutrition-food-list mt-5">
                {meal.items.map((item) => {
                  const food = catalog.find(
                    (entry) => entry.id === item.foodId,
                  );
                  if (!food)
                    return (
                      <li key={item.id} className="py-3 text-destructive">
                        {t("Alimento no disponible en el catálogo")}
                      </li>
                    );
                  const totals = itemTotals(food, item.grams);
                  return (
                    <NutritionFoodRow key={item.id} name={food.name} totals={totals}>
                      <div className="nutrition-food-grams">
                        <label htmlFor={`grams-${item.id}`} className="sr-only">
                          {t("Gramos de {food}", { food: food.name })}
                        </label>
                        <Input
                          id={`grams-${item.id}`}
                          type="number"
                          min={1}
                          max={1000}
                          step="0.1"
                          inputMode="decimal"
                          className="nutrition-measure"
                          value={item.grams}
                          onChange={(event) => {
                            const grams = event.target.valueAsNumber;
                            if (
                              Number.isFinite(grams) &&
                              grams >= 1 &&
                              grams <= 1000
                            )
                              update((draft) => ({
                                ...draft,
                                meals: draft.meals.map((entry) =>
                                  entry.id === meal.id
                                    ? {
                                        ...entry,
                                        items: entry.items.map((row) =>
                                          row.id === item.id
                                            ? { ...row, grams }
                                            : row,
                                        ),
                                      }
                                    : entry,
                                ),
                              }));
                          }}
                        />
                        <span aria-hidden="true">{t("g")}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-11 min-w-11 text-destructive"
                        aria-label={t("Quitar {food} de {meal}", {
                          food: food.name,
                          meal: t(label),
                        })}
                        onClick={() =>
                          update((draft) => ({
                            ...draft,
                            meals: draft.meals.map((entry) =>
                              entry.id === meal.id
                                ? {
                                    ...entry,
                                    items: entry.items.filter(
                                      (row) => row.id !== item.id,
                                    ),
                                  }
                                : entry,
                            ),
                          }))
                        }
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </NutritionFoodRow>
                  );
                })}
              </ul>
              {meal.items.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">
                  {t(
                    "Esta comida está vacía. Agrega un alimento antes de enviar a aprobación.",
                  )}
                </p>
              )}

            </section>
          );
        })}
        <div className="border-t border-border pt-6">
          <label htmlFor="nutrition-instructions" className="nutrition-label">
            {t("Indicaciones del plan")}
          </label>
          <Textarea
            id="nutrition-instructions"
            value={cycle.instructions}
            maxLength={4000}
            rows={5}
            className="resize-y"
            onChange={(event) =>
              update((draft) => ({
                ...draft,
                instructions: event.target.value,
              }))
            }
          />
        </div>
      </fieldset>
      <details className="mt-7 border-t border-border pt-5">
        <summary className="cursor-pointer rounded-md text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
          {t("Editar metas del borrador")}
        </summary>
        <p className="my-4 text-sm text-muted-foreground">
          {t(
            "Cambiar metas marca los menús como desactualizados. Regenera la propuesta antes de enviar a aprobación.",
          )}
        </p>
        <form
          key={`${cycle.id}-${JSON.stringify(cycle.targets)}`}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const targets = Object.fromEntries(
              nutrientDefinitions.map(({ key }) => [
                key,
                Number(form.get(key)),
              ]),
            ) as unknown as NutritionTargets;
            update((draft) => ({ ...draft, targets, menusOutdated: true }));
          }}
        >
          <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-3">
            {nutrientDefinitions.map(({ key, label, unit }) => (
              <div key={key}>
                <label htmlFor={`target-${key}`} className="nutrition-label">
                  {t(label)} ({t(unit)})
                </label>
                <Input
                  id={`target-${key}`}
                  name={key}
                  type="number"
                  min={1}
                  max={
                    key === "kcal" ? 6000 : key === "waterGlasses" ? 20 : 1000
                  }
                  step="0.1"
                  required
                  defaultValue={cycle.targets[key]}
                />
              </div>
            ))}
            <Button
              type="submit"
              variant="outline"
              className="sm:col-span-3 justify-self-start"
            >
              {t("Guardar metas")}
            </Button>
          </fieldset>
        </form>
      </details>
      {cycle.menusOutdated && (
        <div role="status" className="nutrition-notice mt-5">
          <p>{t("Menús desactualizados: las metas cambiaron.")}</p>
          <Button
            className="nutrition-ai-button mt-3"
            disabled={!editable}
            variant="outline"
            onClick={regenerate}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            {t("Regenerar propuesta")}
          </Button>
        </div>
      )}
      {addingTo && editable && (
        <NutritionFoodPicker
          catalog={catalog}
          onClose={() => setAddingTo(null)}
          onAdd={(foodId, grams) =>
            update((draft) => ({
              ...draft,
              meals: draft.meals.map((meal) =>
                meal.id === addingTo
                  ? {
                      ...meal,
                      items: [
                        ...meal.items,
                        { id: crypto.randomUUID(), foodId, grams, notes: null },
                      ],
                    }
                  : meal,
              ),
            }))
          }
        />
      )}
      <AlertDialog open={confirmCopy && editable} onOpenChange={setConfirmCopy}>
        <AlertDialogContent className="nutrition-module">
          <AlertDialogHeader>
            <AlertDialogTitle className="nutrition-display">
              {t("¿Reemplazar los 30 días?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Se copiarán las cuatro comidas, cantidades y agua del día {day} a todos los días. Se reemplazarán los menús actuales del borrador.",
                { day: String(day) },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (await applyDay(day)) setConfirmCopy(false);
              }}
            >
              {t("Confirmar copia a 30 días")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
