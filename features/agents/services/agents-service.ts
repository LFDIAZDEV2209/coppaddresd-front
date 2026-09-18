import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import {
  Bot,
  HeartPulse,
  MessageCircle,
  CalendarDays,
  Microscope,
  ClipboardList,
  Stethoscope,
  BrainCircuit,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react";
import type {
  AgentType,
  AgentTypeVersion,
  KnowledgeBase,
  AgentDocument,
  AgentInstance,
  AgentTypeRequest,
  AgentTypeVersionRequest,
  KnowledgeBaseRequest,
  AgentDocumentRequest,
  AgentInstanceRequest,
  PaginatedAgentsResult,
  AgentExecutionsList,
  AgentExecutionsFilters,
  AgentExecutionDetail,
  AgentGraph,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/agents`;

// --- Tipos de agente ---

export async function fetchAgentTypes(
  page: number,
  pageSize: number,
  search?: string,
): Promise<PaginatedAgentsResult<AgentType>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search?.trim()) params.set("search", search.trim());
  return apiFetch<PaginatedAgentsResult<AgentType>>(`${PATH}?${params.toString()}`);
}

export async function fetchActiveAgentTypes(): Promise<AgentType[]> {
  return apiFetch<AgentType[]>(`${PATH}/active`);
}

export async function fetchAgentType(id: string): Promise<AgentType> {
  return apiFetch<AgentType>(`${PATH}/${id}`);
}

export async function createAgentType(input: AgentTypeRequest): Promise<AgentType> {
  return apiFetch<AgentType>(PATH, { method: "POST", body: JSON.stringify(input) });
}

export async function updateAgentType(id: string, input: AgentTypeRequest): Promise<AgentType> {
  return apiFetch<AgentType>(`${PATH}/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteAgentType(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

// --- Versiones ---

export async function fetchVersions(agentTypeId: string): Promise<AgentTypeVersion[]> {
  return apiFetch<AgentTypeVersion[]>(`${PATH}/${agentTypeId}/versions`);
}

export async function createVersion(
  agentTypeId: string,
  input: AgentTypeVersionRequest,
): Promise<AgentTypeVersion> {
  return apiFetch<AgentTypeVersion>(`${PATH}/${agentTypeId}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function activateVersion(versionId: string): Promise<AgentTypeVersion> {
  return apiFetch<AgentTypeVersion>(`${PATH}/versions/${versionId}/activate`, {
    method: "POST",
  });
}

// --- Knowledge bases ---

export async function fetchKnowledgeBases(agentTypeId?: string): Promise<KnowledgeBase[]> {
  const query = agentTypeId ? `?agentTypeId=${agentTypeId}` : "";
  return apiFetch<KnowledgeBase[]>(`${PATH}/knowledge-bases${query}`);
}

export async function createKnowledgeBase(input: KnowledgeBaseRequest): Promise<KnowledgeBase> {
  return apiFetch<KnowledgeBase>(`${PATH}/knowledge-bases`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateKnowledgeBase(
  id: string,
  input: KnowledgeBaseRequest,
): Promise<KnowledgeBase> {
  return apiFetch<KnowledgeBase>(`${PATH}/knowledge-bases/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/knowledge-bases/${id}`, { method: "DELETE" });
}

// --- Documentos ---

export async function fetchDocuments(knowledgeBaseId: string): Promise<AgentDocument[]> {
  return apiFetch<AgentDocument[]>(`${PATH}/knowledge-bases/${knowledgeBaseId}/documents`);
}

export async function registerDocument(
  knowledgeBaseId: string,
  input: AgentDocumentRequest,
): Promise<AgentDocument> {
  return apiFetch<AgentDocument>(`${PATH}/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/documents/${id}`, { method: "DELETE" });
}

// --- Instancias ---

export async function fetchInstances(userId: string): Promise<AgentInstance[]> {
  return apiFetch<AgentInstance[]>(`${PATH}/instances?userId=${userId}`);
}

export async function assignInstance(input: AgentInstanceRequest): Promise<AgentInstance> {
  return apiFetch<AgentInstance>(`${PATH}/instances`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Ejecuciones (monitoreo, proxy del backend) ---

export async function fetchExecutions(
  filters: AgentExecutionsFilters = {},
): Promise<AgentExecutionsList> {
  const params = new URLSearchParams();
  if (filters.agentTypeId) params.set("agentTypeId", filters.agentTypeId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  return apiFetch<AgentExecutionsList>(`${PATH}/executions?${params.toString()}`);
}

export async function fetchExecution(id: string): Promise<AgentExecutionDetail> {
  return apiFetch<AgentExecutionDetail>(`${PATH}/executions/${id}`);
}

// --- Grafo del agente (flujos en vivo del playground) ---

export async function fetchAgentGraph(agentTypeId: string): Promise<AgentGraph> {
  return apiFetch<AgentGraph>(`${PATH}/${agentTypeId}/graph`);
}

// --- Utilidades de presentación ---

interface AgentIcon {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const agentIcons: Record<string, AgentIcon> = {
  MessageCircle: { icon: MessageCircle, color: "#3B82F6", bg: "#E5F0FA" },
  HeartPulse: { icon: HeartPulse, color: "#EF4444", bg: "#FCEBEC" },
  Salad: { icon: Bot, color: "#10B981", bg: "#E6F7EF" },
  CalendarDays: { icon: CalendarDays, color: "#F59E0B", bg: "#FDF2E3" },
  Microscope: { icon: Microscope, color: "#8B5CF6", bg: "#F1EBF9" },
  ClipboardList: { icon: ClipboardList, color: "#0EA5E9", bg: "#E6F7FB" },
  Stethoscope: { icon: Stethoscope, color: "#0D9488", bg: "#E4F5F4" },
  BrainCircuit: { icon: BrainCircuit, color: "#6366F1", bg: "#ECEBFE" },
  ShieldPlus: { icon: ShieldPlus, color: "#64748B", bg: "#EDF1F5" },
};

const DEFAULT_ICON: AgentIcon = { icon: Bot, color: "#3B82F6", bg: "#E5F0FA" };

export function getAgentIcon(iconKey: string | null): AgentIcon {
  if (!iconKey) return DEFAULT_ICON;
  return agentIcons[iconKey] ?? DEFAULT_ICON;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
