"use client";

import { usePathname } from "next/navigation";
import { fetchNutritionPendingCount } from "../services/nutrition-service";
import { useNutritionResource } from "./use-nutrition-resource";

/** Cambiar de ruta invalida el contador; no hay consultas por fila. */
export function useNutritionPendingCount() {
  return useNutritionResource(fetchNutritionPendingCount, usePathname());
}
