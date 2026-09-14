"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPatientDashboard } from "../services/patients-service";
import type { PatientDashboard } from "../types";

interface DashboardState {
  key: string;
  data: PatientDashboard | null;
  error: string | null;
}

/**
 * Agregados del dashboard de pacientes (scoped por el backend). El estado
 * seleccionado en el mapa entra como `stateCode` y recalcula demografía,
 * crecimiento y top de profesionales; el rango 6/12 m solo afecta la serie.
 *
 * `loading` es derivado: true mientras la última respuesta cargada no
 * corresponde a la clave actual (sin setState síncrono en el efecto). Los
 * datos previos se conservan mientras llega la nueva respuesta.
 */
export function usePatientDashboard(stateCode: string | null) {
  const [months, setMonthsState] = useState<6 | 12>(12);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<DashboardState>({
    key: "",
    data: null,
    error: null,
  });

  const key = `${stateCode ?? "all"}|${months}|${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void fetchPatientDashboard(stateCode, months, controller.signal)
      .then((result) => {
        if (!cancelled) setState({ key, data: result, error: null });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof Error && cause.name === "AbortError") return;
        setState({
          key,
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Ocurrió un error inesperado.",
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [stateCode, months, reloadKey, key]);

  const loading = state.key !== key;
  const data = state.data;
  const error = loading ? null : state.error;

  const setMonths = useCallback((next: 6 | 12) => {
    setMonthsState(next);
  }, []);

  const retry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  return { data, loading, error, months, setMonths, retry };
}
