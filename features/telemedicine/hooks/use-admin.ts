"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  AdminSummaryDto,
  TelemedicineAppointmentDto,
  TelemedicineRequestDto,
  TelemedicineSessionDto,
} from "../types";
import {
  fetchAdminAppointments,
  fetchAdminRequests,
  fetchAdminSessions,
  fetchAdminSummary,
  fetchMyAppointments,
  fetchMySummary,
  type AdminAppointmentsFilters,
  type MyAppointmentsFilters,
} from "../services/telemedicine-service";

interface UseAdminSummaryReturn {
  summary: AdminSummaryDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Resumen operativo de telemedicina: global (admin) o del profesional
 * autenticado según el fetcher (mismo shape de datos, distinto origen).
 */
function useSummaryFetcher(
  fetcher: () => Promise<AdminSummaryDto>,
): UseAdminSummaryReturn {
  const [summary, setSummary] = useState<AdminSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetcher();
        if (!active) return;
        setSummary(result);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las métricas de telemedicina.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetcher, refreshKey]);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { summary, loading, error, refetch };
}

export function useAdminSummary(): UseAdminSummaryReturn {
  return useSummaryFetcher(fetchAdminSummary);
}

export function useMySummary(): UseAdminSummaryReturn {
  return useSummaryFetcher(fetchMySummary);
}

/**
 * Resumen operativo según el alcance de la vista de citas: admin → global,
 * profesional → solo sus datos (KPIs acotados por identidad del JWT).
 */
export function useScopedSummary(
  scope: "admin" | "professional",
): UseAdminSummaryReturn {
  return useSummaryFetcher(
    scope === "professional" ? fetchMySummary : fetchAdminSummary,
  );
}

interface UseAdminListReturn<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useAdminList<T>(
  loader: (
    page: number,
    pageSize: number,
  ) => Promise<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>,
  deps: unknown[] = [],
): UseAdminListReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await loader(page, pageSize);
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar los datos.");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, refreshKey, ...deps]);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    setPage,
    refetch,
  };
}

export function useAdminAppointments(
  filters: AdminAppointmentsFilters = {},
): UseAdminListReturn<TelemedicineAppointmentDto> {
  const filterDeps = [
    filters.professionalId,
    filters.patientId,
    filters.clinicId,
    filters.locationId,
    filters.status,
    filters.from,
    filters.to,
  ];
  const loader = useCallback(
    (page: number, pageSize: number) =>
      fetchAdminAppointments({ ...filters, page, pageSize }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters.professionalId,
      filters.patientId,
      filters.clinicId,
      filters.locationId,
      filters.status,
      filters.from,
      filters.to,
    ],
  );
  return useAdminList(loader, filterDeps);
}

/**
 * Listado de citas según el alcance de la vista: admin → listado global con
 * filtros; profesional → solo sus citas (alcance por identidad del JWT en el
 * backend). Mismo shape y paginación para que la UI sea idéntica.
 */
export function useScopedAppointments(
  scope: "admin" | "professional",
  filters: AdminAppointmentsFilters = {},
): UseAdminListReturn<TelemedicineAppointmentDto> {
  const loader = useCallback(
    (page: number, pageSize: number) => {
      const base = { page, pageSize };
      if (scope === "professional") {
        const scoped: MyAppointmentsFilters = {
          patientId: filters.patientId,
          locationId: filters.locationId,
          status: filters.status,
          from: filters.from,
          to: filters.to,
        };
        return fetchMyAppointments({ ...scoped, ...base });
      }
      return fetchAdminAppointments({ ...filters, ...base });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      scope,
      filters.professionalId,
      filters.patientId,
      filters.clinicId,
      filters.locationId,
      filters.status,
      filters.from,
      filters.to,
    ],
  );
  return useAdminList(loader, [
    scope,
    filters.professionalId,
    filters.patientId,
    filters.clinicId,
    filters.locationId,
    filters.status,
    filters.from,
    filters.to,
  ]);
}

export function useAdminRequests(): UseAdminListReturn<TelemedicineRequestDto> {
  return useAdminList((page, pageSize) =>
    fetchAdminRequests({ page, pageSize }),
  );
}

export function useAdminSessions(): UseAdminListReturn<TelemedicineSessionDto> {
  return useAdminList((page, pageSize) =>
    fetchAdminSessions({ page, pageSize }),
  );
}
