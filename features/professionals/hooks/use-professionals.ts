"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppContext } from "@/providers/context-provider";
import {
  fetchOrganizationTree,
  type OrganizationTree,
} from "../services/employees-service";
import {
  fetchSpecialties,
  type SpecialtyDto,
} from "../services/professional-catalogs-service";
import {
  fetchEmployeeStats,
  fetchEmployees,
  type EmployeeListItem,
  type EmployeeStats,
  type PaginatedEmployees,
} from "../services/employees-service";

/** Debounce de la búsqueda: los keystrokes no disparan una petición cada uno. */
const SEARCH_DEBOUNCE_MS = 300;

export interface ProfessionalFilters {
  search: string;
  status: string;
  specialtyId: string;
  clinicId: string;
}

/**
 * Estado del directorio de profesionales. Una sola ruta de carga (efecto
 * declarativo sobre filtros/página) con AbortController; las stats se
 * cargan una vez y se refrescan con `retry` tras mutaciones (invitar).
 */
export function useProfessionals(pageSize = 10) {
  const { can } = useAppContext();
  const [result, setResult] = useState<PaginatedEmployees | null>(null);
  const requestVersion = useRef(0);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [filters, setFiltersState] = useState<ProfessionalFilters>({
    search: "",
    status: "all",
    specialtyId: "all",
    clinicId: "all",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationTree[]>([]);

  // Configuración crítica: la gestión de catálogos requiere System.AdminSettings.
  const canManageCatalogs = can("System.AdminSettings");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(filters.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Stats: una sola carga al montar (el alcance lo resuelve el backend).
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchEmployeeStats(controller.signal)
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setStatsError(null);
        }
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

  // Catálogos de los filtros (especialidades, árbol org) — una sola carga.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void Promise.allSettled([fetchSpecialties(), fetchOrganizationTree()]).then(
      ([specialtiesResult, orgsResult]) => {
        if (cancelled) return;
        if (specialtiesResult.status === "fulfilled")
          setSpecialties(specialtiesResult.value);
        if (orgsResult.status === "fulfilled")
          setOrganizations(orgsResult.value);
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Listado: reacciona a filtros/página. Única ruta de carga (sin doble fetch).
  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    }, 0);
    void fetchEmployees(
      {
        page,
        pageSize,
        search: debouncedSearch,
        status: filters.status === "all" ? undefined : filters.status,
        specialtyId:
          filters.specialtyId === "all" ? undefined : filters.specialtyId,
        clinicId: filters.clinicId === "all" ? undefined : filters.clinicId,
      },
      controller.signal,
    )
      .then((data) => {
        if (cancelled || requestVersion.current !== version) return;
        setResult(data);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled || requestVersion.current !== version) return;
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
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, page, pageSize, debouncedSearch]);

  const setFilters = useCallback((partial: Partial<ProfessionalFilters>) => {
    setFiltersState((current) => ({ ...current, ...partial }));
    setPageState(1);
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const version = ++requestVersion.current;
    const [directory, metrics] = await Promise.allSettled([
      fetchEmployees({
        page,
        pageSize,
        search: debouncedSearch,
        status: filters.status === "all" ? undefined : filters.status,
        specialtyId:
          filters.specialtyId === "all" ? undefined : filters.specialtyId,
        clinicId: filters.clinicId === "all" ? undefined : filters.clinicId,
      }),
      fetchEmployeeStats(undefined, true),
    ]);
    if (version !== requestVersion.current) return false;
    setLoading(false);
    if (directory.status === "fulfilled") {
      setResult(directory.value);
      setError(null);
      if (directory.value.totalPages > 0 && page > directory.value.totalPages)
        setPageState(directory.value.totalPages);
    } else {
      setError(
        directory.reason instanceof Error
          ? directory.reason.message
          : "Ocurrió un error inesperado.",
      );
    }
    if (metrics.status === "fulfilled") {
      setStats(metrics.value);
      setStatsError(null);
    } else {
      setStats(null);
      setStatsError(
        metrics.reason instanceof Error
          ? metrics.reason.message
          : "Ocurrió un error inesperado.",
      );
    }
    return directory.status === "fulfilled" && metrics.status === "fulfilled";
  }, [filters, page, pageSize, debouncedSearch]);

  const clinics = organizations.flatMap((org) =>
    org.clinics.map((clinic) => ({ ...clinic, organizationName: org.name })),
  );

  return {
    result,
    stats,
    statsError,
    filters,
    specialties,
    clinics,
    loading,
    error,
    canManageCatalogs,
    setFilters,
    setPage,
    refresh,
    retry: refresh,
  };
}

export type { EmployeeListItem };
