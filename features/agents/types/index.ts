// Tipos del módulo de agentes — espejo de los DTOs del backend
// (CoppAddresd.Application.Features.Agents.AgentDtos).

export type AgentStatus = "Borrador" | "Activo" | "Inactivo";

export type KnowledgeBaseScope = "Global" | "Agent";

export type AgentDocumentStatus = "Pendiente" | "Procesando" | "Listo" | "Error";

export type AgentInstanceStatus = "Activo" | "Inactivo";

export type ExecutionStatus = "completado" | "error" | "ejecutando";

export interface AgentType {
  id: string;
  name: string;
  description: string | null;
  specialty: string | null;
  iconKey: string | null;
  status: AgentStatus;
  metadata: string | null;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AgentTypeVersion {
  id: string;
  agentTypeId: string;
  versionNumber: number;
  isActive: boolean;
  config: string;
  notes: string | null;
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  scope: KnowledgeBaseScope;
  agentTypeId: string | null;
  status: AgentStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface AgentDocument {
  id: string;
  knowledgeBaseId: string;
  storageKey: string;
  fileName: string;
  contentType: string | null;
  fileSizeBytes: number | null;
  status: AgentDocumentStatus;
  errorMessage: string | null;
  chunksCount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AgentInstance {
  id: string;
  userId: string;
  agentTypeId: string;
  agentTypeName: string | null;
  status: AgentInstanceStatus;
  metadata: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedAgentsResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AgentExecutionSummary {
  id: string;
  threadId: string | null;
  agentTypeId: string;
  versionId: string | null;
  userId: string | null;
  status: ExecutionStatus;
  latencyMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  model: string | null;
  error: string | null;
  createdAt: string;
  endedAt: string | null;
  feedbackRating: number | null;
  bestEvaluation: number | null;
}

export interface AgentEvaluation {
  evaluator: string;
  metric: string | null;
  score: number | null;
  details: string | null;
}

export interface AgentExperienceLite {
  trigger: string;
  response: string;
  outcome: string | null;
  recurrence: number;
  rating: number | null;
}

export interface AgentExecutionDetail extends AgentExecutionSummary {
  feedbackComment: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  evaluations: AgentEvaluation[];
  experiences: AgentExperienceLite[];
}

export interface AgentExecutionsList {
  total: number;
  items: AgentExecutionSummary[];
}

// --- Grafo del agente (visualización de flujos) ---

export type AgentGraphNodeKind = "start" | "guard" | "llm" | "tools" | "memory" | "end";

export interface AgentGraphNode {
  id: string;
  label: string;
  kind: AgentGraphNodeKind;
  description: string | null;
  meta: Record<string, unknown> | null;
}

export interface AgentGraphEdge {
  source: string;
  target: string;
  kind: "flow" | "conditional";
  label: string | null;
}

export interface AgentGraphRagConfig {
  enabled: boolean;
  knowledgeBaseCount: number;
  topK: number;
}

export interface AgentGraphMemoryConfig {
  enabled: boolean;
  categories: string[];
}

export interface AgentGraphConfig {
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  tools: string[];
  rag: AgentGraphRagConfig;
  memory: AgentGraphMemoryConfig;
  maxToolCalls: number;
  recursionLimit: number;
}

/** Descriptor del grafo del agente (proxy del backend → AI Service). */
export interface AgentGraph {
  agentTypeId: string;
  source: "runtime" | "base";
  versionId: string | null;
  nodes: AgentGraphNode[];
  edges: AgentGraphEdge[];
  config: AgentGraphConfig;
}

// --- Payloads ---

export interface AgentTypeRequest {
  name: string;
  description?: string | null;
  specialty?: string | null;
  iconKey?: string | null;
  status?: string | null;
  metadata?: string | null;
}

export interface AgentTypeVersionRequest {
  config: string;
  notes?: string | null;
}

export interface KnowledgeBaseRequest {
  name: string;
  description?: string | null;
  scope: KnowledgeBaseScope;
  agentTypeId?: string | null;
  status?: string | null;
}

export interface AgentDocumentRequest {
  storageKey: string;
  fileName: string;
  contentType?: string | null;
  fileSizeBytes?: number | null;
}

export interface AgentInstanceRequest {
  userId: string;
  agentTypeId: string;
  status?: string | null;
  metadata?: string | null;
}

export interface AgentExecutionsFilters {
  agentTypeId?: string;
  userId?: string;
  status?: ExecutionStatus | "";
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/** Formulario amigable de configuración de versión (sin JSON para el usuario). */
export interface AgentRuntimeConfigForm {
  systemPrompt: string;
  extraPrompt: string | null;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  tools: string[];
  ragEnabled: boolean;
  knowledgeBaseIds: string[];
  topK: number;
  memoryEnabled: boolean;
  memoryCategories: string[];
  maxToolCalls: number;
  recursionLimit: number;
}
