"use client";

import { usePathname } from "next/navigation";
import { fetchNutritionPendingCount } from "../services/nutrition-service";
import { useNutritionResource } from "./use-nutrition-resource";
import { useCallback } from "react";

/** Cambiar de ruta invalida el contador; no hay consultas por fila. */
export function useNutritionPendingCount() {
  const load = useCallback((signal: AbortSignal) => fetchNutritionPendingCount(signal), []);
  return useNutritionResource(load, usePathname(), true);
}
