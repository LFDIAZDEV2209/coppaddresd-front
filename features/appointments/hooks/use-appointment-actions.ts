"use client";

import { useCallback, useState } from "react";
import { useT } from "@/providers/i18n-provider";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "../services/appointments-service";
import { nextBookableStart, toDateTimeLocalValue } from "../utils/format";
import type { AppointmentDto } from "../types";

/**
 * Acciones de cita compartidas por Calendario y Agenda: cancelación con
 * motivo y reprogramación con nuevo inicio. Encapsula el estado de los
 * diálogos, el indicador de ocupación y el error de la operación; el
 * refresco de datos lo dispara el dueño de la vista vía `onSuccess`.
 * `actor` define el rol que ejecuta ambas operaciones (Professional en la
 * vista propia, Admin en las vistas globales) — el backend lo persiste en
 * `cancelled_by` / `requested_by`.
 */
export function useAppointmentActions({
  actor,
  onSuccess,
}: {
  actor: "Professional" | "Admin";
  onSuccess: () => void;
}) {
  const t = useT();
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduling, setRescheduling] = useState<AppointmentDto | null>(null);
  const [newStart, setNewStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCancel = useCallback((appointment: AppointmentDto) => {
    setActionError(null);
    setCancelReason("");
    setCancelling(appointment);
  }, []);

  const openReschedule = useCallback((appointment: AppointmentDto) => {
    setActionError(null);
    // Prellenado con la hora actual de la cita; si ya no respeta la
    // anticipación mínima se propone el primer hueco agendable.
    const current = new Date(appointment.scheduledStart);
    const earliest = nextBookableStart();
    const proposed = current.getTime() < earliest.getTime() ? earliest : current;
    setNewStart(toDateTimeLocalValue(proposed));
    setRescheduling(appointment);
  }, []);

  const closeAll = useCallback(() => {
    setCancelling(null);
    setRescheduling(null);
    setCancelReason("");
    setNewStart("");
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!cancelling) return;
    setBusy(true);
    setActionError(null);
    try {
      await cancelAppointment(cancelling.id, {
        reason: cancelReason.trim() || "Cancelada por el profesional",
        cancelledBy: actor,
      });
      closeAll();
      onSuccess();
    } catch {
      setActionError(
        t("No se pudo cancelar la cita. Revisa que el estado lo permita."),
      );
    } finally {
      setBusy(false);
    }
  }, [cancelling, cancelReason, actor, closeAll, onSuccess, t]);

  const confirmReschedule = useCallback(async () => {
    if (!rescheduling || !newStart) return;

    // Guard local: evita el 409 por anticipación mínima con un mensaje claro.
    if (new Date(newStart).getTime() < nextBookableStart().getTime()) {
      setActionError(
        t("La nueva fecha debe respetar la anticipación mínima configurada."),
      );
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      await rescheduleAppointment(rescheduling.id, {
        newStart: new Date(newStart).toISOString(),
        requestedBy: actor,
        reason: "Reprogramada por el profesional",
      });
      closeAll();
      onSuccess();
    } catch {
      setActionError(
        t(
          "No se pudo reprogramar la cita. Verifica el horario y la anticipación.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }, [rescheduling, newStart, actor, closeAll, onSuccess, t]);

  return {
    cancelling,
    cancelReason,
    setCancelReason,
    rescheduling,
    newStart,
    setNewStart,
    busy,
    actionError,
    setActionError,
    openCancel,
    openReschedule,
    closeAll,
    confirmCancel,
    confirmReschedule,
  };
}
