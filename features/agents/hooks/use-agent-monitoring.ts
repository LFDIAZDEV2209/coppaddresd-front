"use client";

import { useState, useCallback, useEffect } from "react";
import type { AgentExecutionSummary, AgentExecutionsFilters, ExecutionStatus } from "../types";
import { fetchExecutions } from "../services/agents-service";

/** Filtros libres de la UI (la validación de valores ocurre en el fetch). */
export interface MonitoringFilters {
  status?: string;
  userId?: string;
  limit?: number;
}

interface UseAgentMonitoringReturn {
  executions: AgentExecutionSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: MonitoringFilters;
  setFilters: (filters: Partial<MonitoringFilters>) => void;
  refetch: () => void;
}

export function useAgentMonitoring(
  agentTypeId?: string,
  initialLimit = 25,
): UseAgentMonitoringReturn {
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<MonitoringFilters>({
    limit: initialLimit,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const apiFilters: AgentExecutionsFilters = {
          agentTypeId: agentTypeId,
          userId: filters.userId || undefined,
          status: (filters.status as ExecutionStatus | "") || undefined,
          limit: filters.limit,
        };
        const result = await fetchExecutions(apiFilters);
        if (!active) return;
        setExecutions(result.items);
        setTotal(result.total);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las ejecuciones.");
        setExecutions([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filters, agentTypeId, refreshKey]);

  const setFilters = useCallback((partial: Partial<MonitoringFilters>) => {
    setFiltersState((current) => ({ ...current, ...partial }));
    setLoading(true);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { executions, total, loading, error, filters, setFilters, refetch };
}
