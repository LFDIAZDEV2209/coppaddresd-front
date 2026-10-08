import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import { invalidateHealthTestsCache } from "./health-tests-service";

const base = `${env.apiUrl}/api/v1/health-tests`;
export interface CatalogInstrument {
  id: string; code: string; name: string; description: string | null;
  category: string | null; sortOrder: number; isActive: boolean; versions: CatalogVersion[];
}
export interface CatalogVersion {
  id: string; versionNumber: number; name: string | null; status: "draft" | "active" | "retired";
  scoringStrategy: string; points: number | null;
}
export interface CatalogOption {
  id: string; questionId: string; text: string; scoreValue: number | null;
  sortOrder: number; isActive: boolean; dependsOnQuestionId?: string | null; dependsOnOptionId?: string | null;
}
export interface CatalogQuestion {
  id: string; versionId: string; code: string; section: string | null; text: string;
  type: "scale" | "single" | "multi" | "open" | "num"; scoringDirection: "positive" | "reverse";
  sortOrder: number; isActive: boolean; options: CatalogOption[];
  unit: string | null; minValue: number | null; maxValue: number | null; defaultValue: number | null;
  minLabel: string | null; maxLabel: string | null; hint: string | null;
}
export const emptyId = "00000000-0000-0000-0000-000000000000";
export const fetchInstrument = (id: string) => apiFetch<CatalogInstrument>(`${base}/${id}`);
export const fetchQuestions = (versionId: string) => apiFetch<CatalogQuestion[]>(`${base}/versions/${versionId}/questions`);
async function mutate<T>(path: string, method: "POST" | "PUT", body?: unknown): Promise<T> {
  const result = await apiFetch<T>(`${base}${path}`, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  invalidateHealthTestsCache();
  return result;
}
export const saveInstrument = (id: string | null, value: Omit<CatalogInstrument, "id" | "versions">) => mutate<CatalogInstrument>(id ? `/${id}` : "", id ? "PUT" : "POST", value);
export const cloneVersion = (id: string) => mutate<CatalogVersion>(`/versions/${id}/clone`, "POST");
export const publishVersion = (id: string) => mutate<CatalogVersion>(`/versions/${id}/publish`, "POST");
export const createVersion = (id: string, versionNumber: number) => mutate<CatalogVersion>(`/${id}/versions`, "POST", { versionNumber, scoringStrategy: "sum", points: null, name: null });
export const saveQuestion = (question: CatalogQuestion) => mutate<CatalogQuestion>(`/versions/${question.versionId}/questions`, "PUT", question);
