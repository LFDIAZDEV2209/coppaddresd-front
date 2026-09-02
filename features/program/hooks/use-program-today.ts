"use client";

import { useState, useCallback, useEffect } from "react";
import type { ProgramErpTodayDto } from "../types/erp";
import { fetchErpToday } from "../services/program-erp-service";

export function useProgramToday() {
  const [data, setData] = useState<ProgramErpTodayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchErpToday();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar la actividad de hoy.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { data, loading, error, retry };
}
