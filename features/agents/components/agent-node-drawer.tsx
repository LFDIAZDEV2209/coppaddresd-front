"use client";

import { ArrowDownLeft, ArrowUpRight, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/providers/i18n-provider";
import type {
  AgentExecutionDetail,
  AgentGraph,
  AgentGraphNode,
  AgentGraphNodeKind,
} from "../types";
import type { FlowNodeStatus, FlowStep } from "../hooks/use-agent-flow";
import { KIND_ACCENT, NODE_LABEL_KEYS } from "./agent-flow-diagram";

/** Etiqueta i18n del tipo de nodo. */
const KIND_LABEL_KEYS: Record<AgentGraphNodeKind, string> = {
  start: "Inicio",
  guard: "Guardrails",
  llm: "Modelo LLM",
  tools: "Herramientas",
  memory: "Memoria",
  end: "Fin",
};

/** Etiquetas i18n de las claves de meta conocidas. */
const META_LABEL_KEYS: Record<string, string> = {
  provider: "Proveedor",
  model: "Modelo",
  temperature: "Temperatura",
  max_tokens: "Máx. tokens",
  recursion_limit: "Límite de recursión",
  max_tool_calls: "Máx. tool calls",
  rag_enabled: "RAG activo",
  knowledge_base_count: "Bases de conocimiento",
  top_k: "Fragmentos por búsqueda (top K)",
  memory_enabled: "Memoria activa",
};

const STATE_LABEL_KEYS: Record<string, string> = {
  pending: "Pendiente",
  running: "En ejecución",
  done: "Completado",
  skipped: "Omitido",
  error: "Error",
};

const STATE_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary-soft text-primary",
  done: "bg-emerald-50 text-emerald-700",
  skipped: "bg-muted text-muted-foreground",
  error: "bg-destructive-soft text-destructive",
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="shrink-0 text-[11.5px] text-muted-foreground">{label}</span>
      <span className="truncate text-right font-mono text-[11.5px] text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Chips para metadatos tipo lista (tools, categorías de memoria). */
function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="font-mono text-[10px]">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

interface AgentNodeDrawerProps {
  node: AgentGraphNode | null;
  graph: AgentGraph | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: FlowNodeStatus | null;
  steps: FlowStep[];
  execution: AgentExecutionDetail | null;
}

/**
 * Drawer lateral con el detalle del nodo seleccionado en el canvas del
 * playground: configuración efectiva, conexiones, estado en vivo y
 * entrada/salida de la última ejecución (solo lectura).
 */
export function AgentNodeDrawer({
  node,
  graph,
  open,
  onOpenChange,
  status,
  steps,
  execution,
}: AgentNodeDrawerProps) {
  const t = useT();

  if (!node || !graph) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const label = t(NODE_LABEL_KEYS[node.id] ?? node.label);
  const meta = (node.meta ?? {}) as Record<string, unknown>;

  const scalarRows = Object.entries(meta).filter(
    ([key, value]) =>
      key !== "tools" &&
      key !== "categories" &&
      ["string", "number", "boolean"].includes(typeof value),
  );
  const tools = Array.isArray(meta.tools) ? meta.tools.map(String) : [];
  const categories = Array.isArray(meta.categories)
    ? meta.categories.map(String)
    : [];

  const incoming = graph.edges.filter((edge) => edge.target === node.id);
  const outgoing = graph.edges.filter((edge) => edge.source === node.id);
  const edgeName = (nodeId: string) =>
    t(NODE_LABEL_KEYS[nodeId] ?? graph.nodes.find((entry) => entry.id === nodeId)?.label ?? nodeId);

  const nodeSteps = steps.filter((step) => step.node === node.id);
  const totalDuration = nodeSteps
    .filter((step) => step.phase === "end")
    .reduce((sum, step) => sum + (step.durationMs ?? 0), 0);

  const inputRecord = (execution?.input ?? null) as Record<string, unknown> | null;
  const outputRecord = (execution?.output ?? null) as Record<string, unknown> | null;
  const message = typeof inputRecord?.message === "string" ? inputRecord.message : null;
  const answer = typeof outputRecord?.answer === "string" ? outputRecord.answer : null;
  const memoryContext =
    typeof inputRecord?.memory_context === "string" ? inputRecord.memory_context : null;
  const ragSources = Array.isArray(outputRecord?.rag_sources)
    ? (outputRecord?.rag_sources as unknown[]).length
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="z-[80] w-full gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-2.5 pr-8">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${KIND_ACCENT[node.kind]}`}
            >
              <Workflow className="size-4" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-sm font-semibold">{label}</SheetTitle>
              <SheetDescription className="line-clamp-2 text-[11.5px]">
                {node.description ?? t("Nodo del grafo del agente")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10.5px]">
              {t(KIND_LABEL_KEYS[node.kind])}
            </Badge>
            {status && (
              <Badge className={`text-[10.5px] ${STATE_BADGE[status.state]}`}>
                {t(STATE_LABEL_KEYS[status.state] ?? status.state)}
              </Badge>
            )}
            <Badge variant="secondary" className="font-mono text-[10px]">
              {node.id}
            </Badge>
          </div>

          {scalarRows.length > 0 && (
            <Section title={t("Configuración del nodo")}>
              <div>
                {scalarRows.map(([key, value]) => (
                  <MetaRow
                    key={key}
                    label={t(META_LABEL_KEYS[key] ?? key)}
                    value={
                      typeof value === "boolean"
                        ? value
                          ? t("Sí")
                          : t("No")
                        : String(value)
                    }
                  />
                ))}
              </div>
            </Section>
          )}

          {tools.length > 0 && (
            <Section title={t("Herramientas")}>
              <ChipList items={tools} />
            </Section>
          )}

          {categories.length > 0 && (
            <Section title={t("Categorías de memoria")}>
              <ChipList items={categories} />
            </Section>
          )}

          <Section title={t("Conexiones")}>
            <div className="flex flex-col gap-1 text-[11.5px]">
              {incoming.map((edge, index) => (
                <p key={`in-${index}`} className="flex items-center gap-1.5">
                  <ArrowDownLeft className="size-3 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">{edgeName(edge.source)}</span>
                  {edge.label && (
                    <Badge variant="outline" className="font-mono px-1 py-0 text-[9px]">
                      {edge.label}
                    </Badge>
                  )}
                </p>
              ))}
              {outgoing.map((edge, index) => (
                <p key={`out-${index}`} className="flex items-center gap-1.5">
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">{edgeName(edge.target)}</span>
                  {edge.label && (
                    <Badge variant="outline" className="font-mono px-1 py-0 text-[9px]">
                      {edge.label}
                    </Badge>
                  )}
                </p>
              ))}
            </div>
          </Section>

          {status && (
            <Section title={t("Estado en vivo")}>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
                <span>
                  <strong className="font-semibold text-foreground">{status.runs}</strong>{" "}
                  {t("ejecuciones")}
                </span>
                {totalDuration > 0 && (
                  <span>
                    <strong className="font-semibold text-foreground">
                      {totalDuration.toLocaleString("es-ES")}
                    </strong>{" "}
                    ms
                  </span>
                )}
                <span>
                  {t("{count} pasos", { count: String(nodeSteps.length) })}
                </span>
              </div>
            </Section>
          )}

          {(message || answer || memoryContext || (ragSources > 0 && node.kind === "llm")) && (
            <Section title={t("Última ejecución")}>
              <div className="flex flex-col gap-2">
                {message && (
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Entrada")}
                    </p>
                    <p className="mt-0.5 line-clamp-4 text-[11.5px] text-foreground">
                      {message}
                    </p>
                  </div>
                )}
                {node.kind === "memory" && memoryContext && (
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Memoria recuperada")}
                    </p>
                    <p className="mt-0.5 line-clamp-4 text-[11.5px] text-foreground">
                      {memoryContext}
                    </p>
                  </div>
                )}
                {node.kind === "llm" && ragSources > 0 && (
                  <p className="text-[11.5px] text-muted-foreground">
                    {t("{count} fuentes RAG recuperadas", { count: String(ragSources) })}
                  </p>
                )}
                {node.kind === "tools" && Array.isArray(outputRecord?.tools_used) && (
                  <ChipList
                    items={[...new Set((outputRecord?.tools_used as unknown[]).map(String))]}
                  />
                )}
                {answer && node.kind !== "tools" && (
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Salida")}
                    </p>
                    <p className="mt-0.5 line-clamp-6 text-[11.5px] text-foreground">
                      {answer}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
