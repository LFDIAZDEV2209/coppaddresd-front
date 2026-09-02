"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ActivityLogEntry, PaginatedResult } from "../types";
import {
  fetchActivityLog,
  type ActivityLogFilters,
} from "../services/program-activity-log-service";

interface UseActivityLogReturn {
  result: PaginatedResult<ActivityLogEntry> | null;
  loading: boolean;
  error: string | null;
  filters: ActivityLogFilters;
  setFilters: (filters: ActivityLogFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  retry: () => void;
}

function areFiltersEqual(
  a: ActivityLogFilters,
  b: ActivityLogFilters,
): boolean {
  return (
    a.table === b.table &&
    a.action === b.action &&
    a.from === b.from &&
    a.to === b.to &&
    a.actor === b.actor
  );
}

export function useActivityLog(
  initialPage = 1,
  initialPageSize = 5,
): UseActivityLogReturn {
  const [result, setResult] =
    useState<PaginatedResult<ActivityLogEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<ActivityLogFilters>({});
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivityLog(
        page,
        pageSize,
        filters,
        controller.signal,
      );
      setResult(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar la bitácora de actividad.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const setFilters = useCallback((next: ActivityLogFilters) => {
    // Igualdad por valor: mantener la identidad evita refetches redundantes.
    setFiltersState((prev) => (areFiltersEqual(prev, next) ? prev : next));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    result,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    setPageSize,
    retry,
  };
}
