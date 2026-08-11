"use client";

import { useState, useCallback } from "react";
import type {
  User,
  UsersFilters,
  PaginatedResult,
} from "../types";
import { fetchUsers } from "../services/users-service";

interface UseUsersReturn {
  result: PaginatedResult<User> | null;
  loading: boolean;
  filters: UsersFilters;
  selectedIds: Set<string>;
  setFilters: (filters: Partial<UsersFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  refetch: () => void;
}

export function useUsers(
  initialPage = 1,
  initialPageSize = 10
): UseUsersReturn {
  const [result, setResult] = useState<PaginatedResult<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<UsersFilters>({
    search: "",
    status: "all",
    role: "all",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers(page, pageSize, filters);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useState(() => {
    loadData();
  });

  const setFilters = useCallback((partial: Partial<UsersFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
    setPageState(1);
    setSelectedIds(new Set());
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
      return new Set(result.data.map((u) => u.id));
    });
  }, [result]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    result,
    loading,
    filters,
    selectedIds,
    setFilters,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch: loadData,
  };
}
