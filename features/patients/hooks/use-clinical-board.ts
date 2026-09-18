"use client";

import { useEffect, useState } from "react";
import { fetchClinicalBoard } from "../services/patients-service";
import type { ClinicalBoardFilters, ClinicalBoardResult } from "../types";

/** Espera antes de enviar la búsqueda al backend (ms). */
const SEARCH_DEBOUNCE_MS = 300;

/** Filtros del tablero clínico sin ningún criterio activo. */
export const DEFAULT_CLINICAL_BOARD_FILTERS: ClinicalBoardFilters = {
  search: "",
  risk: "all",
  alerts: "all",
  followUp: "all",
  status: "all",
  insurerId: "all",
};

/**
 * Tablero clínico paginado (vista viva, sin caché): filtros server-side,
 * búsqueda con debounce, alcance geográfico compartido con el mapa y recarga
 * manual. El resumen de tarjetas viaja en la misma respuesta del backend.
 */
export function useClinicalBoard(
  pageSize = 10,
  stateCode: string | null = null,
  initialFilters?: Partial<ClinicalBoardFilters>,
) {
  const [result, setResult] = useState<ClinicalBoardResult | null>(null);
  const [filters, setFilters] = useState<ClinicalBoardFilters>(() => ({
    ...DEFAULT_CLINICAL_BOARD_FILTERS,
    ...initialFilters,
  }));
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [previousScope, setPreviousScope] = useState(stateCode ?? "");

  // Debounce de la búsqueda: solo viaja al backend tras la pausa.
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(filters.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  // Cambio de estado geográfico (mapa): ajuste durante el render para volver
  // a la primera página sin encadenar renders desde un efecto.
  const scope = stateCode ?? "";
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setPage(1);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchClinicalBoard(
      page,
      pageSize,
      { ...filters, search: debouncedSearch },
      stateCode,
      controller.signal,
    )
      .then((data) => {
        if (!active) return;
        setResult(data);
        setLoading(false);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "Ocurrió un error inesperado.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters, page, pageSize, debouncedSearch, reloadKey, stateCode]);

  const updateFilters = (partial: Partial<ClinicalBoardFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
    setLoading(true);
    setError(null);
  };

  const clearFilters = () => {
    setFilters({ ...DEFAULT_CLINICAL_BOARD_FILTERS });
    setPage(1);
    setLoading(true);
    setError(null);
  };

  const changePage = (next: number) => {
    setPage(next);
    setLoading(true);
    setError(null);
  };

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  return {
    result,
    filters,
    page,
    loading,
    error,
    setFilters: updateFilters,
    clearFilters,
    setPage: changePage,
    retry,
  };
}
