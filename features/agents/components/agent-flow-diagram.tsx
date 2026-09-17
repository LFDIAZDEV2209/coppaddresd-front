"use client";

import { useMemo } from "react";
import { Check, CircleDashed, LoaderCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";
import type { AgentGraph, AgentGraphEdge, AgentGraphNode, AgentGraphNodeKind } from "../types";
import type { FlowNodeStatus, FlowNodeState } from "../hooks/use-agent-flow";

/** Etiquetas i18n de los nodos del grafo supervisor (fallback: label del API). */
export const NODE_LABEL_KEYS: Record<string, string> = {
  start: "Inicio",
  guardrails: "Guardrails",
  memory_load: "Memoria del usuario",
  experience_load: "Experiencias previas",
  agent: "Agente (LLM)",
  tools: "Herramientas",
  memory_save: "Guardar memoria",
  end: "Fin",
};

/** Etiquetas i18n de las aristas condicionales conocidas. */
const EDGE_LABEL_KEYS: Record<string, string> = {
  seguro: "seguro",
  inseguro: "inseguro",
  tool_calls: "tool_calls",
  respuesta: "respuesta",
};

const KIND_ACCENT: Record<AgentGraphNodeKind, string> = {
  start: "bg-slate-100 text-slate-500",
  guard: "bg-sky-50 text-sky-600",
  llm: "bg-violet-50 text-violet-600",
  tools: "bg-amber-50 text-amber-600",
  memory: "bg-teal-50 text-teal-600",
  end: "bg-slate-100 text-slate-500",
};

const CARD_BY_STATE: Record<FlowNodeState, string> = {
  pending: "border-border bg-card",
  running: "border-primary bg-primary-soft shadow-[0_0_0_3px] shadow-primary/15",
  done: "border-emerald-300 bg-emerald-50/70",
  skipped: "border-dashed border-border bg-card opacity-55",
  error: "border-destructive/60 bg-destructive-soft",
};

const NODE_W = 178;
const NODE_H = 54;
const GAP_X = 18;
const GAP_Y = 38;
/** Canal lateral por donde corren las aristas de retorno (loops). */
const CHANNEL = 36;

interface Layout {
  width: number;
  height: number;
  nodes: Array<{ node: AgentGraphNode; x: number; y: number }>;
  edges: Array<{ edge: AgentGraphEdge; path: string; back: boolean; active: boolean }>;
}

/**
 * Layout por capas (vertical, de `start` a `end`). La profundidad se calcula
 * con DFS memoizado y seguro ante ciclos: las aristas que cierran un ciclo
 * (p. ej. `tools → agent`) se dibujan como retornos laterales.
 */
function computeLayout(graph: AgentGraph, status: Record<string, FlowNodeStatus>): Layout {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, AgentGraphEdge[]>();
  for (const edge of graph.edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  }

  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const memo = depth.get(id);
    if (memo !== undefined) return memo;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let value = 0;
    for (const edge of outgoing.get(id) ?? []) {
      if (edge.source === edge.target) continue;
      value = Math.max(value, depthOf(edge.target) + 1);
    }
    visiting.delete(id);
    depth.set(id, value);
    return value;
  };

  const maxDepth = Math.max(0, ...graph.nodes.map((node) => depthOf(node.id)));
  const rows: AgentGraphNode[][] = [];
  for (const node of graph.nodes) {
    const row = maxDepth - depthOf(node.id);
    (rows[row] ??= []).push(node);
  }

  const contentWidth = Math.max(
    0,
    ...rows.map((rowNodes) => rowNodes.length * NODE_W + (rowNodes.length - 1) * GAP_X),
  );
  const width = contentWidth + CHANNEL * 2;
  const height = rows.length * NODE_H + Math.max(0, rows.length - 1) * GAP_Y;

  const positions = new Map<string, { x: number; y: number }>();
  rows.forEach((rowNodes, rowIndex) => {
    const rowWidth = rowNodes.length * NODE_W + (rowNodes.length - 1) * GAP_X;
    const startX = (width - rowWidth) / 2;
    rowNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: startX + index * (NODE_W + GAP_X),
        y: rowIndex * (NODE_H + GAP_Y),
      });
    });
  });

  const placedNodes = graph.nodes
    .filter((node) => positions.has(node.id))
    .map((node) => ({ node, ...positions.get(node.id)! }));

  const edges = graph.edges.flatMap((edge) => {
    const from = positions.get(edge.source);
    const to = positions.get(edge.target);
    if (!from || !to) return [];
    const active =
      status[edge.source]?.state === "running" || status[edge.target]?.state === "running";

    const back = to.y <= from.y;
    if (back) {
      const fx = from.x + NODE_W;
      const fy = from.y + NODE_H / 2;
      const tx = to.x + NODE_W;
      const ty = to.y + NODE_H / 2;
      const channelX = width - 10;
      return [
        {
          edge,
          back,
          active,
          path: `M ${fx} ${fy} C ${channelX} ${fy}, ${channelX} ${ty}, ${tx} ${ty}`,
        },
      ];
    }

    const fx = from.x + NODE_W / 2;
    const fy = from.y + NODE_H;
    const tx = to.x + NODE_W / 2;
    const ty = to.y;
    return [
      {
        edge,
        back,
        active,
        path: `M ${fx} ${fy} C ${fx} ${fy + 18}, ${tx} ${ty - 18}, ${tx} ${ty}`,
      },
    ];
  });

  return { width, height, nodes: placedNodes, edges };
}

