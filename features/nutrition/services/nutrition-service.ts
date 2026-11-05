import { apiFetch, ApiError } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { NutritionActor, NutritionCycle, NutritionPatientSummary, NutritionPendingCount, NutritionQueueQuery, NutritionQueueResponse, NutritionScope, NutritionWorkspace } from "../types/nutrition";
import type { NutritionMockAction } from "./nutrition-mock-workspace";

export const nutritionApiUrl = `${env.apiUrl}/api/v1/nutrition`;
// TODO(backend-nutrition): desactivar mocks al acordar el DTO wire con backend.
// El modo es explícito; un error real NUNCA se sustituye por datos demo.
export const nutritionUsesMocks = process.env.NEXT_PUBLIC_NUTRITION_MOCKS !== "false";

export async function fetchNutritionQueue(query: NutritionQueueQuery, signal?: AbortSignal, scope?: NutritionScope): Promise<NutritionQueueResponse> {
  signal?.throwIfAborted();
  if (nutritionUsesMocks) {
    const { mockNutritionQueue } = await import("./nutrition-mocks");
    signal?.throwIfAborted();
    return mockNutritionQueue(query, scope ? await mockSummaries(scope) : undefined);
  }
  const params = new URLSearchParams({ search: query.search, state: query.state, page: String(query.page), pageSize: String(query.pageSize) });
  return apiFetch<NutritionQueueResponse>(`${nutritionApiUrl}/patients?${params}`, { signal, cache: "no-store" });
}

export async function fetchNutritionPendingCount(signal?: AbortSignal, scope?: NutritionScope): Promise<NutritionPendingCount> {
  signal?.throwIfAborted();
  if (nutritionUsesMocks) {
    const { nutritionMockPatients } = await import("./nutrition-mocks");
    signal?.throwIfAborted();
    const patients = scope ? await mockSummaries(scope) : nutritionMockPatients;
    return { count: patients.filter((item) => item.plan?.state === "en_aprobacion").length };
  }
  return apiFetch<NutritionPendingCount>(`${nutritionApiUrl}/pending-count`, { signal, cache: "no-store" });
}

async function mockSummaries(scope: NutritionScope): Promise<NutritionPatientSummary[]> {
  const { mockWorkspace } = await import("./nutrition-mock-workspace");
  return Array.from(mockWorkspace(scope).values()).map((patient) => ({
    patientId: patient.patientId, patientName: patient.patientName, patientDocument: patient.patientDocument,
    plan: patient.cycle ? {
      id: patient.cycle.id, state: patient.cycle.state,
      queueState: patient.cycle.state === "aprobado" && patient.cycle.endDate && (Date.parse(`${patient.cycle.endDate}T23:59:59Z`) - Date.now()) / 86_400_000 <= 5 ? "por_renovar" : patient.cycle.state,
      version: patient.cycle.version, dailyKcal: patient.cycle.targets.kcal,
      criticalAlertCount: patient.cycle.alerts.filter((alert) => alert.severity === "critical").length,
      aiAssisted: true, provisional: patient.cycle.provisional, endDate: patient.cycle.endDate,
    } : null,
  }));
}

function requireDemoMode() {
  if (!nutritionUsesMocks) throw new ApiError(503, "unavailable", "nutrition-demo-only");
}

export async function fetchNutritionWorkspace(patientId: string, signal: AbortSignal, scope: NutritionScope): Promise<NutritionWorkspace> {
  requireDemoMode(); signal.throwIfAborted();
  const { mockPatient, nutritionMockCatalog } = await import("./nutrition-mock-workspace");
  signal.throwIfAborted();
  return { patient: mockPatient(patientId, scope), catalog: structuredClone(nutritionMockCatalog) };
}

export async function saveNutritionDraft(patientId: string, cycle: NutritionCycle, revision: number, scope: NutritionScope) {
  requireDemoMode();
  const { saveMockDraft } = await import("./nutrition-mock-workspace");
  return saveMockDraft(patientId, cycle, revision, scope);
}

export async function performNutritionAction(patientId: string, action: NutritionMockAction, revision: number, actor: NutritionActor, scope: NutritionScope, options: { comment?: string; criticalConfirmed?: boolean } = {}) {
  requireDemoMode();
  const { actOnMockPatient } = await import("./nutrition-mock-workspace");
  const patient = actOnMockPatient(patientId, action, revision, actor, scope, options);
  window.dispatchEvent(new Event("nutrition-changed"));
  return patient;
}
