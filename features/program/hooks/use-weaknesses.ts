"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  PaginatedWeaknessesResult,
  WeaknessTransitionStatus,
} from "../types/weaknesses";
import {
  fetchOpenWeaknesses,
  updateWeaknessStatus,
} from "../services/program-weaknesses-service";

interface UseWeaknessesReturn {
  result: PaginatedWeaknessesResult | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  transition: (id: string, status: WeaknessTransitionStatus) => Promise<void>;
  retry: () => void;
}

export function useWeaknesses(
  initialPage = 1,
  initialPageSize = 20,
): UseWeaknessesReturn {
  const [result, setResult] =
    useState<PaginatedWeaknessesResult | null>(null);
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
      const data = await fetchOpenWeaknesses(page, pageSize);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar debilidades abiertas.",
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

  const transition = useCallback(
    async (id: string, status: WeaknessTransitionStatus) => {
      setActionLoading(true);
      try {
        await updateWeaknessStatus(id, status);
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
    transition,
    retry,
  };
}
