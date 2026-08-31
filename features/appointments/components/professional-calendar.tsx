"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, Stethoscope } from "lucide-react";
import type FullCalendar from "@fullcalendar/react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AgendaCalendarSwitcher } from "./agenda-calendar-switcher";
import {
  type CalendarViewType,
  type VisibleRange,
} from "./calendar/appointments-calendar";
import { CalendarToolbar } from "./calendar/calendar-toolbar";
import { AppointmentEventPopover } from "./calendar/appointment-event-popover";
import { AppointmentActionDialogs } from "./calendar/appointment-action-dialogs";
import { CreateAppointmentDialog } from "./calendar/create-appointment-dialog";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import { useAppointmentFilters } from "../hooks/use-appointment-filters";
import { useAppointmentActions } from "../hooks/use-appointment-actions";
import { rescheduleAppointment } from "../services/appointments-service";
import type { AppointmentDto } from "../types";

// FullCalendar (~300 kB) se carga solo en esta vista y solo en cliente:
// mide el DOM y no soporta SSR.
const CalendarSurface = dynamic(
  () =>
    import("./calendar/appointments-calendar").then(
      (mod) => mod.AppointmentsCalendar,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[560px] w-full rounded-2xl" />,
  },
);

/**
 * Calendario de citas de un profesional: grilla horaria real (mes/semana/
 * día), popover de evento, creación por selección y reprogramación por
 * drag & drop. Con <paramref name="fixedProfessionalId"/> (vista del
 * administrador) usa ese profesional y actúa como Admin.
 */
