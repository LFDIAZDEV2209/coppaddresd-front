"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  LoaderCircle,
  Trash2,
  FileSearch,
  Wrench,
  Gauge,
  Sparkles,
  GitBranch,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AgentType, AgentExecutionDetail, AgentGraph } from "../types";
import { streamChat } from "../services/chat-service";
import { fetchExecution, fetchAgentGraph } from "../services/agents-service";
import { useAgentFlow } from "../hooks/use-agent-flow";
import { AgentFlowDiagram, NODE_LABEL_KEYS } from "./agent-flow-diagram";
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
  const [tab, setTab] = useState<"flow" | "detail">("flow");
  const [graphEntry, setGraphEntry] = useState<{
    agentId: string;
    graph: AgentGraph | null;
  } | null>(null);
  const [detail, setDetail] = useState<AgentExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const flow = useAgentFlow();

  // Descriptor del grafo del agente (nodos/aristas + config efectiva) para el
  // diagrama de flujos del panel derecho. Sin setState síncrono en el efecto:
  // el "cargando" se deriva de si la entrada corresponde al agente actual.
  useEffect(() => {
    let active = true;
    fetchAgentGraph(agent.id)
      .then((data) => {
        if (active) setGraphEntry({ agentId: agent.id, graph: data });
      })
      .catch(() => {
        if (active) setGraphEntry({ agentId: agent.id, graph: null });
      });
    return () => {
      active = false;
    };
  }, [agent.id]);

  const graphLoading = graphEntry?.agentId !== agent.id;
  const graph = graphEntry?.agentId === agent.id ? graphEntry.graph : null;
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
    setDetail(null);
    setError(null);
    flow.reset();
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
    // Cada corrida reinicia la visualización del flujo; el estado del grafo
    // se reconstruye con los eventos `flow` del stream.
    flow.reset();
    setTab("flow");

    const controller = new AbortController();
    abortRef.current = controller;

    let finishedExecutionId: string | null = null;
    let streamError = false;

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
          } else if (event.type === "done" && event.executionId) {
            finishedExecutionId = event.executionId;
          } else if (event.type === "error" && event.error) {
            streamError = true;
            setError(event.error);
          }
          // Alimenta la máquina de estados del flujo (flow/token/done).
          flow.handleEvent(event);
        },
        controller.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      streamError = true;
      setError(t('No se pudo conectar con el agente. Intentá de nuevo.'));
    } finally {
      setSending(false);
      flow.complete(streamError);
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

      {/* --- Panel derecho: flujo en vivo + detalle --- */}
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "flow" | "detail")}
        className="min-w-0"
      >
        <TabsList className="w-full">
          <TabsTrigger value="flow" className="gap-1.5">
            <GitBranch className="size-3.5" />
            {t('Flujo en vivo')}
          </TabsTrigger>
          <TabsTrigger value="detail" className="gap-1.5">
            <ListChecks className="size-3.5" />
            {t('Detalle')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('Flujo en vivo')}
              </span>
              {sending && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-primary">
                  <LoaderCircle className="size-3 motion-safe:animate-spin" />
                  {t('En ejecución')}
                </span>
              )}
            </div>
            <AgentFlowDiagram
              graph={graph}
              loading={graphLoading}
              status={flow.status}
              finished={flow.finished}
            />
          </div>

          {graph && (
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('Configuración efectiva')}
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {graph.config.model && (
                  <Badge variant="outline" className="font-mono text-[10.5px]">
                    {graph.config.model}
                  </Badge>
                )}
                {graph.config.temperature != null && (
                  <Badge variant="secondary" className="text-[10.5px]">
                    {t('temp {value}', { value: String(graph.config.temperature) })}
                  </Badge>
                )}
                {graph.config.tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="font-mono text-[10.5px]">
                    {tool}
                  </Badge>
                ))}
                {graph.config.rag.enabled && (
                  <Badge variant="outline" className="text-[10.5px] text-emerald-700">
                    {t('RAG · {count} KBs', {
                      count: String(graph.config.rag.knowledgeBaseCount),
                    })}
                  </Badge>
                )}
                {graph.config.memory.enabled && (
                  <Badge variant="outline" className="text-[10.5px] text-teal-700">
                    {t('Memoria · {count} categorías', {
                      count: String(graph.config.memory.categories.length),
                    })}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Pasos de la ejecución')}
            </span>
            {flow.steps.filter((step) => step.phase === "end").length === 0 ? (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {flow.hasRun
                  ? t('Sin pasos registrados.')
                  : t('Enviá un mensaje para ver el flujo en vivo.')}
              </p>
            ) : (
              <ol className="mt-2 flex flex-col gap-1">
                {flow.steps
                  .filter((step) => step.phase === "end")
                  .map((step, index) => (
                    <li
                      key={`${step.node}-${step.step}-${index}`}
                      className="flex items-center gap-2 text-[11.5px] text-muted-foreground"
                    >
                      <span className="w-5 text-right font-mono text-[10px]">
                        {index + 1}.
                      </span>
                      <span className="font-medium text-foreground">
                        {t(NODE_LABEL_KEYS[step.node] ?? step.node)}
                      </span>
                      {step.durationMs != null && (
                        <span className="ml-auto font-mono text-[10.5px]">
                          {step.durationMs.toLocaleString("es-ES")} ms
                        </span>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </TabsContent>

        <TabsContent value="detail" className="flex flex-col gap-3">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
