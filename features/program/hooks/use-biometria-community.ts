"use client";

import { useState, useCallback, useEffect } from "react";
import type { BiometriaCommunityDto } from "../types/erp";
import { fetchBiometriaCommunity } from "../services/program-biometria-service";

export function useBiometriaCommunity() {
  const [data, setData] = useState<BiometriaCommunityDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBiometriaCommunity();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar la biometría comunitaria.",
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
