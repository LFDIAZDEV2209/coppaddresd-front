"use client";

import { useState, useCallback, useEffect } from "react";
import type { ProgramSnapshot } from "../types";
import { fetchEnrollmentSnapshot } from "../services/program-enrollments-service";

export function useEnrollmentSnapshot(enrollmentId: string | null) {
  const [data, setData] = useState<ProgramSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    if (!enrollmentId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEnrollmentSnapshot(enrollmentId);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar el snapshot de gamificación.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { data, loading, error, retry };
}
