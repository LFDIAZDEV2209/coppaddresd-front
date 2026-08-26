"use client";

import { useState, useCallback, useEffect } from "react";
import type { AppointmentAlertDto } from "../types";
import {
  fetchAlerts,
  fetchAlertsSummary,
  markAlertRead,
  markAllAlertsRead,
} from "../services/appointments-service";

interface UseAlertsReturn {
  alerts: AppointmentAlertDto[];
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

const PAGE_SIZE = 20;

/**
 * Bandeja de alertas del módulo de Citas. Las mutaciones (marcar leída /
 * marcar todas) son OPTIMISTAS: el estado local cambia al instante para dar
 * feedback inmediato y se sincroniza con el backend; si el servidor falla se
 * restaura la lista original.
 */
export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<AppointmentAlertDto[]>([]);
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
          fetchAlerts({ page, pageSize: PAGE_SIZE }),
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

  /** Marca una alerta como leída con actualización optimista local. */
  const handleRead = useCallback(
    async (id: string) => {
      const previous = alerts;
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === id && alert.readAt === null
            ? { ...alert, readAt: new Date().toISOString() }
            : alert,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
      try {
        await markAlertRead(id);
      } catch {
        // Restaura el estado anterior si el servidor rechaza la operación.
        setAlerts(previous);
        setUnread((count) => count + 1);
      }
    },
    [alerts],
  );

  /** Marca todas como leídas con actualización optimista local. */
  const handleReadAll = useCallback(async () => {
    const previous = alerts;
    const now = new Date().toISOString();
    setAlerts((current) =>
      current.map((alert) =>
        alert.readAt === null ? { ...alert, readAt: now } : alert,
      ),
    );
    setUnread(0);
    try {
      await markAllAlertsRead();
    } catch {
      setAlerts(previous);
    }
  }, [alerts]);

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
