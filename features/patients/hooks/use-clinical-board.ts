"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchClinicalBoard } from "../services/patients-service";
import type {
  ClinicalBoardItem,
  ClinicalBoardFilters,
  PaginatedResult,
} from "../types";

const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_FILTERS: ClinicalBoardFilters = {
  search: "",
  risk: "all",
  alerts: "all",
  followUp: "all",
};

/**
 * Tablero clínico paginado con filtros server-side (riesgo, alertas y
 * seguimiento) y búsqueda con debounce. El alcance lo resuelve el backend
 * desde el JWT: aquí no se filtra por profesional.
 */
export function useClinicalBoard(pageSize = 10) {
  const [result, setResult] =
    useState<PaginatedResult<ClinicalBoardItem> | null>(null);
  const [filters, setFiltersState] =
    useState<ClinicalBoardFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(filters.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchClinicalBoard(
      page,
      pageSize,
      { ...filters, search: debouncedSearch },
      controller.signal,
    )
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Ocurrió un error inesperado.",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters, page, pageSize, debouncedSearch, reloadKey]);

  const setFilters = useCallback((partial: Partial<ClinicalBoardFilters>) => {
    setFiltersState((current) => ({ ...current, ...partial }));
    setPageState(1);
    setLoading(true);
    setError(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPageState(1);
    setLoading(true);
    setError(null);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  return {
    result,
    filters,
    page,
    loading,
    error,
    setFilters,
    clearFilters,
    setPage,
    retry,
  };
}
