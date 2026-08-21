"use client";

import { useState, useCallback, useEffect } from "react";
import type { TelemedicineAlertDto } from "../types";
import {
  fetchAlerts,
  fetchAlertsSummary,
  markAlertRead,
  markAllAlertsRead,
} from "../services/telemedicine-service";

interface UseAlertsReturn {
  alerts: TelemedicineAlertDto[];
  unread: number;
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  handleRead: (id: string) => Promise<void>;
  handleReadAll: () => Promise<void>;
}

export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<TelemedicineAlertDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [list, summary] = await Promise.all([
          fetchAlerts({ page, pageSize: 20 }),
          fetchAlertsSummary(),
        ]);
        if (!active) return;
        setAlerts(list.items);
        setTotal(list.total);
        setUnread(summary.unread);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las alertas.");
        setAlerts([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, refreshKey]);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const handleRead = useCallback(async (id: string) => {
    await markAlertRead(id);
    setRefreshKey((key) => key + 1);
  }, []);

  const handleReadAll = useCallback(async () => {
    await markAllAlertsRead();
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    alerts,
    unread,
    total,
    loading,
    error,
    page,
    setPage,
    refetch,
    handleRead,
    handleReadAll,
  };
}
