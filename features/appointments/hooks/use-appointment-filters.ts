"use client";

import { useCallback, useMemo, useState } from "react";
import type { AppointmentStatus, AppointmentDto } from "../types";

/**
 * Filtros compartidos entre Calendario y Agenda: estados (multi-selección,
 * null = todos) + búsqueda por nombre de paciente (case-insensitive).
 * Los KPIs de la toolbar se calculan del arreglo completo; `filtered` aplica
 * los filtros activos. Ambas vistas consumen el mismo estado para que los
 * chips de resumen de la Agenda y los chips de la toolbar del Calendario
 * manipulen exactamente lo mismo.
 */
export function useAppointmentFilters(appointments: AppointmentDto[]) {
  const [statuses, setStatuses] = useState<AppointmentStatus[] | null>(null);
  const [query, setQuery] = useState("");

  const countsByStatus = useMemo(() => {
    const map = new Map<AppointmentStatus, number>();
    for (const appointment of appointments) {
      map.set(appointment.status, (map.get(appointment.status) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (statuses === null && !normalizedQuery) return appointments;
    return appointments.filter((appointment) => {
      if (statuses !== null && !statuses.includes(appointment.status)) {
        return false;
      }
      if (normalizedQuery) {
        const name = (appointment.patientName ?? "").toLowerCase();
        if (!name.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [appointments, statuses, normalizedQuery]);

  const activeCount =
    (statuses === null ? 0 : statuses.length) + (normalizedQuery ? 1 : 0);

  const toggleStatus = useCallback((status: AppointmentStatus) => {
    setStatuses((current) => {
      if (current === null) return [status];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return next.length === 0 ? null : next;
    });
  }, []);

  const clear = useCallback(() => {
    setStatuses(null);
    setQuery("");
  }, []);

  return {
    statuses,
    toggleStatus,
    setStatuses,
    query,
    setQuery,
    clear,
    activeCount,
    filtered,
    countsByStatus,
  };
}
