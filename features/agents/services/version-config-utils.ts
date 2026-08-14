import type { AgentRuntimeConfigForm } from "../types";

/**
 * Convierte el JSON `config` de una versión (contrato del AI Service) al
 * formulario amigable. Tolera configs viejos/parciales con defaults sensatos.
 */
export function parseRuntimeConfig(configJson: string): AgentRuntimeConfigForm {
  try {
    const raw = JSON.parse(configJson) as Record<string, unknown>;
    const retrieval =
      (raw.retrieval_config as Record<string, unknown> | undefined) ?? {};
    const memory = (raw.memory_config as Record<string, unknown> | undefined) ?? {};

    return {
      systemPrompt:
        (raw.system_prompt as string) ??
        "Eres un asistente de salud de CoppAddresd. Responde en español con claridad y empatía.",
      extraPrompt: (raw.prompt as string | null) ?? null,
      provider: (raw.provider as string | null) ?? null,
      model: (raw.model as string | null) ?? null,
      temperature: (raw.temperature as number | null) ?? null,
      maxTokens: (raw.max_tokens as number | null) ?? null,
      tools: Array.isArray(raw.tools) ? (raw.tools as string[]) : [],
      ragEnabled: Boolean(retrieval.enabled),
      knowledgeBaseIds: Array.isArray(retrieval.knowledge_base_ids)
        ? (retrieval.knowledge_base_ids as string[])
        : [],
      topK: (retrieval.top_k as number | undefined) ?? 5,
      memoryEnabled: Boolean(memory.enabled),
      memoryCategories: Array.isArray(memory.categories)
        ? (memory.categories as string[])
        : ["preferencias"],
      maxToolCalls: (raw.max_tool_calls as number | undefined) ?? 8,
      recursionLimit: (raw.recursion_limit as number | undefined) ?? 25,
    };
  } catch {
    return emptyRuntimeConfig();
  }
}

export function emptyRuntimeConfig(): AgentRuntimeConfigForm {
  return {
    systemPrompt:
      "Eres un asistente de salud de CoppAddresd. Responde en español con claridad y empatía.",
    extraPrompt: null,
    provider: null,
    model: null,
    temperature: null,
    maxTokens: null,
    tools: ["calculate", "get_current_time"],
    ragEnabled: false,
    knowledgeBaseIds: [],
    topK: 5,
    memoryEnabled: true,
    memoryCategories: ["preferencias"],
    maxToolCalls: 8,
    recursionLimit: 25,
  };
}

/** Serializa el formulario al JSON config del AI Service (snake_case). */
export function toRuntimeConfigJson(form: AgentRuntimeConfigForm): string {
  const config: Record<string, unknown> = {
    system_prompt: form.systemPrompt.trim(),
    tools: form.tools,
    retrieval_config: {
      enabled: form.ragEnabled,
      knowledge_base_ids: form.knowledgeBaseIds,
      top_k: form.topK,
    },
    memory_config: {
      enabled: form.memoryEnabled,
      categories: form.memoryCategories,
    },
    max_tool_calls: form.maxToolCalls,
    recursion_limit: form.recursionLimit,
  };

  if (form.extraPrompt?.trim()) config.prompt = form.extraPrompt.trim();
  if (form.provider) config.provider = form.provider;
  if (form.model) config.model = form.model;
  if (form.temperature !== null) config.temperature = form.temperature;
  if (form.maxTokens !== null) config.max_tokens = form.maxTokens;

  return JSON.stringify(config, null, 2);
}

export const MODEL_OPTIONS = [
  { value: "", label: "Modelo por defecto del servicio" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (equilibrado)", provider: "anthropic" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (rápido)", provider: "anthropic" },
  { value: "gpt-4o", label: "GPT-4o (OpenAI)", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o mini (rápido)", provider: "openai" },
];

export const TOOL_OPTIONS = [
  { value: "calculate", label: "Calculadora", description: "Resuelve operaciones matemáticas" },
  { value: "get_current_time", label: "Hora y fecha", description: "Consulta la hora en zonas horarias" },
];

export const MEMORY_CATEGORIES = [
  "preferencias",
  "datos_personales",
  "objetivos",
  "historial",
  "alergias",
  "medicamentos",
];

export const PROVIDER_OPTIONS = [
  { value: "", label: "Proveedor por defecto" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
];
