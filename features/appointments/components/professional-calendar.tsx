"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Moon,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Sunrise,
  Video,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toggleActiveClass } from "./dashboard/range-toggle";
import { AgendaCalendarSwitcher } from "./agenda-calendar-switcher";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatTime,
} from "../utils/format";
import type { AppointmentDto } from "../types";

const WEEKDAY_HEADERS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const WEEKDAY_ICONS: { label: string; icon: typeof Sun; weekend: boolean }[] = [
  { label: "Dom", icon: Sun, weekend: true },
  { label: "Lun", icon: Sunrise, weekend: false },
  { label: "Mar", icon: Coffee, weekend: false },
  { label: "Mié", icon: Sparkles, weekend: false },
  { label: "Jue", icon: Zap, weekend: false },
  { label: "Vie", icon: Star, weekend: false },
  { label: "Sáb", icon: Moon, weekend: true },
];

type CalendarView = "month" | "week" | "day";

const VIEW_OPTIONS: { key: CalendarView; label: string; icon: typeof Sun }[] = [
  { key: "month", label: "Mes", icon: CalendarDays },
  { key: "week", label: "Semana", icon: CalendarRange },
  { key: "day", label: "Día", icon: Sun },
];

/**
 * Calendario de citas de un profesional con vistas de mes, semana y día, y salto
 * directo a la agenda del día elegido. Con <paramref name="fixedProfessionalId"/>
 * (vista del administrador) usa ese profesional en lugar del contexto del JWT.
 */
