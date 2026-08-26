"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppointmentRequestDto } from "../types";
import { useAdminList } from "./use-admin";
import {
  fetchAdminRequests,
  fetchMyAssignedRequests,
} from "../services/appointments-service";

export interface RequestCounts {
  converted: number;
  rejected: number;
  cancelled: number;
}

/**
 * Bandeja de solicitudes segÃºn el alcance de la vista: admin â†’ listado global;
 * profesional â†’ solo las solicitudes que los pacientes enviaron a su agenda
 * (alcance por identidad del JWT en /me/requests, nunca por un id del cliente).
 * Devuelve la lista paginada con filtro por estado y los conteos por estado
 * (consultas ligeras pageSize=1) para las stats cards.
 */
export function useRequestsInbox(options: {
  scope: "admin" | "professional";
  professionalId?: string | null;
  status?: string;
}) {
  const { scope, status } = options;
  const professional = scope === "professional";

  const loader = useCallback(
    (page: number, pageSize: number) =>
      professional
        ? fetchMyAssignedRequests({
            status: status || undefined,
            page,
            pageSize,
          })
        : fetchAdminRequests({ status: status || undefined, page, pageSize }),
    [professional, status],
  );

  const list = useAdminList<AppointmentRequestDto>(loader, [
    professional,
    status,
  ]);

  const [counts, setCounts] = useState<RequestCounts>({
    converted: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [countsKey, setCountsKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const fetcher = professional
        ? fetchMyAssignedRequests
        : fetchAdminRequests;
      try {
        const [converted, rejected, cancelled] = await Promise.all([
          fetcher({ status: "Converted", page: 1, pageSize: 1 }),
          fetcher({ status: "Rejected", page: 1, pageSize: 1 }),
          fetcher({ status: "Cancelled", page: 1, pageSize: 1 }),
        ]);
        if (!active) return;
        setCounts({
          converted: converted.total,
          rejected: rejected.total,
          cancelled: cancelled.total,
        });
      } catch {
        if (!active) return;
        setCounts({ converted: 0, rejected: 0, cancelled: 0 });
      }
    })();
    return () => {
      active = false;
    };
  }, [professional, countsKey]);

  const refetch = useCallback(() => {
    list.refetch();
    setCountsKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.refetch]);

  return { ...list, counts, refetch };
}
