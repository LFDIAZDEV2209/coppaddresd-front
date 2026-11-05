"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";
import type { NutritionFood } from "../types/nutrition";
import { itemTotals } from "../lib/nutrition-calculations";
import { NutritionNutrients } from "./nutrition-shared";

export function NutritionFoodPicker({ catalog, onAdd, onClose }: { catalog: NutritionFood[]; onAdd: (foodId: string, grams: number) => void; onClose: () => void }) {
  const t = useT();
  const [foodId, setFoodId] = useState(catalog[0]?.id ?? "");
  const [grams, setGrams] = useState("100");
  const food = catalog.find((entry) => entry.id === foodId);
  const quantity = Number(grams);
  const valid = grams.trim() !== "" && Number.isFinite(quantity) && quantity >= 1 && quantity <= 1000;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="nutrition-module" size="default"><form className="space-y-6" onSubmit={(event) => { event.preventDefault(); if (food && valid) { onAdd(food.id, quantity); onClose(); } }}>
    <DialogHeader><DialogTitle className="nutrition-display">{t("Agregar alimento del catálogo")}</DialogTitle><DialogDescription>{t("Catálogo sintético. Los nutrientes se calculan a partir de los gramos seleccionados.")}</DialogDescription></DialogHeader>
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_9rem]"><div><label htmlFor="nutrition-food" className="nutrition-label">{t("Alimento")}</label><select id="nutrition-food" value={foodId} onChange={(event) => setFoodId(event.target.value)} className="nutrition-select w-full" required>{catalog.map((entry) => <option key={entry.id} value={entry.id}>{t(entry.name)}</option>)}</select></div><div><label htmlFor="nutrition-food-grams" className="nutrition-label">{t("Cantidad en gramos")}</label><Input id="nutrition-food-grams" type="number" inputMode="decimal" min={1} max={1000} step="0.1" required value={grams} onChange={(event) => setGrams(event.target.value)} aria-describedby="nutrition-quantity-help" /></div></div>
    <p id="nutrition-quantity-help" className="text-sm text-muted-foreground">{t("Introduce una cantidad entre 1 y 1.000 g.")}</p>
    {food && valid && <section aria-labelledby="nutrition-preview-title" className="space-y-4"><h3 id="nutrition-preview-title" className="text-base font-semibold">{t("Vista previa nutricional")}</h3><NutritionNutrients totals={itemTotals(food, quantity)} /><p className="text-sm text-muted-foreground">{t(food.householdEquivalent)}</p></section>}
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t("Cancelar")}</Button><Button type="submit" disabled={!food || !valid}>{t("Agregar al menú")}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
