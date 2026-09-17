"use client";

import { useCallback, useMemo, useState } from "react";
import type { StreamEvent } from "../services/chat-service";

export type FlowNodeState = "pending" | "running" | "done" | "skipped" | "error";

/** Paso del recorrido del grafo (start/end de un nodo). */
export interface FlowStep {
  node: string;
  step: number;
  phase: "start" | "end";
  ts: number;
  durationMs?: number;
}

/** Estado acumulado de un nodo durante la ejecución. */
export interface FlowNodeStatus {
  state: FlowNodeState;
  /** Veces que el nodo se ejecutó (el loop agent ⇄ tools repite nodos). */
  runs: number;
  lastDurationMs?: number;
  startedAt?: number;
}

export interface AgentFlow {
  steps: FlowStep[];
  status: Record<string, FlowNodeStatus>;
  /** La ejecución terminó (todos los nodos tocados quedan done/error). */
  finished: boolean;
  /** Hubo al menos una ejecución desde el último reset. */
  hasRun: boolean;
  /** Nodo en ejecución (para indicadores externos). */
  runningNode: string | null;
  handleEvent: (event: StreamEvent) => void;
  /** Cierra la ejecución actual (`error` marca el nodo activo como fallido). */
  complete: (error?: boolean) => void;
  reset: () => void;
}

/**
 * Máquina de estados del flujo del grafo a partir de los eventos SSE.
 *
 * - `flow` start/end: fase real por nodo (con duración y step).
 * - `token` con `node`: respaldo de compatibilidad (AI Service viejo sin
 *   eventos `flow`): marca el nodo activo cuando llega su primer token.
 * - `done`/error: cierra la ejecución (`complete`).
 */
export function useAgentFlow(): AgentFlow {
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [status, setStatus] = useState<Record<string, FlowNodeStatus>>({});
  const [finished, setFinished] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const reset = useCallback(() => {
    setSteps([]);
    setStatus({});
    setFinished(false);
    setHasRun(false);
  }, []);

  const handleEvent = useCallback((event: StreamEvent) => {
    if (event.type === "flow" && event.node && event.phase) {
      const node = event.node;
      const phase = event.phase;
      const now = event.ts ?? Date.now();
      setHasRun(true);
      setFinished(false);
      setSteps((current) => [
        ...current,
        {
          node,
          step: event.step ?? current.length + 1,
          phase,
          ts: now,
          durationMs: event.durationMs,
        },
      ]);
      setStatus((current) => {
        const prev = current[node];
        if (phase === "start") {
          return {
            ...current,
            [node]: {
              state: "running",
              runs: (prev?.runs ?? 0) + 1,
              startedAt: now,
            },
          };
        }
        return {
          ...current,
          [node]: {
            state: "done",
            runs: prev?.runs ?? 1,
            lastDurationMs:
              event.durationMs ??
              (prev?.startedAt !== undefined ? now - prev.startedAt : undefined),
          },
        };
      });
      return;
    }

    if (event.type === "token" && event.node) {
      const node = event.node;
      setHasRun(true);
      setStatus((current) => {
        const prev = current[node];
        if (prev?.state === "running") return current;
        return {
          ...current,
          [node]: { ...prev, state: "running", runs: prev?.runs ?? 1 },
        };
      });
    }
  }, []);

  const complete = useCallback((error = false) => {
    setFinished(true);
    setStatus((current) => {
      const next: Record<string, FlowNodeStatus> = { ...current };
      for (const [node, nodeStatus] of Object.entries(next)) {
        if (nodeStatus.state === "running") {
          next[node] = { ...nodeStatus, state: error ? "error" : "done" };
        }
      }
      return next;
    });
  }, []);

  const runningNode = useMemo(() => {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const step = steps[index];
      if (status[step.node]?.state === "running") return step.node;
    }
    return null;
  }, [steps, status]);

  return useMemo(
    () => ({
      steps,
      status,
      finished,
      hasRun,
      runningNode,
      handleEvent,
      complete,
      reset,
    }),
    [steps, status, finished, hasRun, runningNode, handleEvent, complete, reset],
  );
}
