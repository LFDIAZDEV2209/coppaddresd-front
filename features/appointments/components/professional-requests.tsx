"use client";

import { useState } from "react";
import {
  Inbox,
  CheckCircle2,
  Stethoscope,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAdminList } from "../hooks/use-admin";
import { confirmRequest, fetchAdminRequests } from "../services/appointments-service";
import {
  requestStatusColor,
  requestStatusLabel,
  formatDate,
  formatTime,
} from "../utils/format";
import type { AppointmentRequestDto } from "../types";

export function ProfessionalRequests() {
  const { context, loading: userLoading } = useCurrentUser();
  const professionalId = context?.professional?.id ?? null;

  const {
    items: requests,
    total,
    loading,
    error,
    refetch,
  } = useAdminList<AppointmentRequestDto>(
    professionalId
      ? (page, pageSize) => fetchAdminRequests({ professionalId, page, pageSize })
      : () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
  );

  const [confirming, setConfirming] = useState<AppointmentRequestDto | null>(null);
  const [scheduledStart, setScheduledStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const professional = context?.professional;

  const doConfirm = async () => {
    if (!confirming || !scheduledStart) return;
    setBusy(true);
    setActionError(null);
    try {
      await confirmRequest(confirming.id, {
        professionalId: professionalId!,
        scheduledStart: new Date(scheduledStart).toISOString(),
        locationId: confirming.locationId,
      });
      setConfirming(null);
      setScheduledStart("");
      refetch();
    } catch {
      setActionError(
        "No se pudo confirmar la solicitud. Verifica el horario (anticipación mínima) y que no se solape con otra cita.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Solicitudes"
        description={professional ? `Solicitudes asignadas a ${professional.fullName}` : "Solicitudes de citas"}
        icon={Inbox}
      />

      {!professional ? (
        <EmptyState icon={Stethoscope} title="El usuario no es un profesional clínico" />
      ) : (
        <>
          {actionError && (
            <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sin solicitudes"
              description="No hay solicitudes asignadas a tu agenda por confirmar."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {requests.map((request) => {
                const pending = request.status === "Pending";
                return (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="text-[13.5px] font-semibold text-foreground">
                        {request.patientName ?? "Paciente"}
                      </span>
                      <span className="truncate text-[12px] text-muted-foreground">
                        {request.specialtyName ?? "Especialidad"} ·{" "}
                        {request.preferredStart
                          ? `Preferida: ${formatDate(request.preferredStart)} ${formatTime(request.preferredStart)}`
                          : "Sin fecha preferida"}
                      </span>
                      {request.reason && (
                        <span className="line-clamp-2 text-[12px] text-muted-foreground/80">
                          Motivo: {request.reason}
                        </span>
                      )}
                    </div>

                    <StatusBadge
                      status={requestStatusLabel[request.status]}
                      color={requestStatusColor(request.status)}
                    />

                    {pending && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setConfirming(request)}
                      >
                        <CheckCircle2 className="size-4" />
                        Confirmar
                      </Button>
                    )}
                  </div>
                );
              })}
              {total > requests.length && (
                <p className="text-center text-[12px] text-muted-foreground">
                  Mostrando {requests.length} de {total} solicitudes
                </p>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar solicitud</DialogTitle>
            <DialogDescription>
              Asigná el horario de la cita para{" "}
              {confirming?.patientName ?? "el paciente"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-start">Inicio de la cita</Label>
            <Input
              id="confirm-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={doConfirm} disabled={busy || !scheduledStart} className="gap-1.5">
              <CalendarClock className="size-4" />
              {busy ? "Confirmando..." : "Confirmar cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-[12.5px] text-muted-foreground">{description}</p>}
    </div>
  );
}
