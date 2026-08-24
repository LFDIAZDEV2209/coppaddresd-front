"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  RoutineAssignment,
  CreateRoutineAssignmentInput,
  UpdateRoutineAssignmentInput,
  PaginatedResult,
} from "../types";
import {
  fetchRoutineAssignments,
  getRoutineAssignment,
  createRoutineAssignment,
  updateRoutineAssignment,
  deleteRoutineAssignment,
} from "../services/assignments-service";

interface UseRoutineAssignmentsReturn {
  result: PaginatedResult<RoutineAssignment> | null;
  loading: boolean;
  actionLoading: boolean;
  filters: { search: string; status: string };
  error: string | null;
  setFilters: (filters: Partial<{ search: string; status: string }>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getAssignment: (id: string) => Promise<RoutineAssignment | null>;
  save: (
    input: CreateRoutineAssignmentInput | UpdateRoutineAssignmentInput,
    id?: string,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  retry: () => void;
}

export function useRoutineAssignments(
  initialPage = 1,
  initialPageSize = 10,
): UseRoutineAssignmentsReturn {
  const [result, setResult] =
    useState<PaginatedResult<RoutineAssignment> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState({
    search: "",
    status: "all",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoutineAssignments(page, pageSize, filters);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar asignaciones.",
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

  const setFilters = useCallback(
    (partial: Partial<{ search: string; status: string }>) => {
      setFiltersState((prev) => ({ ...prev, ...partial }));
      setPageState(1);
    },
    [],
  );

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const getAssignment = useCallback(async (id: string) => {
    try {
      return await getRoutineAssignment(id);
    } catch {
      return null;
    }
  }, []);

  const save = useCallback(
    async (
      input: CreateRoutineAssignmentInput | UpdateRoutineAssignmentInput,
      id?: string,
    ) => {
      setActionLoading(true);
      try {
        if (id)
          await updateRoutineAssignment(
            id,
            input as UpdateRoutineAssignmentInput,
          );
        else
          await createRoutineAssignment(
            input as CreateRoutineAssignmentInput,
          );
        setPageState(1);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const remove = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        await deleteRoutineAssignment(id);
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
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    getAssignment,
    save,
    remove,
    retry,
  };
}
