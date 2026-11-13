"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { NutritionTotals } from "../types/nutrition";
import { NutritionNutrients, useNutritionNumber } from "./nutrition-shared";

/** Los controles y su persistencia siguen perteneciendo al editor. */
export function NutritionFoodRow({ name, totals, children }: {
  name: string;
  totals: NutritionTotals;
  children: ReactNode;
}) {
  const t = useT();
  const format = useNutritionNumber();
  return (
    <li className="nutrition-food-row">
      <div className="nutrition-food-main">
        <div className="nutrition-food-name">
          <p>{name}</p>
          <details className="nutrition-food-detail nutrition-disclosure">
            <summary aria-label={t("Ver nutrientes de {food}", { food: name })}>
              <span className="nutrition-food-energy nutrition-measure">{format(totals.kcal)} {t("kcal")}</span>
              <span className="nutrition-food-detail-label">{t("Nutrientes")}<ChevronDown aria-hidden="true" className="nutrition-disclosure-chevron size-3" /></span>
            </summary>
            <NutritionNutrients totals={totals} />
          </details>
        </div>
        {children}
      </div>
    </li>
  );
}
