"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaginatedResult, User, UserSort, UsersFilters } from "../types";
import { fetchUsers } from "../services/users-service";

interface UseUsersReturn {
  result: PaginatedResult<User> | null;
  loading: boolean;
  filters: UsersFilters;
  sort: UserSort;
  selectedIds: Set<string>;
  error: string | null;
  setFilters: (filters: Partial<UsersFilters>) => void;
  setSort: (sort: UserSort) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  refetch: () => void;
  retry: () => void;
}

export function useUsers(
  initialPage = 1,
  initialPageSize = 10,
): UseUsersReturn {
  const [result, setResult] = useState<PaginatedResult<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<UsersFilters>({
    search: "",
    status: "all",
    role: "all",
    createdWithin: "all",
  });
  const [sort, setSortState] = useState<UserSort>({
    field: null,
    dir: "desc",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  // Guard de secuencia: cada cambio de página/filtro/sort aborta la request
  // anterior (apiFetch soporta signal externo). Las respuestas fuera de orden
  // se cancelan y nunca pisan datos más recientes; el flag `cancelled` hace lo
  // mismo para el pruneo de selectedIds.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUsers(
          page,
          pageSize,
          filters,
          sort,
          controller.signal,
        );
        if (cancelled) return;
        setResult(data);
        // Pruneo de selecciones que ya no existen en la página actual.
        setSelectedIds((prev) => {
          const ids = new Set(data.data.map((user) => user.id));
          const next = new Set(prev);
          for (const id of next) {
            if (!ids.has(id)) next.delete(id);
          }
          return next;
        });
      } catch (err) {
        if (cancelled) return; // abortada por filtro/página nueva o unmount
        setError(
          err instanceof Error ? err.message : "Error al cargar usuarios.",
        );
        setResult(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, filters, sort, reloadKey]);

  const setFilters = useCallback((partial: Partial<UsersFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
    setPageState(1);
    setSelectedIds(new Set());
  }, []);

  const setSort = useCallback((next: UserSort) => {
    setSortState(next);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
    setSelectedIds(new Set());
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!result) return;
    setSelectedIds((prev) => {
      if (prev.size === result.data.length) {
        return new Set();
      }
      return new Set(result.data.map((user) => user.id));
    });
  }, [result]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    result,
    loading,
    filters,
    sort,
    selectedIds,
    error,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch,
    retry: refetch,
  };
}
