"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "@/providers/context-provider";
import {
  createPatient,
  deletePatient,
  fetchInsurers,
  fetchPatientStats,
  fetchPatients,
  updatePatient,
} from "../services/patients-service";
import type {
  Insurer,
  PatientInput,
  PatientListItem,
  PatientFilters,
  PatientSortKey,
  PatientStats,
  PaginatedResult,
} from "../types";

/** Debounce de la búsqueda: los keystrokes no disparan una petición cada uno. */
const SEARCH_DEBOUNCE_MS = 300;

export function usePatients(pageSize = 10) {
  const { can } = useAppContext();
  const [result, setResult] = useState<PaginatedResult<PatientListItem> | null>(
    null,
  );
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [filters, setFiltersState] = useState<PatientFilters>({
    search: "",
    status: "all",
    insurerId: "all",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Alcance declarativo por permiso (nunca por nombre de rol): global
  // (Patients.View) vs "mis pacientes" (solo Patients.ViewOwn). Los datos
  // los scopea el backend desde el JWT; aquí solo se adapta la presentación.
  const fullScope = can("Patients.View");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(filters.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Stats scoped: se cargan con el listado y se refrescan con retry/acciones.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchPatientStats(controller.signal)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof Error && cause.name === "AbortError") return;
        setStats(null);
        setStatsError(
          cause instanceof Error
            ? cause.message
            : "Ocurrió un error inesperado.",
        );
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchInsurers(controller.signal)
      .then((items) => {
        if (!cancelled) setInsurers(items);
      })
      .catch(() => {
        if (!cancelled) setInsurers([]);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [patients, patientStats] = await Promise.all([
        fetchPatients(page, pageSize, { ...filters, search: debouncedSearch }),
        fetchPatientStats(),
      ]);
      setResult(patients);
      setStats(patientStats);
      setStatsError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchPatients(
      page,
      pageSize,
      { ...filters, search: debouncedSearch },
      controller.signal,
    )
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Ocurrió un error inesperado.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters, page, pageSize, debouncedSearch]);

  const setFilters = useCallback((partial: Partial<PatientFilters>) => {
    setFiltersState((current) => ({ ...current, ...partial }));
    setPageState(1);
    setLoading(true);
    setError(null);
  }, []);

  /** Orden por columna: misma columna → alterna asc/desc; nueva columna → asc. */
  const setSort = useCallback((key: PatientSortKey) => {
    setFiltersState((current) => ({
      ...current,
      sortBy: key,
      sortDir:
        current.sortBy === key && current.sortDir === "asc" ? "desc" : "asc",
    }));
    setPageState(1);
    setLoading(true);
    setError(null);
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
    setLoading(true);
    setError(null);
  }, []);

  const save = useCallback(
    async (input: PatientInput, id?: string) => {
      setActionLoading(true);
      try {
        if (id) await updatePatient(id, input);
        else await createPatient(input);
        await load();
      } finally {
        setActionLoading(false);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        await deletePatient(id);
        await load();
      } finally {
        setActionLoading(false);
      }
    },
    [load],
  );

  return {
    result,
    stats,
    statsError,
    filters,
    insurers,
    loading,
    error,
    actionLoading,
    fullScope,
    setFilters,
    setSort,
    setPage,
    save,
    remove,
    retry: load,
  };
}
