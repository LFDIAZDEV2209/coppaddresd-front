"use client";

import { useState, useCallback, useEffect } from "react";
import type { PatientOverviewDto } from "../types/erp";
import { fetchPatientOverview } from "../services/program-erp-service";

export function usePatientOverview(patientId: string) {
  const [data, setData] = useState<PatientOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPatientOverview(patientId);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar el perfil del paciente.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return { data, loading, error, retry };
}
