"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ProgramTemplate,
  ProgramTemplateListItem,
  ProgramTemplateFilters,
  CreateTemplateInput,
  UpdateTemplateInput,
  PaginatedResult,
} from "../types";
import {
  fetchProgramTemplates,
  getProgramTemplate,
  createProgramTemplate,
  updateProgramTemplate,
  publishProgramTemplate,
  archiveProgramTemplate,
  replaceWeekdayTasks,
} from "../services/program-templates-service";
import type { WeeklyDayTaskInput } from "../types";

interface UseProgramTemplatesReturn {
  result: PaginatedResult<ProgramTemplateListItem> | null;
  loading: boolean;
  actionLoading: boolean;
  filters: ProgramTemplateFilters;
  error: string | null;
  setFilters: (filters: Partial<ProgramTemplateFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getTemplate: (id: string) => Promise<ProgramTemplate | null>;
  save: (
    input: CreateTemplateInput | UpdateTemplateInput,
    id?: string,
  ) => Promise<void>;
  publish: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  saveWeekdayTasks: (id: string, tasks: WeeklyDayTaskInput[]) => Promise<void>;
  retry: () => void;
}

export function useProgramTemplates(
  initialPage = 1,
  initialPageSize = 5,
): UseProgramTemplatesReturn {
  const [result, setResult] =
    useState<PaginatedResult<ProgramTemplateListItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<ProgramTemplateFilters>({
    search: "",
    status: "all",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProgramTemplates(page, pageSize, filters);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar plantillas del programa.",
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

  const setFilters = useCallback((partial: Partial<ProgramTemplateFilters>) => {
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

  const getTemplate = useCallback(async (id: string) => {
    try {
      return await getProgramTemplate(id);
    } catch {
      return null;
    }
  }, []);

  const save = useCallback(
    async (
      input: CreateTemplateInput | UpdateTemplateInput,
      id?: string,
    ) => {
      setActionLoading(true);
      try {
        if (id) await updateProgramTemplate(id, input as UpdateTemplateInput);
        else await createProgramTemplate(input as CreateTemplateInput);
        setPageState(1);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const publish = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        await publishProgramTemplate(id);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const archive = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        await archiveProgramTemplate(id);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const saveWeekdayTasks = useCallback(
    async (id: string, tasks: WeeklyDayTaskInput[]) => {
      setActionLoading(true);
      try {
        await replaceWeekdayTasks(id, tasks);
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
    getTemplate,
    save,
    publish,
    archive,
    saveWeekdayTasks,
    retry,
  };
}
