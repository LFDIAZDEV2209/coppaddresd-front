"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ExerciseRoutine,
  ExerciseRoutineListItem,
  ExerciseRoutineFilters,
  CreateExerciseRoutineInput,
  UpdateExerciseRoutineInput,
  PaginatedResult,
} from "../types";
import {
  fetchExerciseRoutines,
  getExerciseRoutine,
  createExerciseRoutine,
  updateExerciseRoutine,
  deleteExerciseRoutine,
} from "../services/exercise-routines-service";

interface UseExerciseRoutinesReturn {
  result: PaginatedResult<ExerciseRoutineListItem> | null;
  loading: boolean;
  actionLoading: boolean;
  filters: ExerciseRoutineFilters;
  error: string | null;
  setFilters: (filters: Partial<ExerciseRoutineFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getRoutine: (id: string) => Promise<ExerciseRoutine | null>;
  save: (
    input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
    id?: string,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  retry: () => void;
}

export function useExerciseRoutines(
  initialPage = 1,
  initialPageSize = 10,
): UseExerciseRoutinesReturn {
  const [result, setResult] =
    useState<PaginatedResult<ExerciseRoutineListItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<ExerciseRoutineFilters>({
    search: "",
    status: "all",
    category: "all",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExerciseRoutines(page, pageSize, filters);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar rutinas de ejercicio.",
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

  const setFilters = useCallback((partial: Partial<ExerciseRoutineFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const getRoutine = useCallback(async (id: string) => {
    try {
      return await getExerciseRoutine(id);
    } catch {
      return null;
    }
  }, []);

  const save = useCallback(
    async (
      input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
      id?: string,
    ) => {
      setActionLoading(true);
      try {
        if (id) await updateExerciseRoutine(id, input as UpdateExerciseRoutineInput);
        else await createExerciseRoutine(input as CreateExerciseRoutineInput);
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
        await deleteExerciseRoutine(id);
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
    getRoutine,
    save,
    remove,
    retry,
  };
}
