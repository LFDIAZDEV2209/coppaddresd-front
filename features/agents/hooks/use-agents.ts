"use client";

import { useState, useCallback, useEffect } from "react";
import type { AgentType } from "../types";
import {
  fetchAgentTypes,
  createAgentType,
  updateAgentType,
  deleteAgentType,
} from "../services/agents-service";

interface UseAgentsReturn {
  agents: AgentType[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  search: string;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  refetch: () => void;
  handleCreate: (input: {
    name: string;
    description?: string | null;
    specialty?: string | null;
    iconKey?: string | null;
    status?: string | null;
    metadata?: string | null;
  }) => Promise<void>;
  handleUpdate: (
    id: string,
    input: {
      name: string;
      description?: string | null;
      specialty?: string | null;
      iconKey?: string | null;
      status?: string | null;
      metadata?: string | null;
    },
  ) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export function useAgents(initialPageSize = 8): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [search, setSearchState] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchAgentTypes(page, pageSize, search);
        if (!active) return;
        setAgents(result.data);
        setTotal(result.total);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar los agentes. Verifica la conexión con el servidor.");
        setAgents([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, pageSize, search, refreshKey]);

  const handleCreate = useCallback(
    async (input: Parameters<UseAgentsReturn["handleCreate"]>[0]) => {
      await createAgentType(input);
      setLoading(true);
      setRefreshKey((key) => key + 1);
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: string, input: Parameters<UseAgentsReturn["handleUpdate"]>[1]) => {
      await updateAgentType(id, input);
      setLoading(true);
      setRefreshKey((key) => key + 1);
    },
    [],
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteAgentType(id);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPageState(1);
    setLoading(true);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    agents,
    total,
    loading,
    error,
    page,
    pageSize,
    search,
    setPage,
    setSearch,
    refetch,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
