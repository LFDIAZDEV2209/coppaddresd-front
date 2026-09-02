"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  Adaptation,
  AdaptationDecisionAction,
  AdaptationStatus,
  PaginatedAdaptationsResult,
} from "../types/adaptations";
import {
  decideAdaptation,
  fetchAdaptations,
} from "../services/program-adaptations-service";

interface UseAdaptationsReturn {
  result: PaginatedAdaptationsResult | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  statusFilter: AdaptationStatus | undefined;
  setStatusFilter: (status: AdaptationStatus | "all") => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  decide: (
    id: string,
    decision: AdaptationDecisionAction,
    note?: string,
  ) => Promise<void>;
  retry: () => void;
}

export function useAdaptations(
  initialPage = 1,
  initialPageSize = 5,
): UseAdaptationsReturn {
  const [result, setResult] = useState<PaginatedAdaptationsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [statusFilter, setStatusFilterState] = useState<
    AdaptationStatus | undefined
  >("Pending");
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdaptations(page, pageSize, statusFilter);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar las recomendaciones de adaptación.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const setStatusFilter = useCallback((status: AdaptationStatus | "all") => {
    setStatusFilterState(status === "all" ? undefined : status);
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const decide = useCallback(
    async (id: string, decision: AdaptationDecisionAction, note?: string) => {
      setActionLoading(true);
      try {
        await decideAdaptation(id, decision, note);
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
    statusFilter,
    setStatusFilter,
    setPage,
    setPageSize,
    decide,
    retry,
  };
}
