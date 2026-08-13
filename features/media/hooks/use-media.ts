"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  MediaItem,
  MediaInput,
  MediaFilters,
  PaginatedResult,
} from "../types";
import {
  fetchMediaItems,
  createMediaItem,
  updateMediaItem,
  deleteMediaItem,
} from "../services/media-service";

interface UseMediaReturn {
  result: PaginatedResult<MediaItem> | null;
  loading: boolean;
  actionLoading: boolean;
  filters: MediaFilters;
  error: string | null;
  setFilters: (filters: Partial<MediaFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  save: (input: MediaInput, id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  retry: () => void;
}

export function useMedia(
  initialPage = 1,
  initialPageSize = 8,
): UseMediaReturn {
  const [result, setResult] = useState<PaginatedResult<MediaItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<MediaFilters>({
    search: "",
    mediaType: "all",
    status: "all",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMediaItems(page, pageSize, filters);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar medios.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const setFilters = useCallback((partial: Partial<MediaFilters>) => {
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

  const save = useCallback(
    async (input: MediaInput, id?: string) => {
      setActionLoading(true);
      try {
        if (id) await updateMediaItem(id, input);
        else await createMediaItem(input);
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
        await deleteMediaItem(id);
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
    save,
    remove,
    retry,
  };
}
