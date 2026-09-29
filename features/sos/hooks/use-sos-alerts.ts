"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  SosAlertListItemDto,
  SosAlertStatus,
  SosAlertsPage,
} from "../types";
import { attendSosAlert, fetchSosAlerts } from "../services/sos-service";

interface UseSosAlertsReturn {
  alerts: SosAlertListItemDto[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  counts: Record<SosAlertStatus, number>;
  attendingId: string | null;
  attendError: string | null;
  /** Atiende una alerta (transición terminal) y refresca listado y conteos. */
  attend: (id: string) => Promise<boolean>;
}

const PAGE_SIZE = 20;

const ALL_STATUSES: SosAlertStatus[] = ["Activa", "Atendida", "Cancelada"];

/**
 * Bandeja de alertas SOS del ERP (lado aud=erp del design D8).
 *
 * La atención NO es optimista: es una transición terminal protegida por el
 * backend (REQ-SOS-05). Tras el POST correcto se refresca listado y conteos
 * para reflejar el estado real. Los errores de attend NUNCA revelan si la
 * alerta existe (anti-IDOR): se muestra un mensaje genérico.
 */
export function useSosAlerts(options: {
  status: SosAlertStatus | null;
}): UseSosAlertsReturn {
  const { status } = options;
  const [alerts, setAlerts] = useState<SosAlertListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState<Record<SosAlertStatus, number>>({
    Activa: 0,
    Atendida: 0,
    Cancelada: 0,
  });
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [attendError, setAttendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result: SosAlertsPage = await fetchSosAlerts({
          status,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!active) return;
        setAlerts(result.data);
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages));
        setError(null);
      } catch {
        if (!active) return;
        setAlerts([]);
        setTotal(0);
        setTotalPages(1);
        setError("No se pudieron cargar las alertas SOS.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, refreshKey, status]);

  // Conteos ligeros por estado (pageSize=1) para chips y stat cards: el mismo
  // patrón que usa la bandeja de solicitudes de Citas (use-requests-inbox).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const results = await Promise.all(
          ALL_STATUSES.map((value) =>
            fetchSosAlerts({ status: value, page: 1, pageSize: 1 }),
          ),
        );
        if (!active) return;
        setCounts({
          Activa: results[0].total,
          Atendida: results[1].total,
          Cancelada: results[2].total,
        });
      } catch {
        if (!active) return;
        setCounts({ Activa: 0, Atendida: 0, Cancelada: 0 });
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const attend = useCallback(async (id: string) => {
    setAttendingId(id);
    setAttendError(null);
    try {
      await attendSosAlert(id);
      setRefreshKey((key) => key + 1);
      return true;
    } catch {
      // Mensaje genérico sin filtrar 404 vs 403 (anti-IDOR, REQ-SOS-05).
      setAttendError(
        "No se pudo atender la alerta. Verificá que siga activa y que tu alcance clínico cubra al paciente.",
      );
      return false;
    } finally {
      setAttendingId(null);
    }
  }, []);

  return {
    alerts,
    total,
    totalPages,
    loading,
    error,
    page,
    setPage,
    refetch,
    counts,
    attendingId,
    attendError,
    attend,
  };
}
