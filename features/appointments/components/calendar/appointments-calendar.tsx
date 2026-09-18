"use client";

import { useCallback, useMemo, useRef, type RefObject } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import "./calendar-theme.css";
import { useT } from "@/providers/i18n-provider";
import { appointmentStatusLabel, formatTime } from "../../utils/format";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { AppointmentDto, AppointmentStatus } from "../../types";

export type CalendarViewType = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export interface VisibleRange {
  from: Date;
  to: Date;
}

/** Estados desde los que el negocio permite reprogramar (drag/resize). */
const RESCHEDULABLE: AppointmentStatus[] = ["Confirmed"];

/**
 * Calendario de citas sobre FullCalendar v6 con tema del ERP: grilla horaria
 * real (semana/día), mes con eventos por día, indicador de "ahora", creación
 * por selección y reprogramación por drag & drop con rollback si el backend
 * rechaza la operación. La toolbar es propia (calendar-toolbar.tsx) y controla
 * este componente vía la API del calendario.
 */
export function AppointmentsCalendar({
  events,
  calendarRef,
  viewType,
  onViewTypeChange,
  onRangeChange,
  onEventClick,
  onRangeSelect,
  onDateSelectDay,
  selectedId = null,
  onEventDropped,
  onEventResized,
  onDropError,
}: {
  events: AppointmentDto[];
  /** Ref compartido para que la toolbar use la API (prev/next/today/vista). */
  calendarRef: RefObject<FullCalendar | null>;
  /** Vista activa (controlada por la toolbar) — fija la altura del timeGrid. */
  viewType: CalendarViewType;
  onViewTypeChange: (view: CalendarViewType) => void;
  /** Rango visible (superset del rango cargado) — dispara el fetch de agenda. */
  onRangeChange: (range: VisibleRange) => void;
  onEventClick: (appointment: AppointmentDto, anchor: Element) => void;
  /** Selección (drag) de un rango vacío → creación con prellenado. */
  onRangeSelect: (start: Date, end: Date) => void;
  /** Click en un día del Mes → navegar a la vista Día de esa fecha. */
  onDateSelectDay: (date: Date) => void;
  /** Id de la cita seleccionada (popover abierto) → anillo visible. */
  selectedId?: string | null;
  /** Persistencia de un drop; el revert visual lo maneja el callback. */
  onEventDropped: (
    appointment: AppointmentDto,
    newStart: Date,
    newEnd: Date | null,
    revert: () => void,
  ) => void;
  onEventResized: (
    appointment: AppointmentDto,
    newStart: Date,
    newEnd: Date,
    revert: () => void,
  ) => void;
  onDropError: (message: string) => void;
}) {
  const t = useT();

  // Guarda anti-loop: datesSet dispara en cada render de vista; solo
  // propagamos cuando los límites o la vista realmente cambiaron.
  const lastRangeKey = useRef("");

  const handleDatesSet = useCallback(
    (arg: { view: { type: string }; start: Date; end: Date }) => {
      const key = `${arg.view.type}|${arg.start.toISOString()}|${arg.end.toISOString()}`;
      if (key === lastRangeKey.current) return;
      lastRangeKey.current = key;
      onViewTypeChange(arg.view.type as CalendarViewType);
      onRangeChange({ from: arg.start, to: arg.end });
    },
    [onViewTypeChange, onRangeChange],
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const appointment = info.event.extendedProps?.appointment as
        AppointmentDto | undefined;
      if (appointment) onEventClick(appointment, info.el);
    },
    [onEventClick],
  );

  const handleSelect = useCallback(
    (info: DateSelectArg) => {
      onRangeSelect(info.start, info.end);
    },
    [onRangeSelect],
  );

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      const appointment = info.event.extendedProps?.appointment as
        AppointmentDto | undefined;
      if (!appointment || !info.event.start) {
        info.revert();
        return;
      }
      if (!RESCHEDULABLE.includes(appointment.status)) {
        info.revert();
        onDropError(
          t('La cita en estado "{status}" no puede reprogramarse.', {
            status: t(appointmentStatusLabel[appointment.status]),
          }),
        );
        return;
      }
      onEventDropped(
        appointment,
        info.event.start,
        info.event.end,
        info.revert,
      );
    },
    [onEventDropped, onDropError, t],
  );

  const handleEventResize = useCallback(
    (info: {
      event: {
        start: Date | null;
        end: Date | null;
        extendedProps: Record<string, unknown>;
      };
      revert: () => void;
    }) => {
      const appointment = info.event.extendedProps?.appointment as
        AppointmentDto | undefined;
      if (!appointment || !info.event.start || !info.event.end) {
        info.revert();
        return;
      }
      if (!RESCHEDULABLE.includes(appointment.status)) {
        info.revert();
        onDropError(
          t('La cita en estado "{status}" no puede redimensionarse.', {
            status: t(appointmentStatusLabel[appointment.status]),
          }),
        );
        return;
      }
      onEventResized(
        appointment,
        info.event.start,
        info.event.end,
        info.revert,
      );
    },
    [onEventResized, onDropError, t],
  );

  // Click en un día del Mes → vista Día de esa fecha. En Semana/Día no
  // hace nada para no interferir con la selección de rangos (creación).
  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      if (info.view.type === "dayGridMonth") onDateSelectDay(info.date);
    },
    [onDateSelectDay],
  );

  // Ocupación por día local para el indicador sutil de la vista Mes.
  const countsByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const appointment of events) {
      const date = new Date(appointment.scheduledStart);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const handleDayCellContent = useCallback(
    (arg: { date: Date; dayNumberText: string }) => {
      const key = `${arg.date.getFullYear()}-${arg.date.getMonth()}-${arg.date.getDate()}`;
      const count = countsByDay.get(key) ?? 0;
      const level = count >= 6 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0;
      return (
        <span className="cal-month-day">
          <span className="cal-month-num">{arg.dayNumberText}</span>
          {level > 0 && (
            <span
              className={`cal-occupancy is-level-${level}`}
              title={t("{n} cita{plural}", {
                n: String(count),
                plural: count === 1 ? "" : "s",
              })}
              aria-hidden="true"
            >
              {Array.from({ length: level }).map((_, i) => (
                <i key={i} />
              ))}
            </span>
          )}
        </span>
      );
    },
    [countsByDay, t],
  );

  const calendarEvents = useMemo(
    () =>
      events.map((appointment) => ({
        id: appointment.id,
        title: appointment.patientName ?? t("Paciente"),
        start: appointment.scheduledStart,
        end: appointment.scheduledEnd,
        extendedProps: { appointment },
        classNames:
          selectedId && appointment.id === selectedId ? ["is-selected"] : [],
        // Solo Confirmadas se mueven/redimensionan (reglas del negocio);
        // el backend revalida solapamiento y anticipación.
        editable: RESCHEDULABLE.includes(appointment.status),
        startEditable: RESCHEDULABLE.includes(appointment.status),
        durationEditable: RESCHEDULABLE.includes(appointment.status),
      })),
    [events, selectedId, t],
  );

  const renderEvent = useCallback(
    (arg: EventContentArgShape) => renderEventContent(arg, t),
    [t],
  );

  return (
    <div className="copp-calendar min-w-0">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={viewType}
        locale={esLocale}
        firstDay={1}
        dayHeaderContent={renderDayHeaderContent}
        dayCellContent={handleDayCellContent}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: "07:00",
          endTime: "19:00",
        }}
        fixedWeekCount={false}
        headerToolbar={false}
        height={
          viewType === "dayGridMonth"
            ? "auto"
            : "max(560px, calc(100dvh - 330px))"
        }
        dayMaxEvents={3}
        eventMaxStack={3}
        slotEventOverlap={false}
        nowIndicator
        scrollTime="07:30:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        expandRows
        slotDuration="00:15:00"
        slotLabelInterval="01:00"
        snapDuration="00:15:00"
        selectMirror
        selectable
        unselectAuto
        allDaySlot={false}
        events={calendarEvents}
        eventContent={renderEvent}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        select={handleSelect}
        dateClick={handleDateClick}
        datesSet={handleDatesSet}
      />
    </div>
  );
}

