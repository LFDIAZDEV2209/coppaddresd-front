"use client";

import { useState, useCallback, useEffect } from "react";
import type { DashboardAnalyticsDto } from "../types";
import {
  fetchAdminAnalytics,
  fetchMyAnalytics,
} from "../services/appointments-service";

interface UseDashboardAnalyticsReturn {
  analytics: DashboardAnalyticsDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Carga el payload completo del dashboard de Citas (KPIs, serie temporal,
 * distribuciones, actividad por profesional y próximas citas). Con
 * <c>scope = "admin"</c> usa la vista global; con <c>"me"</c> la del profesional
 * autenticado por identidad del JWT. Sin rango: el backend usa los últimos 30 días.
 */
export function useDashboardAnalytics(
  scope: "admin" | "me",
  from?: Date | null,
  to?: Date | null,
  enabled = true,
): UseDashboardAnalyticsReturn {
  const [analytics, setAnalytics] = useState<DashboardAnalyticsDto | null>(
    null,
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Claves por valor (ver use-agenda): depender de la identidad de los Date
  // re-dispara el fetch en bucle si el caller crea instancias por render.
  const fromISO = from?.toISOString() ?? null;
  const toISO = to?.toISOString() ?? null;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const result =
          scope === "admin"
            ? await fetchAdminAnalytics({ from: fromISO, to: toISO })
            : await fetchMyAnalytics({ from: fromISO, to: toISO });
        if (!active) return;
        setAnalytics(result);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las estadísticas de citas.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [scope, fromISO, toISO, refreshKey, enabled]);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { analytics, loading, error, refetch };
}
