"use client";

import { CalendarClock, CalendarX } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRange } from "../../utils/format";
import type { AppointmentDto } from "../../types";

/**
 * Diálogos de cancelación y reprogramación de una cita. La UI es la misma
 * que la histórica de la Agenda; ahora es compartida con el Calendario. El
 * estado y los handlers vienen de `useAppointmentActions`.
 */
export function AppointmentActionDialogs({
  cancelling,
  cancelReason,
  onCancelReasonChange,
  rescheduling,
  newStart,
  onNewStartChange,
  busy,
  actionError,
  onClose,
  onConfirmCancel,
  onConfirmReschedule,
}: {
  cancelling: AppointmentDto | null;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  rescheduling: AppointmentDto | null;
  newStart: string;
  onNewStartChange: (value: string) => void;
  busy: boolean;
  actionError: string | null;
  onClose: () => void;
  onConfirmCancel: () => void;
  onConfirmReschedule: () => void;
}) {
  const t = useT();
  return (
    <>
      {/* Cancelación */}
      <Dialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <CalendarX className="size-4" />
              </span>
              {t("Cancelar cita")}
            </DialogTitle>
            <DialogDescription>
              {t("¿Seguro que querés cancelar la cita del")}{" "}
              {cancelling
                ? formatRange(
                    cancelling.scheduledStart,
                    cancelling.scheduledEnd,
                  )
                : ""}
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-reason">{t("Motivo (opcional)")}</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => onCancelReasonChange(e.target.value)}
              placeholder={t("Motivo de la cancelación")}
            />
          </div>
          {actionError && cancelling && (
            <p
              className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t("Volver")}
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmCancel}
              disabled={busy}
            >
              {busy ? t("Cancelando...") : t("Cancelar cita")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprogramación */}
      <Dialog
        open={rescheduling !== null}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CalendarClock className="size-4" />
              </span>
              {t("Reprogramar cita")}
            </DialogTitle>
            <DialogDescription>
              {t("Elegí el nuevo horario para la cita.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-start">{t("Nuevo inicio")}</Label>
            <Input
              id="reschedule-start"
              type="datetime-local"
              value={newStart}
              onChange={(e) => onNewStartChange(e.target.value)}
            />
          </div>
          {actionError && rescheduling && (
            <p
              className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t("Volver")}
            </Button>
            <Button onClick={onConfirmReschedule} disabled={busy || !newStart}>
              {busy ? t("Reprogramando...") : t("Reprogramar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