/**
 * Cabecera de día: en Mes una sola línea ("DOM 4"); en Semana/Día dos líneas
 * con número grande. El día actual lleva píldora rellena (calendar-theme.css).
 */
function renderDayHeaderContent(arg: { date: Date; view: { type: string } }) {
  const today = new Date().toDateString() === arg.date.toDateString();
  const weekday = new Intl.DateTimeFormat("es", { weekday: "short" })
    .format(arg.date)
    .replace(".", "");
  if (arg.view.type === "dayGridMonth") {
    return (
      <span className="cal-col-head is-month">
        <span className="cal-col-dow">{weekday}</span>
        <span className="cal-col-day">{arg.date.getDate()}</span>
      </span>
    );
  }
  return (
    <span className={`cal-col-head${today ? " is-today" : ""}`}>
      <span className="cal-col-dow">{weekday}</span>
      <span className="cal-col-day">{arg.date.getDate()}</span>
    </span>
  );
}

/**
 * Paleta suave propia del calendario: los estados se comunican con tintas
 * claras + punto fuerte, sin bloques saturados. No toca
 * `appointmentStatusColor` (badges y chips del resto del módulo).
 */
function calendarEventColors(status: AppointmentStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "Confirmed":
      return { bg: "#E9EFFA", text: "#23406E", dot: "#3D6DB5" };
    case "InProgress":
      return { bg: "#E4F5FA", text: "#0B6B85", dot: "#1093B4" };
    case "Completed":
      return { bg: "#E5F5EC", text: "#0B6B43", dot: "#12A56B" };
    case "Cancelled":
      return { bg: "#FAEAEA", text: "#A11D13", dot: "#E05252" };
    case "NoShow":
      return { bg: "#FAF0DC", text: "#875C05", dot: "#DE9A2B" };
    default:
      return { bg: "#EDF1F6", text: "#46566B", dot: "#7E90A9" };
  }
}

