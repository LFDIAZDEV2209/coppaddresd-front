"use client";

import { useRef, useState } from "react";
import {
  Send,
  LoaderCircle,
  Trash2,
  FileSearch,
  Wrench,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentType, AgentExecutionDetail } from "../types";
import { streamChat } from "../services/chat-service";
import { fetchExecution } from "../services/agents-service";
import { getAgentIconOption } from "./agent-icon-picker";
import { Markdown } from "@/components/markdown";
import { uuid } from "@/lib/uuid";
import { useT } from "@/providers/i18n-provider";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface PlaygroundProps {
  agent: AgentType;
  /** ID de usuario demo (aislamiento de memoria en el AI Service). */
  demoUserId: string;
}

function formatRagSource(source: unknown): string {
  if (typeof source === "string") return source;
  if (source && typeof source === "object") {
    const { source: name, heading, score } = source as {
      source?: string;
      heading?: string;
      score?: number;
    };
    const scorePart = typeof score === "number" ? ` (${score.toFixed(2)})` : "";
    return `${name ?? "?"}${heading ? ` · ${heading}` : ""}${scorePart}`;
  }
  return String(source);
}

export function Playground({ agent, demoUserId }: PlaygroundProps) {
  const t = useT();
  const icon = getAgentIconOption(agent.iconKey);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [nodes, setNodes] = useState<string[]>([]);
  const [detail, setDetail] = useState<AgentExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadIdRef = useRef<string>(`playground-${agent.id.slice(0, 8)}`);
  // El checkpointer de LangGraph reenvía el historial completo del thread en
  // cada turno; si una ejecución falla a mitad (loop de tools, stream cortado)
  // deja mensajes tool_use huérfanos que Anthropic rechaza. El playground es
  // una demo: thread nuevo por envío = historial limpio siempre.
  const nextThread = () =>
    `playground-${agent.id.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setNodes([]);
    setDetail(null);
    setError(null);
    threadIdRef.current = nextThread();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Demo: cada envío usa un thread fresco del checkpointer (evita historial
    // corrupto tras un stream fallido).
    threadIdRef.current = nextThread();

    setInput("");
    setError(null);
    setDetail(null);
    setDetailLoading(false);

    const userMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      content: text,
    };
    const assistantId = uuid();
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setSending(true);
    setNodes([]);

    const controller = new AbortController();
    abortRef.current = controller;

    let finishedExecutionId: string | null = null;

    try {
      await streamChat(
        {
          message: text,
          threadId: threadIdRef.current,
          agentTypeId: agent.id,
          userId: demoUserId,
        },
        (event) => {
          if (event.type === "token" && event.token) {
            setMessages((current) =>
              current.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.token! } : m,
              ),
            );
          } else if (event.type === "node" && event.node) {
            setNodes((current) =>
              current.includes(event.node!) ? current : [...current, event.node!],
            );
          } else if (event.type === "done" && event.executionId) {
            finishedExecutionId = event.executionId;
          } else if (event.type === "error" && event.error) {
            setError(event.error);
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(t('No se pudo conectar con el agente. Intentá de nuevo.'));
    } finally {
      setSending(false);
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m,
        ),
      );
      abortRef.current = null;
    }

    // Tras terminar, se carga el detalle de la ejecución para el panel debug
    // (fuentes RAG, tools, tokens, latencia).
    if (finishedExecutionId) {
      setDetailLoading(true);
      try {
        setDetail(await fetchExecution(finishedExecutionId));
      } catch {
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const toolsUsed = detail?.output?.tools_used;
  const ragSources = detail?.output?.rag_sources;
  const outputAnswer = detail?.output?.answer;

  return (
    <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_340px]">
      {/* --- Chat --- */}
      <div className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-primary-soft px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: icon.bg }}
            >
              <icon.icon className="size-4.5" style={{ color: icon.color }} />
            </span>
            <div className="flex flex-col gap-px">
              <span className="text-sm font-semibold">{agent.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {t('v{version} · demo interactivo', { version: String(agent.activeVersionNumber ?? '—') })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {agent.status}
            </Badge>
            <Button variant="ghost" size="icon-sm" onClick={clearChat} aria-label={t('Limpiar conversación')}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <span
                className="flex size-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: icon.bg }}
              >
                <icon.icon className="size-7" style={{ color: icon.color }} />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">
                  {t('Probá {name}', { name: agent.name })}
                </p>
                <p className="max-w-sm text-[12.5px] text-muted-foreground">
                  {t('Escribí un mensaje para ver cómo responde con su configuración actual (instrucciones, herramientas y conocimiento).')}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                  message.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-background"
                }`}
              >
                {message.role === "assistant" && message.content ? (
                  <Markdown content={message.content} />
                ) : (
                  message.content || (message.streaming ? "…" : "")
                )}
                {message.streaming && message.content && (
                  <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          {error && (
            <p className="mb-2 rounded-lg bg-destructive-soft px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={t('Mensaje para {name}...', { name: agent.name })}
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              aria-label={t('Enviar mensaje')}
            >
              {sending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Send />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* --- Panel debug --- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <Sparkles className="size-4 text-primary" />
          <div className="flex flex-col gap-px">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Nodos del grafo')}
            </span>
            <div className="flex flex-wrap gap-1">
              {nodes.length === 0 ? (
                <span className="text-[12px] text-muted-foreground">—</span>
              ) : (
                nodes.map((node) => (
                  <Badge key={node} variant="secondary" className="font-mono text-[10.5px]">
                    {node}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <FileSearch className="size-4 text-emerald-600" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Fuentes recuperadas (RAG)')}
            </span>
            {detailLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : Array.isArray(ragSources) && ragSources.length > 0 ? (
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {ragSources.map((source, index) => (
                  <p key={index} className="truncate text-[11.5px] text-muted-foreground">
                    {typeof source === "string"
                      ? source
                      : formatRagSource(source)}
                  </p>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-muted-foreground">
                {detail ? t('Sin fuentes (sin RAG activo)') : t('Enviá un mensaje para ver el detalle.')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <Wrench className="size-4 text-violet-600" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Tools ejecutadas')}
            </span>
            {Array.isArray(toolsUsed) && toolsUsed.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {[...new Set(toolsUsed.map(String))].map((tool) => (
                  <Badge key={tool} variant="outline" className="font-mono text-[10.5px]">
                    {tool}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-muted-foreground">
                {detail ? t('Ninguna') : "—"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <Gauge className="size-4 text-amber-600" />
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Uso (última ejecución)')}
            </span>
            {detailLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : detail ? (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
                <span>
                  <strong className="font-semibold text-foreground">
                    {(detail.tokensIn ?? 0).toLocaleString("es-ES")}
                  </strong>{" "}
                  in
                </span>
                <span>
                  <strong className="font-semibold text-foreground">
                    {(detail.tokensOut ?? 0).toLocaleString("es-ES")}
                  </strong>{" "}
                  out
                </span>
                <span>
                  <strong className="font-semibold text-foreground">
                    {detail.latencyMs?.toLocaleString("es-ES") ?? "—"}
                  </strong>{" "}
                  ms
                </span>
                <span className="truncate">{detail.model}</span>
              </div>
            ) : (
              <span className="text-[12px] text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {Boolean(detail?.output?.answer) && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Respuesta del estado')}
            </span>
            <div className="mt-1 line-clamp-3 text-[11.5px] text-muted-foreground">
              <Markdown content={String(outputAnswer)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
