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

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchEmployeeStats(controller.signal)
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [employees, employeeStats] = await Promise.all([
        fetchEmployees({
          page,
          pageSize,
          search: debouncedSearch,
          status: filters.status === "all" ? undefined : filters.status,
          specialtyId:
            filters.specialtyId === "all" ? undefined : filters.specialtyId,
          roleId: filters.roleId === "all" ? undefined : filters.roleId,
          clinicId: filters.clinicId === "all" ? undefined : filters.clinicId,
        }),
        fetchEmployeeStats(),
      ]);
      setResult(employees);
      setStats(employeeStats);
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

  const setFilters = useCallback((partial: Partial<ProfessionalFilters>) => {
    setFiltersState((current) => ({ ...current, ...partial }));
    setPageState(1);
    setLoading(true);
    setError(null);
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
    setLoading(true);
    setError(null);
  }, []);

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
    retry: load,
  };
}

export type { EmployeeListItem };
