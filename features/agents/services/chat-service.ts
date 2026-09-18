import { apiFetch, getAccessToken } from "@/lib/api/http";
import { env } from "@/lib/config/env";

export interface ChatRequestPayload {
  message: string;
  agent?: string | null;
  threadId?: string | null;
  agentTypeId?: string | null;
  userId?: string | null;
}

export interface ChatResult {
  reply: string;
  threadId: string;
  executionId?: string | null;
}

export async function sendChat(payload: ChatRequestPayload): Promise<ChatResult> {
  return apiFetch<ChatResult>(`${env.apiUrl}/api/v1/chat`, {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 120_000,
  });
}

export interface StreamEvent {
  type: "start" | "token" | "node" | "flow" | "done" | "error";
  token?: string;
  node?: string;
  /** Eventos `flow` (visibilidad del grafo): fase del nodo y duración. */
  phase?: "start" | "end";
  step?: number;
  ts?: number;
  durationMs?: number;
  threadId?: string;
  executionId?: string;
  error?: string;
}

/**
 * Chat con streaming SSE a través del backend (proxy del AI Service).
 * Parsea las líneas `event:`/`data:` y emite eventos tipados. Robusto a
 * líneas JSON cortadas entre chunks de red (acumula el resto pendiente).
 */
export async function streamChat(
  payload: ChatRequestPayload,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAccessToken();

  const response = await fetch(`${env.apiUrl}/api/v1/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`El agente no respondió (${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("event: ")) {
      const eventName = trimmed.slice("event: ".length);
      if (eventName === "done") onEvent({ type: "done" });
      return;
    }

    if (!trimmed.startsWith("data: ")) return;
    const data = trimmed.slice("data: ".length);
    if (!data || data === "{}") return;

    try {
      const parsed = JSON.parse(data) as {
        type?: string;
        token?: string;
        content?: string;
        node?: string;
        phase?: string;
        step?: number;
        ts?: number;
        duration_ms?: number;
        thread_id?: string;
        execution_id?: string;
        error?: string;
      };
      // El AI Service emite {"type":"token","content":"..."} — `content` es el texto.
      if (parsed.type === "token" && (parsed.content || parsed.token)) {
        onEvent({ type: "token", token: parsed.content ?? parsed.token, node: parsed.node });
      } else if (parsed.type === "node" && parsed.node) {
        onEvent({ type: "node", node: parsed.node });
      } else if (parsed.type === "flow" && parsed.node && (parsed.phase === "start" || parsed.phase === "end")) {
        onEvent({
          type: "flow",
          node: parsed.node,
          phase: parsed.phase,
          step: parsed.step,
          ts: parsed.ts,
          durationMs: parsed.duration_ms,
        });
      } else if (parsed.type === "error" && parsed.error) {
        onEvent({ type: "error", error: parsed.error });
      } else if (parsed.thread_id || parsed.execution_id) {
        onEvent({
          type: "done",
          threadId: parsed.thread_id,
          executionId: parsed.execution_id,
        });
      }
    } catch {
      // data no-JSON (p. ej. `{}` inicial): se ignora.
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      // La última línea puede estar incompleta (JSON cortado por el chunk).
      pending = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    }
    if (pending.trim()) handleLine(pending);
  } finally {
    reader.releaseLock();
  }
}
