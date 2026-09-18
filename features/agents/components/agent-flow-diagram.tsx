"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  CircleDashed,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export const KIND_ACCENT: Record<AgentGraphNodeKind, string> = {
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
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;

const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));

interface Point {
  x: number;
  y: number;
}

/** Disposición por capas (vertical, de `start` a `end`) — misma métrica base. */
function autoPositions(graph: AgentGraph): Map<string, Point> {
  const outgoing = new Map<string, AgentGraphEdge[]>();
  for (const edge of graph.edges) {
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

  const maxRowWidth = Math.max(
    0,
    ...rows.map((rowNodes) => rowNodes.length * NODE_W + (rowNodes.length - 1) * GAP_X),
  );
  const width = maxRowWidth + CHANNEL * 2;

  const positions = new Map<string, Point>();
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
  return positions;
}

interface FlowEdgePath {
  edge: AgentGraphEdge;
  path: string;
  back: boolean;
  active: boolean;
}

function edgePaths(
  graph: AgentGraph,
  positions: Map<string, Point>,
  status: Record<string, FlowNodeStatus>,
  contentWidth: number,
): { edges: FlowEdgePath[]; width: number } {
  const width = Math.max(
    contentWidth + CHANNEL,
    ...[...positions.values()].map((point) => point.x + NODE_W + CHANNEL),
  );
  const channelX = width - 10;

  const edges = graph.edges.flatMap<FlowEdgePath>((edge) => {
    const from = positions.get(edge.source);
    const to = positions.get(edge.target);
    if (!from || !to) return [];
    const active =
      status[edge.source]?.state === "running" ||
      status[edge.target]?.state === "running";

    const back = to.y <= from.y;
    if (back) {
      const fx = from.x + NODE_W;
      const fy = from.y + NODE_H / 2;
      const tx = to.x + NODE_W;
      const ty = to.y + NODE_H / 2;
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

  return { edges, width };
}

interface AgentFlowDiagramProps {
  graph: AgentGraph | null;
  loading: boolean;
  status: Record<string, FlowNodeStatus>;
  finished: boolean;
  /** Nodo seleccionado (drawer del playground). */
  selectedId?: string | null;
  /** Click en un nodo (sin arrastre). */
  onSelectNode?: (nodeId: string | null) => void;
  /** Nombre del agente (encabezado del modo pantalla completa). */
  agentName?: string;
  /** La ejecución está corriendo (indicador del encabezado fullscreen). */
  running?: boolean;
}

/**
 * Canvas interactivo del grafo del agente con estados en vivo: el nodo activo
 * se resalta (pulso), los completados muestran duración y los no ejecutados
 * quedan atenuados al terminar. Zoom, paneo y reorganización de nodos con el
 * mouse — solo visual: la configuración persistida no se modifica.
 *
 * Separación de estados: la configuración real del agente vive en el backend
 * (descriptor `graph`); la disposición de nodos, zoom, pan, selección y el
 * modo fullscreen son estado visual del playground (useState local, efímero).
 */
export function AgentFlowDiagram({
  graph,
  loading,
  status,
  finished,
  selectedId,
  onSelectNode,
  agentName,
  running = false,
}: AgentFlowDiagramProps) {
  const t = useT();
  const [size, setSize] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  /** Reordenamiento manual (solo sesión). */
  const [overrides, setOverrides] = useState<Record<string, Point>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef<{
    mode: "pan" | "node";
    nodeId: string | null;
    /** Puntero al iniciar el arrastre (client coords). */
    startPointer: Point;
    /** Offset del viewport al iniciar el pan (para aplicar delta relativo). */
    startOffset: Point;
    /** Posición del nodo al iniciar el drag. */
    nodeOrig: Point | null;
    moved: boolean;
  } | null>(null);
  /** Tick que re-evalúa el viewport (fit pendiente). */
  const [viewportTick, setViewportTick] = useState(0);
  const fitPendingRef = useRef(false);
  /** Solicita un fit en el próximo pase de viewport. */
  const requestFit = useCallback(() => {
    fitPendingRef.current = true;
    setViewportTick((tick) => tick + 1);
  }, []);

  // Espejo del zoom para listeners no-React (wheel) sin dependencias stale.
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const zoomTo = useCallback((next: number, pivot?: Point) => {
    setZoom((current) => {
      const z = clampZoom(next);
      if (z === current) return current;
      if (pivot) {
        setOffset((o) => ({
          x: pivot.x - ((pivot.x - o.x) / current) * z,
          y: pivot.y - ((pivot.y - o.y) / current) * z,
        }));
      }
      return z;
    });
  }, []);

  // El contenedor existe solo cuando hay grafo: el ref-callback adjunta la
  // medida (ResizeObserver) y el wheel-zoom justo cuando el div se monta.
  const observerRef = useRef<ResizeObserver | null>(null);
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const attachContainer = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      wheelCleanupRef.current?.();
      wheelCleanupRef.current = null;
      if (!node) return;
      const measure = () =>
        setSize({ x: node.clientWidth, y: node.clientHeight });
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      observerRef.current = observer;
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = node.getBoundingClientRect();
        const pivot = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoomTo(zoomRef.current * factor, pivot);
      };
      node.addEventListener("wheel", onWheel, { passive: false });
      wheelCleanupRef.current = () => node.removeEventListener("wheel", onWheel);
    },
    [zoomTo],
  );

  const layout = useMemo(() => {
    if (!graph) return null;
    const base = autoPositions(graph);
    const merged = new Map(base);
    for (const [id, point] of Object.entries(overrides)) {
      if (base.has(id)) merged.set(id, point);
    }
    const contentWidth = Math.max(
      0,
      ...[...merged.values()].map((point) => point.x + NODE_W),
    );
    const contentHeight = Math.max(
      0,
      ...[...merged.values()].map((point) => point.y + NODE_H),
    );
    const { edges, width } = edgePaths(graph, merged, status, contentWidth);
    return {
      positions: merged,
      edges,
      width: width + CHANNEL,
      height: contentHeight + 8,
      contentWidth,
      contentHeight,
    };
  }, [graph, overrides, status]);

  // Nuevo agente → descarta el reordenamiento manual y pide fit.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de vista al cambiar de agente, intencional
    setOverrides({});
    requestFit();
  }, [graph?.agentTypeId, requestFit]);

  // Ejecuta el fit pendiente contra el layout y el tamaño actuales.
  useEffect(() => {
    if (!fitPendingRef.current || !layout || size.x < 40 || size.y < 40) return;
    fitPendingRef.current = false;
    const fitZoom = Math.min(
      (size.x - 28) / layout.contentWidth,
      (size.y - 28) / layout.contentHeight,
      1.25,
    );
    const z = clampZoom(fitZoom);
    setZoom(z);
    setOffset({
      x: (size.x - layout.contentWidth * z) / 2,
      y: (size.y - layout.contentHeight * z) / 2,
    });
  }, [viewportTick, layout, size]);

  // --- Pantalla completa -----------------------------------------------------
  // Snapshot del viewport para restaurar al salir (misma instancia: el
  // componente no se desmonta; grafo, estados, tiempos y selección intactos).
  const savedViewRef = useRef<{ zoom: number; offset: Point } | null>(null);
  const enteredFullscreenRef = useRef(false);

  useEffect(() => {
    if (fullscreen && !enteredFullscreenRef.current) {
      enteredFullscreenRef.current = true;
      savedViewRef.current = { zoom, offset };
      requestFit();
    }
    if (!fullscreen) {
      enteredFullscreenRef.current = false;
      if (savedViewRef.current) {
        setZoom(savedViewRef.current.zoom);
        setOffset(savedViewRef.current.offset);
        savedViewRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, requestFit]);

  // ESC cierra pantalla completa; bloquea el scroll del body mientras dura.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const target = event.target as HTMLElement;
      const nodeEl = target.closest("[data-node-id]");
      const nodeId = nodeEl?.getAttribute("data-node-id") ?? null;
      dragRef.current = {
        mode: nodeId ? "node" : "pan",
        nodeId,
        startPointer: { x: event.clientX, y: event.clientY },
        startOffset: offset,
        nodeOrig: nodeId ? (layout?.positions.get(nodeId) ?? null) : null,
        moved: false,
      };
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    },
    [layout, offset],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startPointer.x;
      const dy = event.clientY - drag.startPointer.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
      if (drag.mode === "pan") {
        // Delta relativo desde el offset inicial — nunca coordenadas absolutas.
        setOffset({ x: drag.startOffset.x + dx, y: drag.startOffset.y + dy });
        return;
      }
      if (drag.mode === "node" && drag.nodeId && drag.nodeOrig) {
        setOverrides((current) => ({
          ...current,
          [drag.nodeId!]: {
            x: drag.nodeOrig!.x + dx / zoom,
            y: drag.nodeOrig!.y + dy / zoom,
          },
        }));
      }
    },
    [zoom],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (drag && drag.mode === "node" && !drag.moved && drag.nodeId) {
        onSelectNode?.(selectedId === drag.nodeId ? null : drag.nodeId);
      }
    },
    [onSelectNode, selectedId],
  );

  // --- Controles (compartidos entre modo normal y fullscreen) ----------------

  const controls = (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => zoomTo(zoom * 1.2, { x: size.x / 2, y: size.y / 2 })}
        aria-label={t('Acercar')}
        title={t('Acercar')}
      >
        <Plus className="size-3.5" />
      </Button>
      <span className="w-9 text-center font-mono text-[10px] text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => zoomTo(zoom / 1.2, { x: size.x / 2, y: size.y / 2 })}
        aria-label={t('Alejar')}
        title={t('Alejar')}
      >
        <Minus className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setFullscreen(true)}
        aria-label={t('Pantalla completa')}
        title={t('Pantalla completa')}
      >
        <Maximize2 className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          setOverrides({});
          requestFit();
        }}
        aria-label={t('Restablecer vista')}
        title={t('Restablecer vista')}
      >
        <RotateCcw className="size-3.5" />
      </Button>
    </>
  );

  const stateOf = (id: string): FlowNodeState =>
    status[id]?.state ?? (finished ? "skipped" : "pending");

  const hasError = Object.values(status).some((entry) => entry.state === "error");
  const statusLabel = running
    ? t('En ejecución')
    : finished
      ? hasError
        ? t('Con errores')
        : t('Completado')
      : t('Pendiente');

  const renderCanvas = (showFloatingControls: boolean) => {
    if (loading) {
      return (
        <div className="flex flex-1 flex-col gap-2 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      );
    }

    if (!graph || !layout) {
      return (
        <p className="p-4 text-[12.5px] text-muted-foreground">
          {t('Sin grafo disponible para este agente.')}
        </p>
      );
    }

    return (
      <div
        ref={attachContainer}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
      >
        {showFloatingControls && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl border border-border bg-card/90 p-1 shadow-sm backdrop-blur">
            {controls}
          </div>
        )}

        <svg
          role="img"
          aria-label={t('Diagrama del flujo del agente')}
          width={size.x || "100%"}
          height={size.y || "100%"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="block h-full w-full cursor-grab select-none active:cursor-grabbing"
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

          <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
            {layout.edges.map(({ edge, path, back, active }, index) => (
              <path
                key={`${edge.source}-${edge.target}-${index}`}
                d={path}
                fill="none"
                strokeWidth={active ? 2 : 1.4}
                markerEnd={`url(#${active ? "flow-arrow-active" : "flow-arrow"})`}
                className={
                  active ? "stroke-primary motion-safe:animate-pulse" : "stroke-border"
                }
                strokeDasharray={edge.kind === "conditional" || back ? "5 4" : undefined}
              />
            ))}

            {layout.edges.map(({ edge, back }, index) => {
              if (!edge.label || back) return null;
              const from = layout.positions.get(edge.source);
              const to = layout.positions.get(edge.target);
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

            {[...layout.positions.entries()]
              .filter(([id]) => graph.nodes.some((node) => node.id === id))
              .map(([id, position]) => {
                const node = graph.nodes.find((entry) => entry.id === id)!;
                const nodeStatus = status[id];
                const state = stateOf(id);
                const label = t(NODE_LABEL_KEYS[node.id] ?? node.label);
                const selected = selectedId === id;
                return (
                  <foreignObject
                    key={id}
                    x={position.x}
                    y={position.y}
                    width={NODE_W}
                    height={NODE_H}
                  >
                    <div
                      data-node-id={id}
                      title={node.description ?? undefined}
                      className={`flex h-full w-full cursor-move items-center gap-2.5 rounded-xl border px-3 shadow-sm transition-all duration-300 ${CARD_BY_STATE[state]} ${
                        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      }`}
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
                          <CircleDashed
                            className={`size-4 ${state === "skipped" ? "opacity-60" : ""}`}
                          />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[12px] font-medium leading-tight text-foreground">
                          {label}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {nodeStatus?.lastDurationMs != null && state === "done" ? (
                            <span>
                              {nodeStatus.lastDurationMs.toLocaleString("es-ES")} ms
                            </span>
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
          </g>
        </svg>
      </div>
    );
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
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
      <span className="ml-auto hidden items-center gap-1 sm:inline-flex">
        <RotateCcw className="size-3" />
        {t('Arrastrá los nodos para reorganizar la vista (no modifica el agente)')}
      </span>
      {graph?.source === "base" ? (
        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
          {t('Grafo base')}
        </span>
      ) : (
        <span className="rounded bg-primary-soft px-1.5 py-0.5 font-medium text-primary">
          {t('Versión activa')}
        </span>
      )}
    </div>
  );

  // El overlay fullscreen reutiliza el MISMO árbol (mismo <svg>, mismo estado
  // de zoom/offset/overrides/selección): solo cambia la clase del contenedor —
  // no hay remount, la ejecución en curso no se interrumpe.
  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-[70] flex h-screen w-screen flex-col bg-background/95 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={t('Vista del flujo del agente')}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {agentName ?? t('Flujo del agente')}
          </span>
          {running ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-primary">
              <LoaderCircle className="size-3 motion-safe:animate-spin" />
              {t('En ejecución')}
            </span>
          ) : (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {statusLabel}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
            {controls}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen(false)}
              aria-label={t('Salir de pantalla completa')}
              title={t('Salir de pantalla completa')}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          {renderCanvas(false)}
          {legend}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {renderCanvas(true)}
      {legend}
    </div>
  );
}
