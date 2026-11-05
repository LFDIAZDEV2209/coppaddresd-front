import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { NutritionPendingCount, NutritionQueueQuery, NutritionQueueResponse } from "../types/nutrition";

export const nutritionApiUrl = `${env.apiUrl}/api/v1/nutrition`;
// TODO(backend-nutrition): desactivar mocks al acordar el DTO wire con backend.
// El modo es explícito; un error real NUNCA se sustituye por datos demo.
export const nutritionUsesMocks = process.env.NEXT_PUBLIC_NUTRITION_MOCKS !== "false";

export async function fetchNutritionQueue(query: NutritionQueueQuery, signal?: AbortSignal): Promise<NutritionQueueResponse> {
  signal?.throwIfAborted();
  if (nutritionUsesMocks) {
    const { mockNutritionQueue } = await import("./nutrition-mocks");
    signal?.throwIfAborted();
    return mockNutritionQueue(query);
  }
  const params = new URLSearchParams({ search: query.search, state: query.state, page: String(query.page), pageSize: String(query.pageSize) });
  return apiFetch<NutritionQueueResponse>(`${nutritionApiUrl}/patients?${params}`, { signal, cache: "no-store" });
}

export async function fetchNutritionPendingCount(signal?: AbortSignal): Promise<NutritionPendingCount> {
  signal?.throwIfAborted();
  if (nutritionUsesMocks) {
    const { nutritionMockPatients } = await import("./nutrition-mocks");
    signal?.throwIfAborted();
    return { count: nutritionMockPatients.filter((item) => item.plan?.state === "en_aprobacion").length };
  }
  return apiFetch<NutritionPendingCount>(`${nutritionApiUrl}/pending-count`, { signal, cache: "no-store" });
}