interface AgentFlowDiagramProps {
  graph: AgentGraph | null;
  loading: boolean;
  status: Record<string, FlowNodeStatus>;
  finished: boolean;
}

/**
 * Diagrama del grafo del agente con estados en vivo: el nodo activo se
 * resalta (pulso), los completados muestran duración y los no ejecutados
 * quedan atenuados al terminar la corrida. Solo lectura.
 */
export function AgentFlowDiagram({ graph, loading, status, finished }: AgentFlowDiagramProps) {
  const t = useT();

  const layout = useMemo(
    () => (graph ? computeLayout(graph, status) : null),
    [graph, status],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-12 w-1/2" />
      </div>
    );
  }

  if (!graph || !layout) {
    return (
      <p className="text-[12.5px] text-muted-foreground">{t('Sin grafo disponible para este agente.')}</p>
    );
  }

  const stateOf = (id: string): FlowNodeState =>
    status[id]?.state ?? (finished ? "skipped" : "pending");

  return (
    <div className="flex flex-col gap-2.5">
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={t('Diagrama del flujo del agente')}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="mx-auto block"
        >
          <defs>
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-border" />
            </marker>
            <marker
              id="flow-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
            </marker>
          </defs>

          {layout.edges.map(({ edge, path, back, active }, index) => (
            <path
              key={`${edge.source}-${edge.target}-${index}`}
              d={path}
              fill="none"
              strokeWidth={active ? 2 : 1.4}
              markerEnd={`url(#${active ? "flow-arrow-active" : "flow-arrow"})`}
              className={
                active
                  ? "stroke-primary motion-safe:animate-pulse"
                  : "stroke-border"
              }
              strokeDasharray={edge.kind === "conditional" || back ? "5 4" : undefined}
            />
          ))}

          {layout.edges.map(({ edge, back }, index) => {
            if (!edge.label || back) return null;
            const from = layout.nodes.find((entry) => entry.node.id === edge.source);
            const to = layout.nodes.find((entry) => entry.node.id === edge.target);
            if (!from || !to) return null;
            return (
              <text
                key={`label-${edge.source}-${edge.target}-${index}`}
                x={(from.x + to.x) / 2 + NODE_W / 2 + 6}
                y={(from.y + NODE_H + to.y) / 2}
                className="fill-muted-foreground text-[9px]"
              >
                {t(EDGE_LABEL_KEYS[edge.label] ?? edge.label)}
              </text>
            );
          })}

          {layout.nodes.map(({ node, x, y }) => {
            const nodeStatus = status[node.id];
            const state = stateOf(node.id);
            const label = t(NODE_LABEL_KEYS[node.id] ?? node.label);
            return (
              <foreignObject key={node.id} x={x} y={y} width={NODE_W} height={NODE_H}>
                <div
                  title={node.description ?? undefined}
                  className={`flex h-full w-full items-center gap-2.5 rounded-xl border px-3 shadow-sm transition-all duration-300 ${CARD_BY_STATE[state]}`}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${KIND_ACCENT[node.kind]}`}
                  >
                    {state === "running" ? (
                      <LoaderCircle className="size-4 motion-safe:animate-spin" />
                    ) : state === "done" ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : state === "error" ? (
                      <X className="size-4 text-destructive" />
                    ) : (
                      <CircleDashed className={`size-4 ${state === "skipped" ? "opacity-60" : ""}`} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[12px] font-medium leading-tight text-foreground">
                      {label}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {nodeStatus?.lastDurationMs != null && state === "done" ? (
                        <span>{nodeStatus.lastDurationMs.toLocaleString("es-ES")} ms</span>
                      ) : state === "running" ? (
                        <span>{t('En ejecución')}</span>
                      ) : state === "skipped" ? (
                        <span>{t('Omitido')}</span>
                      ) : state === "error" ? (
                        <span>{t('Error')}</span>
                      ) : null}
                      {(nodeStatus?.runs ?? 0) > 1 && (
                        <span className="rounded bg-muted px-1 font-mono text-[9.5px]">
                          ×{nodeStatus?.runs}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
          {t('En ejecución')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-emerald-500" />
          {t('Completado')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full border border-dashed border-muted-foreground/60" />
          {t('Omitido')}
        </span>
        {graph.source === "base" ? (
          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-medium">
            {t('Grafo base')}
          </span>
        ) : (
          <span className="ml-auto rounded bg-primary-soft px-1.5 py-0.5 font-medium text-primary">
            {t('Versión activa')}
          </span>
        )}
      </div>
    </div>
  );
}
