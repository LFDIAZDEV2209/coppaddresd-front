import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { XpRule, UpdateXpRuleInput } from "../types";

const PATH = `${env.apiUrl}/api/v1/program/xp-rules`;

// --- Listado completo (catálogo pequeño, sin paginación) ---

export async function fetchXpRules(
  signal?: AbortSignal,
): Promise<XpRule[]> {
  return apiFetch<XpRule[]>(PATH, { signal });
}

// --- Actualizar una regla ---

export async function updateXpRule(
  code: string,
  input: UpdateXpRuleInput,
): Promise<XpRule> {
  return apiFetch<XpRule>(`${PATH}/${code}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