export function ProfessionalCalendar({
  fixedProfessionalId = null,
  fixedProfessionalName = null,
}: {
  fixedProfessionalId?: string | null;
  fixedProfessionalName?: string | null;
}) {
  const { context, loading: userLoading } = useCurrentUser();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [detailDay, setDetailDay] = useState<Date | null>(null);

  const { from, to, days, monthLabel, weekDays, weekLabel } = useMemo(() => {
    if (view === "week") {
      const start = startOfWeekSunday(cursor);
      const list = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      const label = `${start.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      })} – ${addDays(start, 6).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
      return {
        from: start,
        to: addDays(start, 7),
        days: [],
        monthLabel: "",
        weekDays: list,
        weekLabel: label,
      };
    }
    if (view === "day") {
      const start = new Date(cursor);
      start.setHours(0, 0, 0, 0);
      return {
        from: start,
        to: addDays(start, 1),
        days: [],
        monthLabel: "",
        weekDays: [],
        weekLabel: "",
      };
    }
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
      monthLabel: start.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      }),
      weekDays: [],
      weekLabel: "",
    };
  }, [cursor, view]);

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

  const today = new Date();
  const firstWeekday = new Date(from).getDay(); // 0=domingo
  const leading = Array.from({ length: firstWeekday });
  const dayAppointments = (byDay.get(cursor.toDateString()) ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.scheduledStart).getTime() -
        new Date(b.scheduledStart).getTime(),
    );
  const detailAppointments = detailDay
    ? (byDay.get(detailDay.toDateString()) ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime(),
        )
    : [];
  const dayLabelText = view === "day" ? formatDayLabel(cursor, today) : "";
  const headerLabel =
    view === "month"
      ? capitalize(monthLabel)
      : view === "week"
        ? capitalize(weekLabel)
        : dayLabelText;
  const viewKey = `${view}-${cursor.toDateString()}`;
  const navPrevLabel =
    view === "month"
      ? "Mes anterior"
      : view === "week"
        ? "Semana anterior"
        : "Día anterior";
  const navNextLabel =
    view === "month"
      ? "Mes siguiente"
      : view === "week"
        ? "Semana siguiente"
        : "Día siguiente";

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const goPrev = () => {
    if (view === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    } else if (view === "week") {
      setCursor(addDays(cursor, -7));
    } else {
      setCursor(addDays(cursor, -1));
    }
  };
  const goNext = () => {
    if (view === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    } else if (view === "week") {
      setCursor(addDays(cursor, 7));
    } else {
      setCursor(addDays(cursor, 1));
    }
  };
  const goToday = () => {
    if (view === "month") {
      setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (view === "week") {
      setCursor(startOfWeekSunday(today));
    } else {
      setCursor(today);
    }
  };

  const changeView = (next: CalendarView) => {
    setView(next);
    if (next === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    } else if (next === "week") {
      setCursor(startOfWeekSunday(today));
    } else {
      setCursor(today);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Calendario"
        description={
          professionalName
            ? `Citas de ${professionalName}`
            : "Calendario de citas"
        }
        icon={CalendarDays}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <AgendaCalendarSwitcher active="calendario" />
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-white hover:bg-white/20 hover:text-white"
                onClick={goPrev}
                aria-label={navPrevLabel}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="flex min-w-32 items-center justify-center gap-1.5 text-[13px] font-semibold text-white">
                <CalendarDays
                  className="size-3.5 shrink-0 text-white/80"
                  aria-hidden="true"
                />
                {headerLabel}
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-white hover:bg-white/20 hover:text-white"
                onClick={goNext}
                aria-label={navNextLabel}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          value={[view]}
          onValueChange={(values) => {
            const next = values[0] as CalendarView | undefined;
            if (next) changeView(next);
          }}
          size="sm"
          variant="outline"
        >
          {VIEW_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.key}
              value={option.key}
              className={view === option.key ? toggleActiveClass : undefined}
            >
              <option.icon data-icon="inline-start" />
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          size="sm"
          variant="default"
          onClick={goToday}
          className="shadow-sm"
        >
          <CalendarCheck data-icon="inline-start" /> Hoy
        </Button>
        <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11.5px] font-semibold text-primary-strong">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {appointments.length} cita{appointments.length === 1 ? "" : "s"} en el
          rango
        </span>
      </div>

      <div
        key={viewKey}
        className="animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {!professionalId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft">
              <Stethoscope className="size-6 text-primary-strong" />
            </div>
            <p className="text-sm font-medium text-foreground">
              El usuario no es un profesional clínico
            </p>
          </div>
        ) : view === "month" ? (
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_ICONS.map((item) => (
              <div
                key={item.label}
                className={
                  item.weekend
                    ? "flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm"
                    : "flex items-center justify-center gap-1.5 rounded-xl bg-primary-soft/70 py-2 text-[11px] font-bold uppercase tracking-wide text-primary-strong"
                }
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </div>
            ))}
            {leading.map((_, i) => (
              <div key={`lead-${i}`} />
            ))}
            {days.map((day) => {
              const key = day.toDateString();
              const dayAppointments = byDay.get(key) ?? [];
              const isToday = day.toDateString() === today.toDateString();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const hasItems = dayAppointments.length > 0;
              const agendaHref = `/appointments/agenda?fecha=${toDateKey(day)}`;
              return (
                <div
                  key={key}
                  className={
                    isToday
                      ? "flex min-h-28 flex-col rounded-xl border border-primary bg-primary-soft/40 p-1.5 shadow-sm ring-1 ring-primary/30 transition-colors hover:shadow-md"
                      : isWeekend
                        ? "flex min-h-28 flex-col rounded-xl border border-border bg-muted/30 p-1.5 transition-colors hover:border-primary/40 hover:shadow-sm"
                        : "flex min-h-28 flex-col rounded-xl border border-border bg-card p-1.5 transition-colors hover:border-primary/40 hover:shadow-sm"
                  }
                >
                  <div className="mb-1 flex items-baseline gap-1 self-start">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                      {WEEKDAY_HEADERS[day.getDay()]}
                    </span>
                    {hasItems ? (
                      <button
                        type="button"
                        onClick={() => setDetailDay(day)}
                        aria-label={`Ver citas del ${day.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`}
                        title={`Ver citas del ${day.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`}
                        className={
                          isToday
                            ? "flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm transition-all hover:scale-110 active:scale-95"
                            : "cursor-pointer rounded-md px-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-strong active:scale-95"
                        }
                      >
                        {day.getDate()}
                      </button>
                    ) : (
                      <span
                        className={
                          isToday
                            ? "flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
                            : "px-1 text-[11px] font-semibold text-muted-foreground"
                        }
                      >
                        {day.getDate()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <AppointmentChip
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                    {dayAppointments.length > 3 && (
                      <Link
                        href={agendaHref}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary-strong transition-colors hover:bg-primary-soft hover:text-primary-strong"
                      >
                        +{dayAppointments.length - 3} más
                      </Link>
                    )}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                      {dayAppointments.slice(0, 6).map((appointment) => {
                        const color = appointmentStatusColor(
                          appointment.status,
                        );
                        return (
                          <span
                            key={appointment.id}
                            className="size-1.5 rounded-full transition-transform hover:scale-150"
                            style={{ backgroundColor: color.dot }}
                            title={`${appointment.patientName ?? "Paciente"} · ${formatTime(appointment.scheduledStart)}`}
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : view === "week" ? (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => {
              const key = day.toDateString();
              const dayAppointments = (byDay.get(key) ?? [])
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.scheduledStart).getTime() -
                    new Date(b.scheduledStart).getTime(),
                );
              const isToday = day.toDateString() === today.toDateString();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const hasItems = dayAppointments.length > 0;
              const DayIcon = WEEKDAY_ICONS[index].icon;
              const visible = dayAppointments.slice(0, 4);
              const overflow = dayAppointments.length - visible.length;
              return (
                <div
                  key={key}
                  className={
                    isToday
                      ? "flex min-h-[440px] flex-col rounded-xl border border-primary bg-primary-soft/40 p-1.5 shadow-sm ring-1 ring-primary/30 transition-colors hover:shadow-md"
                      : isWeekend
                        ? "flex min-h-[440px] flex-col rounded-xl border border-border bg-muted/30 p-1.5 transition-colors hover:border-primary/40 hover:shadow-sm"
                        : "flex min-h-[440px] flex-col rounded-xl border border-border bg-card p-1.5 transition-colors hover:border-primary/40 hover:shadow-sm"
                  }
                >
                  <div
                    className={
                      isToday
                        ? "mb-1.5 flex flex-col items-center gap-0.5 rounded-lg bg-primary-soft/60 py-1.5"
                        : isWeekend
                          ? "mb-1.5 flex flex-col items-center gap-0.5 rounded-lg bg-primary py-1.5 shadow-sm"
                          : "mb-1.5 flex flex-col items-center gap-0.5 rounded-lg bg-muted/60 py-1.5"
                    }
                  >
                    <span
                      className={
                        isToday
                          ? "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary-strong"
                          : isWeekend
                            ? "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
                            : "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      }
                    >
                      <DayIcon className="size-3.5" aria-hidden="true" />
                      {WEEKDAY_HEADERS[index]}
                    </span>
                    {hasItems ? (
                      <button
                        type="button"
                        onClick={() => setDetailDay(day)}
                        aria-label={`Ver citas del ${day.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`}
                        className={
                          isToday
                            ? "flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm transition-all hover:scale-110 active:scale-95"
                            : "cursor-pointer rounded-md px-1 text-[12px] font-bold text-foreground transition-colors hover:bg-primary-soft hover:text-primary-strong active:scale-95"
                        }
                      >
                        {day.getDate()}
                      </button>
                    ) : (
                      <span
                        className={
                          isToday
                            ? "flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm"
                            : "text-[12px] font-bold text-foreground"
                        }
                      >
                        {day.getDate()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    {visible.map((appointment) => (
                      <AppointmentChip
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))}
                    {overflow > 0 && (
                      <Link
                        href={`/appointments/agenda?fecha=${toDateKey(day)}`}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary-strong transition-colors hover:bg-primary-soft hover:text-primary-strong"
                      >
                        +{overflow} más
                      </Link>
                    )}
                    {dayAppointments.length === 0 && (
                      <div className="flex flex-1 items-center justify-center gap-1 text-[10.5px] text-muted-foreground/70">
                        <CalendarX className="size-3.5" aria-hidden="true" />
                        Sin citas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-primary/40 bg-primary-soft/40 px-4 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sun className="size-4" aria-hidden="true" />
              </div>
              <p className="text-[13px] font-bold text-primary-strong">
                {dayLabelText}
              </p>
              <span className="ml-auto shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
                {dayAppointments.length} cita
                {dayAppointments.length === 1 ? "" : "s"}
              </span>
            </div>
            {dayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft">
                  <CalendarX className="size-6 text-primary-strong" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Sin citas este día
                </p>
              </div>
            ) : (
              dayAppointments.map((appointment, index) => (
                <DayRow
                  key={appointment.id}
                  appointment={appointment}
                  index={index}
                />
              ))
            )}
          </div>
        )}
      </div>

      {detailDay && (
        <DayDetailDialog
          date={detailDay}
          appointments={detailAppointments}
          onClose={() => setDetailDay(null)}
        />
      )}

      {loading && (
        <p className="text-center text-[12px] text-muted-foreground">
          Cargando citas...
        </p>
      )}
    </div>
  );
}

function AppointmentChip({
  appointment,
}: {
  appointment: AppointmentDto;
}) {
  const color = appointmentStatusColor(appointment.status);
  return (
    <Link
      href={`/appointments/citas/${appointment.id}`}
      className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 transition-all hover:shadow-sm hover:brightness-95"
      style={{ backgroundColor: color.bg }}
      title={`${appointment.patientName ?? "Paciente"} · ${formatTime(appointment.scheduledStart)}`}
    >
      <Video
        className="size-2.5 shrink-0"
        style={{ color: color.dot }}
        aria-hidden="true"
      />
      <span
        className="truncate text-[10.5px] font-medium"
        style={{ color: color.text }}
      >
        {formatTime(appointment.scheduledStart)} ·{" "}
        {appointment.patientName ?? "Paciente"}
      </span>
    </Link>
  );
}

/** Fila de la vista de día: barra de estado, hora, paciente y acceso al detalle. */
function DayRow({
  appointment,
  index,
}: {
  appointment: AppointmentDto;
  index: number;
}) {
  const color = appointmentStatusColor(appointment.status);
  return (
    <Link
      href={`/appointments/citas/${appointment.id}`}
      className="flex animate-in items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all fill-mode-both fade-in-0 slide-in-from-bottom-2 duration-300 hover:border-primary/40 hover:shadow-sm"
      style={{ animationDelay: `${index * 40}ms` }}
      title={`${appointment.patientName ?? "Paciente"} · ${formatTime(appointment.scheduledStart)}`}
    >
      <span
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: color.dot }}
        aria-hidden="true"
      />
      <div className="flex w-16 shrink-0 flex-col items-start">
        <span className="text-[13px] font-bold text-foreground">
          {formatTime(appointment.scheduledStart)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatTime(appointment.scheduledEnd)}
        </span>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
        <Video className="size-4 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-foreground">
          {appointment.patientName ?? "Paciente"}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {appointment.specialtyName} · {appointment.locationName}
        </p>
      </div>
      <StatusBadge
        status={appointmentStatusLabel[appointment.status]}
        color={color}
      />
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Diálogo con el detalle de las citas de un día del calendario. */
function DayDetailDialog({
  date,
  appointments,
  onClose,
}: {
  date: Date;
  appointments: AppointmentDto[];
  onClose: () => void;
}) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const agendaHref = `/appointments/agenda?fecha=${toDateKey(date)}`;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              {isToday ? (
                <Sun className="size-4.5" aria-hidden="true" />
              ) : (
                <CalendarDays className="size-4.5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[15px] font-bold text-primary-strong">
                {formatDayLabel(date, today)}
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                {appointments.length} cita
                {appointments.length === 1 ? "" : "s"} programada
                {appointments.length === 1 ? "" : "s"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft">
              <CalendarX
                className="size-5 text-primary-strong"
                aria-hidden="true"
              />
            </div>
            <p className="text-[13px] font-medium text-foreground">
              Sin citas este día
            </p>
          </div>
        ) : (
          <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-1">
            {appointments.map((appointment, index) => (
              <DayRow
                key={appointment.id}
                appointment={appointment}
                index={index}
              />
            ))}
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cerrar
          </DialogClose>
          <Link href={agendaHref} className={buttonVariants({ size: "sm" })}>
            <CalendarDays data-icon="inline-start" />
            Ver agenda
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Semana que contiene a la fecha, con domingo como inicio (getDay 0). */
function startOfWeekSunday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Clave local YYYY-MM-DD para el enlace profundo a la agenda. */
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Etiqueta larga del día en español, con prefijo relativo cuando es hoy. */
function formatDayLabel(date: Date, today: Date): string {
  const label = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const capitalized = capitalize(label);
  return date.toDateString() === today.toDateString()
    ? `Hoy · ${capitalized}`
    : capitalized;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
