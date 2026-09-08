"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "@/providers/context-provider";
import { fetchRoles } from "@/features/roles/services/roles-service";
import type { Role } from "@/features/roles/types";
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
  roleId: string;
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
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [filters, setFiltersState] = useState<ProfessionalFilters>({
    search: "",
    status: "all",
    specialtyId: "all",
    roleId: "all",
    clinicId: "all",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
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

  // Catálogos de los filtros (especialidades, roles, árbol org) — una sola carga.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void Promise.allSettled([
      fetchSpecialties(),
      fetchRoles(),
      fetchOrganizationTree(),
    ]).then(([specialtiesResult, rolesResult, orgsResult]) => {
      if (cancelled) return;
      if (specialtiesResult.status === "fulfilled")
        setSpecialties(specialtiesResult.value);
      if (rolesResult.status === "fulfilled") setRoles(rolesResult.value);
      if (orgsResult.status === "fulfilled") setOrganizations(orgsResult.value);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Listado: reacciona a filtros/página. Única ruta de carga (sin doble fetch).
  useEffect(() => {
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
        roleId: filters.roleId === "all" ? undefined : filters.roleId,
        clinicId: filters.clinicId === "all" ? undefined : filters.clinicId,
      },
      controller.signal,
    )
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setLoading(false);
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

  const refresh = useCallback(() => {
    void fetchEmployees({
      page,
      pageSize,
      search: debouncedSearch,
      status: filters.status === "all" ? undefined : filters.status,
      specialtyId:
        filters.specialtyId === "all" ? undefined : filters.specialtyId,
      roleId: filters.roleId === "all" ? undefined : filters.roleId,
      clinicId: filters.clinicId === "all" ? undefined : filters.clinicId,
    })
      .then((data) => setResult(data))
      .catch(() => undefined);
    // La stats también se refrescan (una invitación cambia "Invitados").
    void fetchEmployeeStats()
      .then((data) => {
        setStats(data);
        setStatsError(null);
      })
      .catch(() => undefined);
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
    roles,
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
