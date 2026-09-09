"use client";

import { useState, useCallback, useEffect } from "react";
import type { ProgramErpCofresDto } from "../types/erp";
import { fetchErpCofres } from "../services/program-erp-service";

export function useProgramCofres(initialPage = 1, initialPageSize = 5) {
  const [data, setData] = useState<ProgramErpCofresDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<string | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchErpCofres(
        page,
        pageSize,
        search || undefined,
        sortBy,
        sortDir,
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar cofres y XP.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const setFilters = useCallback(
    (partial: Partial<{ search: string; sortBy: string; sortDir: string }>) => {
      if (partial.search !== undefined) setSearch(partial.search);
      if (partial.sortBy !== undefined) setSortBy(partial.sortBy);
      if (partial.sortDir !== undefined) setSortDir(partial.sortDir);
      setPage(1);
    },
    [],
  );

  return {
    data,
    loading,
    error,
    page,
    pageSize,
    search,
    setPage,
    setPageSize,
    setFilters,
    retry,
  };
}
