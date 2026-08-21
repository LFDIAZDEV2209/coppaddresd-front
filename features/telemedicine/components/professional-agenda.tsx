"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Video,
  X,
  CalendarClock,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "../services/telemedicine-service";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatRange,
} from "../utils/format";
import type { TelemedicineAppointmentDto } from "../types";

type Range = "day" | "week" | "month";

export function ProfessionalAgenda() {
  const router = useRouter();
  const { context, loading: userLoading } = useCurrentUser();

  const [range, setRange] = useState<Range>("week");
  const { from, to } = rangeBounds(range);
  const professionalId = context?.professional?.id ?? null;
  const { appointments, loading, error, refetch } = useAgenda(professionalId, from, to);

  const [cancelling, setCancelling] = useState<TelemedicineAppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduling, setRescheduling] = useState<TelemedicineAppointmentDto | null>(null);
  const [newStart, setNewStart] = useState("");
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

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    setActionError(null);
    try {
      await cancelAppointment(cancelling.id, {
        reason: cancelReason.trim() || "Cancelada por el profesional",
        cancelledBy: "Professional",
      });
      setCancelling(null);
      setCancelReason("");
      refetch();
    } catch {
      setActionError("No se pudo cancelar la cita. Revisa que el estado lo permita.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduling || !newStart) return;
    setBusy(true);
    setActionError(null);
    try {
      await rescheduleAppointment(rescheduling.id, {
        newStart: new Date(newStart).toISOString(),
        requestedBy: "Professional",
        reason: "Reprogramada por el profesional",
      });
      setRescheduling(null);
      setNewStart("");
      refetch();
    } catch {
      setActionError("No se pudo reprogramar la cita. Verifica el horario y la anticipación.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Mi agenda"
        description={professional ? `Citas de ${professional.fullName}` : "Agenda del profesional"}
        icon={CalendarDays}
      />

      {!professional ? (
        <EmptyState
          icon={Stethoscope}
          title="El usuario no es un profesional clínico"
          description="La agenda de Telemedicina requiere una asignación clínica en el ERP."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <RangeToggle value={range} onChange={setRange} />
            <span className="text-[12px] text-muted-foreground">
              {appointments.length} cita{appointments.length === 1 ? "" : "s"} en el rango
            </span>
          </div>

          {actionError && (
            <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} />
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin citas en el rango"
              description="No hay citas programadas para este período."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {appointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  onOpen={() => router.push(`/telemedicine/citas/${appointment.id}`)}
                  onJoin={() => router.push(`/telemedicine/sala/${appointment.id}`)}
                  onCancel={() => setCancelling(appointment)}
                  onReschedule={() => setRescheduling(appointment)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Cancelación */}
      <Dialog open={cancelling !== null} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar cita</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés cancelar la cita del {cancelling ? formatRange(cancelling.scheduledStart, cancelling.scheduledEnd) : ""}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de la cancelación"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={busy}>
              Volver
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={busy}>
              {busy ? "Cancelando..." : "Cancelar cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprogramación */}
      <Dialog open={rescheduling !== null} onOpenChange={(open) => !open && setRescheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
            <DialogDescription>
              Elegí el nuevo horario para la cita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-start">Nuevo inicio</Label>
            <Input
              id="reschedule-start"
              type="datetime-local"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(null)} disabled={busy}>
              Volver
            </Button>
            <Button onClick={confirmReschedule} disabled={busy || !newStart}>
              {busy ? "Reprogramando..." : "Reprogramar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AppointmentRow({
  appointment,
  onOpen,
  onJoin,
  onCancel,
  onReschedule,
}: {
  appointment: TelemedicineAppointmentDto;
  onOpen: () => void;
  onJoin: () => void;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const cancellable =
    appointment.status === "Confirmed" || appointment.status === "Requested";
  const reschedulable = appointment.status === "Confirmed";
  const joinable =
    appointment.status === "Confirmed" || appointment.status === "InProgress";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Video className="size-4.5 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[13.5px] font-semibold text-foreground">
            {appointment.patientName ?? "Paciente"}
          </span>
          <span className="truncate text-[12px] text-muted-foreground">
            {appointment.specialtyName ?? "Especialidad"} ·{" "}
            {appointment.locationName ?? "Sede"} · {formatRange(appointment.scheduledStart, appointment.scheduledEnd)}
          </span>
          {appointment.cancellationReason && (
            <span className="truncate text-[11.5px] text-muted-foreground/70">
              Motivo: {appointment.cancellationReason}
            </span>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge
          status={appointmentStatusLabel[appointment.status]}
          color={appointmentStatusColor(appointment.status)}
        />
        <Button size="sm" variant="outline" onClick={onOpen} className="gap-1.5">
          <ClipboardList className="size-3.5" /> Detalle
        </Button>
        {joinable && (
          <Button size="sm" onClick={onJoin} className="gap-1.5">
            <Video className="size-3.5" /> Unirme
          </Button>
        )}
        {reschedulable && (
          <Button size="sm" variant="ghost" onClick={onReschedule} aria-label="Reprogramar">
            <CalendarClock className="size-4" />
          </Button>
        )}
        {cancellable && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={onCancel}
            aria-label="Cancelar"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const options: Array<{ key: Range; label: string }> = [
    { key: "day", label: "Hoy" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={
            value === option.key
              ? "rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
              : "rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function rangeBounds(range: Range): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (range === "day") to.setDate(to.getDate() + 1);
  if (range === "week") to.setDate(to.getDate() + 7);
  if (range === "month") to.setMonth(to.getMonth() + 1);
  return { from, to };
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[12.5px] text-muted-foreground">{description}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}
