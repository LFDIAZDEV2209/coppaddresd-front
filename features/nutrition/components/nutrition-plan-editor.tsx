"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  Coffee,
  Sun,
  Apple,
  Moon,
  Copy,
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
  NutritionMeal,
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
  const [selectedMeal, setSelectedMeal] = useState<NutritionMeal["mealType"]>("desayuno");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const meals = cycle.meals.filter((meal) => meal.dayNumber === day);
  const activeMeal = meals.some(meal => meal.mealType === selectedMeal) ? selectedMeal : meals[0]?.mealType;
  const totals = dayTotals(meals, catalog);
  const exceededTargets = nutrientDefinitions.filter(({ key }) => totals[key] != null && totals[key]! > cycle.targets[key]).length;
  const mealIcons = { desayuno: Coffee, almuerzo: Sun, merienda: Apple, cena: Moon };

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
      data-editable={editable}
      aria-labelledby="nutrition-editor-title"
    >
      <div className="nutrition-editor-heading flex flex-wrap items-start justify-between gap-4">
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
                  "Guardado automático",
                )
              : t(
                  cycle.state === "en_aprobacion"
                    ? "Plan de solo lectura."
                    : cycle.state === "aprobado"
                      ? "Plan de solo lectura. Crea una versión para editar."
                      : "Plan de solo lectura con tus permisos actuales.",
                )}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!editable}
          onClick={() => setConfirmCopy(true)}
          aria-label={t("Aplicar este día a los 30 días")}
        >
          <Copy className="size-4" aria-hidden="true" />{t("Copiar a 30 días")}
        </Button>
      </div>
      {toolbarHost ? createPortal(toolbar, toolbarHost) : toolbar}
      <details
        className="nutrition-daily-totals"
      >
        <summary>
          <span>{t("Totales del día {day}", { day: String(day) })}</span>
          <strong className="nutrition-measure">{t("{actual} de {target} {unit}", { actual: format(totals.kcal), target: format(cycle.targets.kcal), unit: t("kcal") })}</strong>
          {exceededTargets > 0 && <span className="nutrition-target-warning">{t("{count} sobre la meta", { count: String(exceededTargets) })}</span>}
          <ChevronDown className="size-4 nutrition-disclosure-chevron" aria-hidden="true" />
        </summary>
        <div className="nutrition-daily-details"><NutritionTargetsPanel targets={cycle.targets} totals={totals} /></div>
      </details>
      <nav className="nutrition-meal-nav" aria-label={t("Comidas del día")}>
        {mealDefinitions.map(({ type, label }) => {
          const Icon = mealIcons[type];
          return <Button key={type} id={`meal-${type}-button`} variant="ghost" data-meal-type={type}
            aria-pressed={activeMeal === type} aria-controls={`meal-${type}-panel`}
            disabled={!meals.some(meal => meal.mealType === type)} onClick={() => setSelectedMeal(type)}><Icon className="size-4" aria-hidden="true" />{t(label)}</Button>;
        })}
      </nav>
      <fieldset disabled={!editable} className="min-w-0">
        <legend className="sr-only">
          {t("Comidas del día {day}", { day: String(day) })}
        </legend>
        <div className="nutrition-meal-grid">
        {mealDefinitions.map(({ type, label, time }) => {
          const meal = meals.find((entry) => entry.mealType === type);
          if (!meal) return null;
          const Icon = mealIcons[type];
          const mealValues = mealTotals(meal, catalog);
          return (
            <section
              key={type}
              id={`meal-${type}-panel`}
              className="nutrition-meal"
              hidden={activeMeal !== type}
              data-meal-type={type}
              aria-labelledby={`meal-${type}-title`}
            >
              <div className="nutrition-meal-heading">
                <span className="nutrition-meal-icon"><Icon className="size-5" aria-hidden="true" /></span>
                <div className="nutrition-meal-identity">
                  <h3
                    id={`meal-${type}-title`}
                    className="nutrition-display"
                    tabIndex={-1}
                  >
                    {t(label)}
                  </h3>
                  <span className="nutrition-measure">
                    {time}
                  </span>
                </div>
                <strong className="nutrition-meal-calories nutrition-measure">{format(mealValues.kcal)} {t("kcal")}</strong>
              </div>
                <div className="nutrition-meal-tools">
                  <div className="nutrition-meal-water">
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
                  </div>
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
              {meal.items.length > 0 && (
                <details className="nutrition-meal-total">
                  <summary aria-label={t("Total de {meal}", { meal: t(label) })}>{t("Totales")}<ChevronDown className="size-3.5 nutrition-disclosure-chevron" aria-hidden="true" /></summary>
                  <NutritionNutrients totals={mealValues} />
                </details>
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
                    "Esta comida está vacía. Agrega un alimento.",
                  )}
                </p>
              )}

            </section>
          );
        })}
        </div>
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
      <details className="nutrition-target-editor mt-7 border-t border-border pt-5">
        <summary className="cursor-pointer rounded-md text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
          {t("Editar metas del borrador")}
        </summary>
        <p className="my-4 text-sm text-muted-foreground">
          {t(
            "Regenera la propuesta para aplicar las nuevas metas.",
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
