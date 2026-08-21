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
} from "../services/telemedicine-service";

interface UseAdminSummaryReturn {
  summary: AdminSummaryDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminSummary(): UseAdminSummaryReturn {
  const [summary, setSummary] = useState<AdminSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchAdminSummary();
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
  }, [refreshKey]);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { summary, loading, error, refetch };
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
  loader: (page: number, pageSize: number) => Promise<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>,
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
  }, [page, pageSize, refreshKey]);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { items, total, page, pageSize, totalPages, loading, error, setPage, refetch };
}

export function useAdminAppointments(): UseAdminListReturn<TelemedicineAppointmentDto> {
  return useAdminList((page, pageSize) => fetchAdminAppointments({ page, pageSize }));
}

export function useAdminRequests(): UseAdminListReturn<TelemedicineRequestDto> {
  return useAdminList((page, pageSize) => fetchAdminRequests({ page, pageSize }));
}

export function useAdminSessions(): UseAdminListReturn<TelemedicineSessionDto> {
  return useAdminList((page, pageSize) => fetchAdminSessions({ page, pageSize }));
}
