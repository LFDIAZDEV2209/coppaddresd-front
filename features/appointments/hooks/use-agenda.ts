"use client";

import { useState, useCallback, useEffect } from "react";
import type { AppointmentDto } from "../types";
import { fetchAgenda } from "../services/appointments-service";

interface UseAgendaReturn {
  appointments: AppointmentDto[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Agenda del profesional en un rango [from, to] (dashboard "Mi agenda" y
 * calendario). Los ids de rango se normalizan a ISO-8601 UTC para la API.
 */
export function useAgenda(
  professionalId: string | null,
  from: Date,
  to: Date,
): UseAgendaReturn {
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Claves por valor: los callers pueden pasar instancias Date nuevas en cada
  // render (p. ej. `anchor ?? new Date()`); depender de la identidad del
  // objeto re-dispara el fetch en bucle. El ISO string compara por valor.
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  useEffect(() => {
    if (!professionalId) {
      return;
    }

    let active = true;
    (async () => {
      try {
        const result = await fetchAgenda(professionalId, fromISO, toISO);
        if (!active) return;
        setAppointments(result);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las citas de la agenda.");
        setAppointments([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [professionalId, fromISO, toISO, refreshKey]);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { appointments, loading, error, refetch };
}
