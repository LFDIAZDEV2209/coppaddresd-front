"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  PaginatedInterventionsResult,
  InterventionStatus,
  UpdateInterventionStatusInput,
} from "../types/interventions";
import {
  fetchOpenInterventions,
  updateInterventionStatus,
} from "../services/program-interventions-service";

interface UseInterventionsReturn {
  result: PaginatedInterventionsResult | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  updateStatus: (
    id: string,
    status: InterventionStatus,
    extra?: { result?: string; assignedTo?: string },
  ) => Promise<void>;
  retry: () => void;
}

export function useInterventions(
  initialPage = 1,
  initialPageSize = 5,
): UseInterventionsReturn {
  const [result, setResult] =
    useState<PaginatedInterventionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpenInterventions(page, pageSize);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar intervenciones.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const updateStatus = useCallback(
    async (
      id: string,
      status: InterventionStatus,
      extra?: { result?: string; assignedTo?: string },
    ) => {
      setActionLoading(true);
      try {
        const input: UpdateInterventionStatusInput = { status, ...extra };
        await updateInterventionStatus(id, input);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    result,
    loading,
    actionLoading,
    error,
    setPage,
    setPageSize,
    updateStatus,
    retry,
  };
}
