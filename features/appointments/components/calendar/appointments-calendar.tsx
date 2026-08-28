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
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatTime,
} from "../../utils/format";
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
          `La cita en estado "${
            appointmentStatusLabel[appointment.status]
          }" no puede reprogramarse.`,
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
    [onEventDropped, onDropError],
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
          `La cita en estado "${
            appointmentStatusLabel[appointment.status]
          }" no puede redimensionarse.`,
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
    [onEventResized, onDropError],
  );

  const calendarEvents = useMemo(
    () =>
      events.map((appointment) => ({
        id: appointment.id,
        title: appointment.patientName ?? "Paciente",
        start: appointment.scheduledStart,
        end: appointment.scheduledEnd,
        extendedProps: { appointment },
        // Solo Confirmadas se mueven/redimensionan (reglas del negocio);
        // el backend revalida solapamiento y anticipación.
        editable: RESCHEDULABLE.includes(appointment.status),
        startEditable: RESCHEDULABLE.includes(appointment.status),
        durationEditable: RESCHEDULABLE.includes(appointment.status),
      })),
    [events],
  );

  return (
    <div className="min-w-0">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        firstDay={0}
        fixedWeekCount={false}
        headerToolbar={false}
        height={
          viewType === "dayGridMonth"
            ? "auto"
            : "max(560px, calc(100dvh - 330px))"
        }
        dayMaxEvents
        moreLinkText="más"
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
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        select={handleSelect}
        datesSet={handleDatesSet}
      />
    </div>
  );
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
function renderEventContent(arg: EventContentArgShape) {
  const appointment = arg.event.extendedProps?.appointment as
    AppointmentDto | undefined;
  if (!appointment || !arg.event.start) return null;

  const color = appointmentStatusColor(appointment.status);
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
        title={eventTitle(appointment)}
      >
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color.dot }}
          aria-hidden="true"
        />
        <span
          className="cal-event-time shrink-0"
          style={cancelled ? { textDecoration: "line-through" } : undefined}
        >
          {formatTime(appointment.scheduledStart)}
        </span>
        <span
          className="cal-event-title truncate font-semibold"
          style={cancelled ? { textDecoration: "line-through" } : undefined}
        >
          {appointment.patientName ?? "Paciente"}
        </span>
      </div>
    );
  }

  const minutes = arg.event.end
    ? Math.round((arg.event.end.getTime() - arg.event.start.getTime()) / 60000)
    : appointment.durationMinutes;
  const compact = minutes < 45;

  return (
    <div
      className={`cal-event${compact ? " is-compact" : ""}`}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        borderLeftColor: color.dot,
        boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.05)",
        opacity: faded ? 0.66 : 1,
      }}
      title={eventTitle(appointment)}
      role="button"
      tabIndex={-1}
      aria-label={eventTitle(appointment)}
    >
      <span
        className="cal-event-time"
        style={cancelled ? { textDecoration: "line-through" } : undefined}
      >
        {compact
          ? formatTime(appointment.scheduledStart)
          : `${formatTime(appointment.scheduledStart)} – ${formatTime(
              appointment.scheduledEnd,
            )}`}
      </span>
      <span
        className="cal-event-title"
        style={cancelled ? { textDecoration: "line-through" } : undefined}
      >
        {appointment.patientName ?? "Paciente"}
      </span>
      {!compact && (
        <span className="cal-event-meta">
          {appointment.specialtyName ?? ""}
        </span>
      )}
    </div>
  );
}

function eventTitle(appointment: AppointmentDto): string {
  const time = `${formatTime(appointment.scheduledStart)} – ${formatTime(
    appointment.scheduledEnd,
  )}`;
  return `${time} · ${appointment.patientName ?? "Paciente"} · ${
    appointmentStatusLabel[appointment.status]
  }`;
}
