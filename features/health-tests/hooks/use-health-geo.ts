"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchHealthGeo,
  type HealthGeoDto,
} from "../services/health-geo-service";

export function useHealthGeo() {
  const [data, setData] = useState<HealthGeoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHealthGeo(signal);
      setData(res);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Error al cargar mapa");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load syncs external fetch → state, intentional
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return { data, loading, error, reload: () => load() };
}
