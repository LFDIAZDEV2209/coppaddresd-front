"use client";

import { usePathname } from "next/navigation";
import { fetchNutritionPendingCount } from "../services/nutrition-service";
import { useNutritionResource } from "./use-nutrition-resource";
import { useCallback } from "react";
import type { NutritionScope } from "../types/nutrition";

/** Cambiar de ruta invalida el contador; no hay consultas por fila. */
export function useNutritionPendingCount() {
  const load = useCallback((signal: AbortSignal, scope: NutritionScope) => fetchNutritionPendingCount(signal, scope), []);
  return useNutritionResource(load, usePathname(), true);
}
