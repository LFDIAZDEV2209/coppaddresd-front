import Link from "next/link";
import { CalendarDays, ChevronRight, Video } from "lucide-react";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentDto } from "../../types";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatDate,
  formatTime,
} from "../../utils/format";

/**
 * Próximas citas del dashboard (globales en la vista admin; del profesional en
 * la suya). Cada fila enlaza al detalle de la cita.
 */
export function UpcomingAppointments({
  appointments,
  loading,
  emptyMessage = "Sin próximas citas",
  hrefBase = "/appointments/citas",
}: {
  appointments: AppointmentDto[];
  loading: boolean;
  emptyMessage?: string;
  hrefBase?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <CalendarDays className="size-5 text-muted-foreground" />
        </div>
        <p className="text-[13px] font-medium text-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {appointments.slice(0, 7).map((appointment) => (
        <li key={appointment.id}>
          <Link
            href={`${hrefBase}/${appointment.id}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary-soft">
                <Video className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {appointment.patientName ?? "Paciente"}
                </span>
                <span className="truncate text-[11.5px] text-muted-foreground">
                  {appointment.professionalName ?? "Profesional"} ·{" "}
                  {appointment.specialtyName ?? "Especialidad"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex flex-col items-end gap-px">
                <span className="text-[12px] font-medium text-foreground">
                  {formatDate(appointment.scheduledStart)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatTime(appointment.scheduledStart)}
                </span>
              </div>
              <StatusBadge
                status={appointmentStatusLabel[appointment.status]}
                color={appointmentStatusColor(appointment.status)}
              />
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}