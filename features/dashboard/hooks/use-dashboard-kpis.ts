"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardKpis } from "../types";
import { fetchDashboardKpis } from "../services/dashboard-api-service";

interface UseDashboardKpisReturn {
  data: DashboardKpis | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Carga los KPIs reales del Home del ERP desde /api/v1/dashboard/kpis
 * (pacientes, tests de salud, inventario, tareas de programa y serie de
 * actividad). Sin rango explícito usa los últimos 30 días. Si el backend no
 * está disponible degrada a `data = null` + `error` sin romper la página.
 */
export function useDashboardKpis(days = 30, enabled = true): UseDashboardKpisReturn {
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const result = await fetchDashboardKpis({ days });
        if (!active) return;
        setData(result);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las estadísticas del dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [days, refreshKey, enabled]);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { data, loading, error, refetch };
}
