"use client";

import type { ReactNode } from "react";
import { useT } from "@/providers/i18n-provider";
import type { NutritionTotals } from "../types/nutrition";
import { NutritionNutrients, useNutritionNumber } from "./nutrition-shared";

/** Fila presentacional: los controles y sus callbacks siguen siendo del editor. */
export function NutritionFoodRow({ name, totals, children }: {
  name: string;
  totals: NutritionTotals;
  children: ReactNode;
}) {
  const t = useT();
  const format = useNutritionNumber();
  return (
    <li className="nutrition-food-row">
      <div className="nutrition-food-name">
        <p>{name}</p>
        <span className="nutrition-food-energy nutrition-measure">{format(totals.kcal)} {t("kcal")}</span>
      </div>
      {children}
      <div className="nutrition-food-wide"><NutritionNutrients totals={totals} /></div>
      <details className="nutrition-food-detail nutrition-disclosure">
        <summary>{t("Ver nutrientes de {food}", { food: name })}</summary>
        <NutritionNutrients totals={totals} />
      </details>
    </li>
  );
}
