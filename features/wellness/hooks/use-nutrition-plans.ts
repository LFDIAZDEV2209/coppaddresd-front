"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  NutritionPlan,
  NutritionPlanListItem,
  NutritionPlanFilters,
  CreateNutritionPlanInput,
  UpdateNutritionPlanInput,
  PaginatedResult,
} from "../types";
import {
  fetchNutritionPlans,
  getNutritionPlan,
  createNutritionPlan,
  updateNutritionPlan,
  deleteNutritionPlan,
} from "../services/nutrition-plans-service";
import { notifyAssignmentsRefresh } from "./assignments-refresh";

interface UseNutritionPlansReturn {
  result: PaginatedResult<NutritionPlanListItem> | null;
  loading: boolean;
  actionLoading: boolean;
  filters: NutritionPlanFilters;
  error: string | null;
  setFilters: (filters: Partial<NutritionPlanFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getPlan: (id: string) => Promise<NutritionPlan | null>;
  save: (
    input: CreateNutritionPlanInput | UpdateNutritionPlanInput,
    id?: string,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  retry: () => void;
}

export function useNutritionPlans(
  initialPage = 1,
  initialPageSize = 10,
): UseNutritionPlansReturn {
  const [result, setResult] =
    useState<PaginatedResult<NutritionPlanListItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<NutritionPlanFilters>({
    search: "",
    isTemplate: "all",
    status: "all",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNutritionPlans(page, pageSize, filters);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar planes de alimentación.",
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

  const setFilters = useCallback((partial: Partial<NutritionPlanFilters>) => {
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

  const getPlan = useCallback(async (id: string) => {
    try {
      return await getNutritionPlan(id);
    } catch {
      return null;
    }
  }, []);

  const save = useCallback(
    async (
      input: CreateNutritionPlanInput | UpdateNutritionPlanInput,
      id?: string,
    ) => {
      setActionLoading(true);
      try {
        if (id) await updateNutritionPlan(id, input as UpdateNutritionPlanInput);
        else {
          await createNutritionPlan(input as CreateNutritionPlanInput);
          // Al crear, el backend puede generar una asignación atómica
          // (si el payload trae patientId): refrescar asignaciones unificadas.
          notifyAssignmentsRefresh();
        }
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
        await deleteNutritionPlan(id);
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
    getPlan,
    save,
    remove,
    retry,
  };
}