export function ProfessionalCalendar({
  fixedProfessionalId = null,
  fixedProfessionalName = null,
}: {
  fixedProfessionalId?: string | null;
  fixedProfessionalName?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { context, loading: userLoading } = useCurrentUser();

  const professionalId =
    fixedProfessionalId ?? context?.professional?.id ?? null;
  const professionalName =
    fixedProfessionalName ?? context?.professional?.fullName ?? null;
  const actor = fixedProfessionalId ? "Admin" : "Professional";

  const calendarRef = useRef<FullCalendar | null>(null);
  const [viewType, setViewType] = useState<CalendarViewType>("dayGridMonth");
  const [range, setRange] = useState<VisibleRange | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [eventPopover, setEventPopover] = useState<{
    appointment: AppointmentDto;
    anchor: Element;
  } | null>(null);
  const [createPreset, setCreatePreset] = useState<{
    start: Date;
    end: Date | null;
  } | null>(null);

  // Rango inicial: el mes corriente (datesSet lo corrige al montar FC).
  const initialRange = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }, []);
  const from = range?.from ?? initialRange.from;
  const to = range?.to ?? initialRange.to;

  const { appointments, loading, error, refetch } = useAgenda(
    professionalId,
    from,
    to,
  );
  const filters = useAppointmentFilters(appointments);
  const actions = useAppointmentActions({
    actor,
    onSuccess: refetch,
  });

  // Altura del timeGrid según vista (el "auto" del mes evita scroll interno).
  // Banner de error de drag & drop: se auto-disuelve para no bloquear la vista.
  useEffect(() => {
    if (!dropError) return;
    const timer = window.setTimeout(() => setDropError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [dropError]);

  const handleDropError = useCallback(
    (message: string) => setDropError(message),
    [],
  );

  const persistReschedule = useCallback(
    async (
      appointment: AppointmentDto,
      newStart: Date,
      newEnd: Date | null,
      revert: () => void,
      kind: "move" | "resize",
    ) => {
      try {
        await rescheduleAppointment(appointment.id, {
          newStart: newStart.toISOString(),
          durationMinutes:
            kind === "resize" && newEnd
              ? Math.round((newEnd.getTime() - newStart.getTime()) / 60000)
              : null,
          requestedBy: actor,
          reason: "Reprogramada desde el calendario",
        });
        refetch();
      } catch (err) {
        revert();
        setDropError(
          err instanceof Error && err.message
            ? err.message
            : t(
                "No se pudo reprogramar la cita. Verifica el horario y la anticipación.",
              ),
        );
      }
    },
    [actor, refetch, t],
  );

  const handleEventDropped = useCallback(
    (
      appointment: AppointmentDto,
      newStart: Date,
      newEnd: Date | null,
      revert: () => void,
    ) => {
      void persistReschedule(appointment, newStart, newEnd, revert, "move");
    },
    [persistReschedule],
  );

  const handleEventResized = useCallback(
    (
      appointment: AppointmentDto,
      newStart: Date,
      newEnd: Date,
      revert: () => void,
    ) => {
      void persistReschedule(appointment, newStart, newEnd, revert, "resize");
    },
    [persistReschedule],
  );

  const handleRangeSelect = useCallback((start: Date, end: Date) => {
    setCreatePreset({ start, end });
  }, []);

  const handleNewAppointment = useCallback(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    setCreatePreset({
      start: next,
      end: new Date(next.getTime() + 30 * 60000),
    });
  }, []);

  const rangeLabel = useMemo(
    () => formatRangeLabel(viewType, from),
    [viewType, from],
  );
  const isTodayRange = useMemo(
    () => isTodayInView(viewType, from),
    [viewType, from],
  );

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title={t("Calendario")}
        description={
          professionalName
            ? t("Citas de {name}", { name: professionalName })
            : t("Calendario de citas")
        }
        icon={CalendarDays}
        actions={<AgendaCalendarSwitcher active="calendario" />}
      />

      {!professionalId ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft">
            <Stethoscope className="size-6 text-primary-strong" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t("El usuario no es un profesional clínico")}
          </p>
        </div>
      ) : (
        <>
          <CalendarToolbar
            viewType={viewType}
            rangeLabel={rangeLabel}
            isTodayRange={isTodayRange}
            totalCount={appointments.length}
            countsByStatus={filters.countsByStatus}
            statuses={filters.statuses}
            query={filters.query}
            onQueryChange={filters.setQuery}
            onToggleStatus={filters.toggleStatus}
            onClearFilters={filters.clear}
            activeFilterCount={filters.activeCount}
            onPrev={() => calendarRef.current?.getApi().prev()}
            onNext={() => calendarRef.current?.getApi().next()}
            onToday={() => calendarRef.current?.getApi().today()}
            onViewChange={(next) =>
              calendarRef.current?.getApi().changeView(next)
            }
            onNewAppointment={handleNewAppointment}
          />

          {error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={refetch}>
                {t("Reintentar")}
              </Button>
            </div>
          ) : (
            <>
              <CalendarSurface
                events={filters.filtered}
                calendarRef={calendarRef}
                viewType={viewType}
                onViewTypeChange={setViewType}
                onRangeChange={setRange}
                onEventClick={(appointment, anchor) =>
                  setEventPopover({ appointment, anchor })
                }
                onRangeSelect={handleRangeSelect}
                onEventDropped={handleEventDropped}
                onEventResized={handleEventResized}
                onDropError={handleDropError}
              />
              {loading && (
                <p
                  className="text-center text-[12px] text-muted-foreground"
                  aria-live="polite"
                >
                  {t("Cargando citas...")}
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* Popover del evento (desktop) / sheet (móvil) */}
      <AppointmentEventPopover
        appointment={eventPopover?.appointment ?? null}
        anchor={eventPopover?.anchor ?? null}
        onOpenChange={(open) => {
          if (!open) setEventPopover(null);
        }}
        onCancel={actions.openCancel}
        onReschedule={actions.openReschedule}
        onJoin={(appointment) =>
          router.push(`/appointments/sala/${appointment.id}`)
        }
      />

      {/* Creación por selección / botón "Nueva cita" */}
      <CreateAppointmentDialog
        open={createPreset !== null}
        onOpenChange={(open) => {
          if (!open) setCreatePreset(null);
        }}
        presetStart={createPreset?.start ?? null}
        presetEnd={createPreset?.end ?? null}
        professionalId={professionalId ?? ""}
        professionalName={professionalName}
        specialtyIds={context?.professional?.specialtyIds ?? null}
        onCreated={() => refetch()}
      />

      {/* Cancelar / reprogramar (diálogos compartidos con la agenda) */}
      <AppointmentActionDialogs
        cancelling={actions.cancelling}
        cancelReason={actions.cancelReason}
        onCancelReasonChange={actions.setCancelReason}
        rescheduling={actions.rescheduling}
        newStart={actions.newStart}
        onNewStartChange={actions.setNewStart}
        busy={actions.busy}
        actionError={actions.actionError}
        onClose={actions.closeAll}
        onConfirmCancel={() => void actions.confirmCancel()}
        onConfirmReschedule={() => void actions.confirmReschedule()}
      />

      {/* Feedback de fallo de drag & drop */}
      {dropError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-xl border border-destructive/30 bg-card px-4 py-3 shadow-lg"
        >
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <p className="text-[13px] text-foreground">{dropError}</p>
        </div>
      )}
    </div>
  );
}

/** Etiqueta del rango visible según la vista (en español, i18n-ready). */
function formatRangeLabel(viewType: CalendarViewType, from: Date): string {
  if (viewType === "dayGridMonth") {
    return capitalize(
      from.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    );
  }
  if (viewType === "timeGridWeek") {
    const end = new Date(from);
    end.setDate(end.getDate() + 6);
    const sameMonth = from.getMonth() === end.getMonth();
    const left = sameMonth
      ? from.toLocaleDateString("es-ES", { day: "numeric" })
      : from.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const right = end.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${left} – ${right}`;
  }
  const today = new Date();
  const label = from.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return from.toDateString() === today.toDateString()
    ? `Hoy · ${capitalize(label)}`
    : capitalize(label);
}

function isTodayInView(viewType: CalendarViewType, from: Date): boolean {
  const today = new Date();
  if (viewType === "dayGridMonth") {
    return (
      today.getFullYear() === from.getFullYear() &&
      today.getMonth() === from.getMonth()
    );
  }
  if (viewType === "timeGridWeek") {
    const end = new Date(from);
    end.setDate(end.getDate() + 7);
    return today >= from && today < end;
  }
  return from.toDateString() === today.toDateString();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
