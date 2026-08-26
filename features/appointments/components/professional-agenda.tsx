"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX,
  ClipboardList,
  Stethoscope,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toggleActiveClass } from "./dashboard/range-toggle";
import { AgendaCalendarSwitcher } from "./agenda-calendar-switcher";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "../services/appointments-service";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatRange,
  formatTime,
} from "../utils/format";
import type { AppointmentStatus, AppointmentDto } from "../types";

type Range = "day" | "week" | "month";

const rangeOptions: Array<{ key: Range; label: string; icon: LucideIcon }> = [
  { key: "day", label: "Hoy", icon: CalendarCheck },
  { key: "week", label: "Semana", icon: CalendarRange },
  { key: "month", label: "Mes", icon: CalendarDays },
];

/** Estados que aparecen en el resumen rápido, en orden de prioridad. */
const summaryStatuses: AppointmentStatus[] = [
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
  "NoShow",
];

/**
 * Agenda del profesional en un rango, con acciones de cancelación y
 * reprogramación. Con <paramref name="fixedProfessionalId"/> (vista del
 * administrador: "todas las agendas") usa ese profesional en lugar del
 * contexto del JWT; <paramref name="cancelledBy"/> define el actor de la
 * cancelación (Admin para la vista global).
 */
export function ProfessionalAgenda({
  fixedProfessionalId = null,
  fixedProfessionalName = null,
  cancelledBy = "Professional",
  initialDate = null,
}: {
  fixedProfessionalId?: string | null;
  fixedProfessionalName?: string | null;
  cancelledBy?: "Professional" | "Admin";
  initialDate?: string | null;
}) {
  const router = useRouter();
  const { context, loading: userLoading } = useCurrentUser();

  const initialAnchor = parseFecha(initialDate);
  const [range, setRange] = useState<Range>(() =>
    initialAnchor ? "day" : "week",
  );
  const [anchor, setAnchor] = useState<Date | null>(() => initialAnchor);
  const { from, to } = rangeBounds(range, anchor ?? new Date());
  const professionalId =
    fixedProfessionalId ?? context?.professional?.id ?? null;
  const professionalName =
    fixedProfessionalName ?? context?.professional?.fullName ?? null;
  const { appointments, loading, error, refetch } = useAgenda(
    professionalId,
    from,
    to,
  );

  const [cancelling, setCancelling] =
    useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduling, setRescheduling] =
    useState<AppointmentDto | null>(null);
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

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    setActionError(null);
    try {
      await cancelAppointment(cancelling.id, {
        reason: cancelReason.trim() || "Cancelada por el profesional",
        cancelledBy,
      });
      setCancelling(null);
      setCancelReason("");
      refetch();
    } catch {
      setActionError(
        "No se pudo cancelar la cita. Revisa que el estado lo permita.",
      );
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
      setActionError(
        "No se pudo reprogramar la cita. Verifica el horario y la anticipación.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Conteo de citas por estado para el resumen rápido (una sola pasada).
  const countsByStatus = new Map<AppointmentStatus, number>();
  for (const appointment of appointments) {
    countsByStatus.set(
      appointment.status,
      (countsByStatus.get(appointment.status) ?? 0) + 1,
    );
  }
  const statusSummary = summaryStatuses.filter(
    (status) => (countsByStatus.get(status) ?? 0) > 0,
  );
  const grouped = groupByDay(appointments);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={fixedProfessionalId ? "Agenda" : "Mi agenda"}
        description={
          professionalName
            ? `Citas de ${professionalName}`
            : "Agenda del profesional"
        }
        icon={CalendarDays}
        actions={<AgendaCalendarSwitcher active="agenda" />}
      />

      {!professionalId ? (
        <EmptyState
          icon={Stethoscope}
          title="El usuario no es un profesional clínico"
          description="La agenda de Citas requiere una asignación clínica en el ERP."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              value={[range]}
              onValueChange={(values) => {
                const next = values[0] as Range | undefined;
                if (next) {
                  setRange(next);
                  setAnchor(null);
                }
              }}
              size="sm"
              variant="outline"
            >
              {rangeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <ToggleGroupItem
                    key={option.key}
                    value={option.key}
                    className={
                      range === option.key ? toggleActiveClass : undefined
                    }
                  >
                    <Icon data-icon="inline-start" />
                    {option.label}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            <span className="text-[12px] text-muted-foreground">
              {appointments.length} cita{appointments.length === 1 ? "" : "s"}{" "}
              en el rango
            </span>
          </div>

          {statusSummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {statusSummary.map((status) => {
                const color = appointmentStatusColor(status);
                return (
                  <div
                    key={status}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color.dot }}
                      aria-hidden="true"
                    />
                    <span className="text-[12px] font-medium text-muted-foreground">
                      {appointmentStatusLabel[status]}
                    </span>
                    <span className="text-[12px] font-bold text-foreground">
                      {countsByStatus.get(status)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {actionError && (
            <p
              className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
              role="alert"
            >
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
            <div className="flex flex-col gap-5">
              {grouped.map((group) => (
                <div key={group.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-3 py-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <CalendarCheck className="size-3.5" />
                    </div>
                    <span className="text-[13px] font-semibold text-primary-strong">
                      {group.label}
                    </span>
                    <span className="ml-auto text-[11.5px] font-medium text-primary-strong/80">
                      {group.items.length} cita
                      {group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {group.items.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onOpen={() =>
                        router.push(`/appointments/citas/${appointment.id}`)
                      }
                      onJoin={() =>
                        router.push(`/appointments/sala/${appointment.id}`)
                      }
                      onCancel={() => setCancelling(appointment)}
                      onReschedule={() => setRescheduling(appointment)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Cancelación */}
      <Dialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <CalendarX className="size-4" />
              </span>
              Cancelar cita
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que querés cancelar la cita del{" "}
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
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de la cancelación"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelling(null)}
              disabled={busy}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={busy}
            >
              {busy ? "Cancelando..." : "Cancelar cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprogramación */}
      <Dialog
        open={rescheduling !== null}
        onOpenChange={(open) => !open && setRescheduling(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CalendarClock className="size-4" />
              </span>
              Reprogramar cita
            </DialogTitle>
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
            <Button
              variant="outline"
              onClick={() => setRescheduling(null)}
              disabled={busy}
            >
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
  appointment: AppointmentDto;
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
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:shadow-sm">
      <button
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
          <Video className="size-4.5 text-primary" />
        </div>
        <div className="flex w-14 shrink-0 flex-col items-start">
          <span className="text-[13px] font-bold text-foreground">
            {formatTime(appointment.scheduledStart)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatTime(appointment.scheduledEnd)}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[13.5px] font-semibold text-foreground">
            {appointment.patientName ?? "Paciente"}
          </span>
          <span className="truncate text-[12px] text-muted-foreground">
            {appointment.specialtyName ?? "Especialidad"} ·{" "}
            {appointment.locationName ?? "Sede"}
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
        <Button size="sm" variant="outline" onClick={onOpen}>
          <ClipboardList data-icon="inline-start" /> Detalle
        </Button>
        {joinable && (
          <Button size="sm" onClick={onJoin}>
            <Video data-icon="inline-start" /> Unirme
          </Button>
        )}
        {reschedulable && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReschedule}
            aria-label="Reprogramar"
          >
            <CalendarClock data-icon="inline-start" />
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
            <X data-icon="inline-start" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface DayGroup {
  key: string;
  date: Date;
  label: string;
  items: AppointmentDto[];
}

/** Agrupa las citas por día local y les asigna una etiqueta legible (Hoy/Ayer/fecha). */
function groupByDay(appointments: AppointmentDto[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const appointment of appointments) {
    const date = new Date(appointment.scheduledStart);
    const key = startOfDay(date).toISOString();
    const existing = map.get(key);
    if (existing) {
      existing.items.push(appointment);
    } else {
      map.set(key, { key, date, label: "", items: [appointment] });
    }
  }
  const today = new Date();
  return [...map.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((group) => ({ ...group, label: formatDayHeader(group.date, today) }));
}

/** Etiqueta del día: Hoy / Mañana / Ayer o "lunes, 25 de agosto". */
function formatDayHeader(date: Date, today: Date): string {
  const diffDays = Math.round(
    (startOfDay(date).getTime() - startOfDay(today).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  const label = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function rangeBounds(range: Range, anchor: Date): { from: Date; to: Date } {
  const from = new Date(anchor);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (range === "day") to.setDate(to.getDate() + 1);
  if (range === "week") to.setDate(to.getDate() + 7);
  if (range === "month") to.setMonth(to.getMonth() + 1);
  return { from, to };
}

/** Parsea una fecha "YYYY-MM-DD" como fecha LOCAL (no UTC), o null si es inválida. */
function parseFecha(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
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
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft">
        <Icon className="size-6 text-primary-strong" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[12.5px] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <p
      className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}
