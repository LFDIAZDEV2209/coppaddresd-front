import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { AppliedAssignment, AssignmentDetail, AssignmentItem, AssignmentPage } from "../types/assignments";

const PATH = `${env.apiUrl}/api/v1/program/assignments`;

// Adapta también los nombres del DTO publicado por el paquete 3 del backend.
type WireItem = Partial<AssignmentItem> & { id?: string; documentNumber?: string | null; waitingDays?: number };
function normalizeItem(item: WireItem): AssignmentItem {
  return {
    ...item,
    recommendationId: item.recommendationId ?? item.id ?? "",
    patientId: item.patientId ?? "",
    patientName: item.patientName ?? "",
    patientDocument: item.patientDocument ?? item.documentNumber ?? null,
    daysWaiting: item.daysWaiting ?? item.waitingDays ?? (Math.max(0, Math.floor((Date.now() - Date.parse(item.createdAt ?? "")) / 86400000)) || 0),
    maxSeverity: item.maxSeverity ?? 0,
    state: item.state ?? "proposed",
    createdAt: item.createdAt ?? "",
  };
}

export async function fetchAssignments(page = 1, search = "", status = "", signal?: AbortSignal, pageSize = 20): Promise<AssignmentPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const result = await apiFetch<Omit<AssignmentPage, "items"> & { items: WireItem[] }>(`${PATH}?${params}`, { signal, cache: "no-store" });
  return { ...result, items: result.items.map(normalizeItem) };
}

export async function fetchAssignment(id: string, signal?: AbortSignal): Promise<AssignmentDetail> {
  const result = await apiFetch<AssignmentDetail & WireItem & { narrativeEs?: string; narrativeEn?: string }>(`${PATH}/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
  return { ...result, ...normalizeItem(result), narrative: result.narrative ?? { es: result.narrativeEs, en: result.narrativeEn } };
}

export function applyAssignment(id: string, overrides: { overrideNutritionPlanName?: string; overrideRoutineName?: string }): Promise<AppliedAssignment> {
  return apiFetch<AppliedAssignment>(`${PATH}/${encodeURIComponent(id)}/apply`, { method: "POST", body: JSON.stringify(overrides) });
}

export async function dismissAssignment(id: string): Promise<void> {
  await apiFetch(`${PATH}/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
}

export function regenerateAssignmentNarrative(id: string, signal?: AbortSignal): Promise<{ queued: boolean }> {
  return apiFetch(`${PATH}/${encodeURIComponent(id)}/regenerate-narrative`, { method: "POST", signal });
}

export async function findPatientAssignment(patientId: string, search: string, signal: AbortSignal) {
  // No hay filtro patientId en este contrato: buscar por nombre y comprobar identidad.
  for (let page = 1; ; page++) {
    const result = await fetchAssignments(page, search, "all", signal, 100);
    const item = result.items.find((entry) => entry.patientId === patientId);
    if (item || page >= result.totalPages) return item ?? null;
  }
}