interface EventContentArgShape {
  event: {
    start: Date | null;
    end: Date | null;
    extendedProps: Record<string, unknown>;
  };
  view: { type: string };
}

/**
 * Render del evento: tarjeta con barra de estado para la grilla horaria y
 * fila compacta con punto para la vista mes. La distinción de estado no
 * depende solo del color: las canceladas van tachadas y con opacidad.
 */
function renderEventContent(
  arg: EventContentArgShape,
  t: ReturnType<typeof useT>,
) {
  const appointment = arg.event.extendedProps?.appointment as
    AppointmentDto | undefined;
  if (!appointment || !arg.event.start) return null;

  const color = calendarEventColors(appointment.status);
  const isDayGrid = arg.view.type.startsWith("dayGrid");
  const cancelled = appointment.status === "Cancelled";
  const faded = cancelled || appointment.status === "NoShow";

  if (isDayGrid) {
    return (
      <div
        className="cal-dot-event"
        style={{
          backgroundColor: color.bg,
          color: color.text,
          opacity: faded ? 0.62 : 1,
        }}
        title={eventTitle(appointment, t)}
      >
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color.dot }}
          aria-hidden="true"
        />
        <span
          className="cal-event-title truncate font-semibold"
          style={cancelled ? { textDecoration: "line-through" } : undefined}
        >
          {appointment.patientName ?? t("Paciente")}
        </span>
      </div>
    );
  }

  const minutes = arg.event.end
    ? Math.round((arg.event.end.getTime() - arg.event.start.getTime()) / 60000)
    : appointment.durationMinutes;
  const compact = minutes < 45;
  const isDayView = arg.view.type === "timeGridDay";

  return (
    <div
      className={`cal-event${compact ? " is-compact" : ""}`}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        borderLeftColor: color.dot,
        boxShadow: `inset 0 0 0 1px ${color.dot}2E`,
        opacity: faded ? 0.66 : 1,
      }}
      title={eventTitle(appointment, t)}
      role="button"
      tabIndex={-1}
      aria-label={eventTitle(appointment, t)}
    >
      {compact ? (
        <span
          className="size-1.5 shrink-0 self-center rounded-full"
          style={{ backgroundColor: color.dot }}
          aria-hidden="true"
        />
      ) : (
        <span
          className="cal-event-time"
          style={cancelled ? { textDecoration: "line-through" } : undefined}
        >
          {`${formatTime(appointment.scheduledStart)} – ${formatTime(
            appointment.scheduledEnd,
          )}`}
        </span>
      )}
      <span
        className="cal-event-title"
        style={cancelled ? { textDecoration: "line-through" } : undefined}
      >
        {appointment.patientName ?? t("Paciente")}
      </span>
      {!compact && (
        <span className="cal-event-meta">
          {appointment.specialtyName ?? ""}
          {isDayView && appointment.locationName
            ? ` · ${appointment.locationName}`
            : ""}
        </span>
      )}
    </div>
  );
}

function eventTitle(
  appointment: AppointmentDto,
  t: ReturnType<typeof useT>,
): string {
  const time = `${formatTime(appointment.scheduledStart)} – ${formatTime(
    appointment.scheduledEnd,
  )}`;
  return `${time} · ${appointment.patientName ?? t("Paciente")} · ${t(
    appointmentStatusLabel[appointment.status],
  )}`;
}
