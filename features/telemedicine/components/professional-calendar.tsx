"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Stethoscope, Video } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import {
  appointmentStatusColor,
  formatTime,
} from "../utils/format";

/**
 * Calendario mensual de citas de un profesional. Con
 * <paramref name="fixedProfessionalId"/> (vista del administrador) usa ese
 * profesional en lugar del contexto del JWT.
 */
export function ProfessionalCalendar({
  fixedProfessionalId = null,
  fixedProfessionalName = null,
}: {
  fixedProfessionalId?: string | null;
  fixedProfessionalName?: string | null;
}) {
  const { context, loading: userLoading } = useCurrentUser();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { from, to, days, monthLabel } = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);
    const list: Date[] = [];
    const d = new Date(start);
    while (d < end) {
      list.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return {
      from: start,
      to: end,
      days: list,
      monthLabel: start.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    };
  }, [cursor]);

  const professionalId =
    fixedProfessionalId ?? context?.professional?.id ?? null;
  const professionalName =
    fixedProfessionalName ?? context?.professional?.fullName ?? null;
  const { appointments, loading } = useAgenda(professionalId, from, to);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    for (const appointment of appointments) {
      const key = new Date(appointment.scheduledStart).toDateString();
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const firstWeekday = new Date(from).getDay(); // 0=domingo
  const leading = Array.from({ length: firstWeekday });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Calendario"
        description={professionalName ? `Citas de ${professionalName}` : "Calendario de telemedicina"}
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              className="text-white"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-32 text-center text-[13px] font-semibold capitalize text-white">
              {monthLabel}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              className="text-white"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      {!professionalId ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Stethoscope className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">El usuario no es un profesional clínico</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div key={day} className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {day}
            </div>
          ))}
          {leading.map((_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {days.map((day) => {
            const key = day.toDateString();
            const dayAppointments = byDay.get(key) ?? [];
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={key}
                className={
                  isToday
                    ? "min-h-28 rounded-xl border border-primary/40 bg-primary-soft/20 p-1.5"
                    : "min-h-28 rounded-xl border border-border bg-card p-1.5"
                }
              >
                <span
                  className={
                    isToday
                      ? "mb-1 flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                      : "mb-1 inline-block text-[11px] font-semibold text-muted-foreground"
                  }
                >
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <Link
                      key={appointment.id}
                      href={`/telemedicine/citas/${appointment.id}`}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
                      style={{
                        backgroundColor: appointmentStatusColor(appointment.status).bg,
                      }}
                      title={`${appointment.patientName ?? "Paciente"} · ${formatTime(appointment.scheduledStart)}`}
                    >
                      <Video className="size-2.5 shrink-0" style={{ color: appointmentStatusColor(appointment.status).dot }} />
                      <span className="truncate text-[10.5px] font-medium" style={{ color: appointmentStatusColor(appointment.status).text }}>
                        {formatTime(appointment.scheduledStart)} · {appointment.patientName ?? "Paciente"}
                      </span>
                    </Link>
                  ))}
                  {dayAppointments.length > 3 && (
                    <span className="px-1.5 text-[10px] text-muted-foreground">
                      +{dayAppointments.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <p className="text-center text-[12px] text-muted-foreground">Cargando citas...</p>
      )}
    </div>
  );
}
