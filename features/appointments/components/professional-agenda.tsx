"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ClipboardList,
  Search,
  Stethoscope,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  AgendaCalendarSwitcher,
  type AgendaCalendarView,
} from "./agenda-calendar-switcher";
import { AppointmentActionDialogs } from "./calendar/appointment-action-dialogs";
import { AppointmentEventPopover } from "./calendar/appointment-event-popover";
import { CreateAppointmentDialog } from "./calendar/create-appointment-dialog";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import { useAppointmentFilters } from "../hooks/use-appointment-filters";
import { useAppointmentActions } from "../hooks/use-appointment-actions";
import {
  appointmentStatusColor,
  appointmentStatusDot,
  appointmentStatusLabel,
  formatTime,
} from "../utils/format";
import type { AppointmentStatus, AppointmentDto } from "../types";

type Range = "day" | "week" | "month";

const rangeOptions: Array<{ key: Range; label: string; icon: LucideIcon }> = [
  { key: "day", label: "Hoy", icon: CalendarCheck },
  { key: "week", label: "Semana", icon: CalendarRange },
  { key: "month", label: "Mes", icon: CalendarDays },
];

/** Estados que aparecen en el resumen, en orden de prioridad. */
const summaryStatuses: AppointmentStatus[] = [
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
  "NoShow",
];

/**
 * Agenda del profesional en un rango: timeline agrupada por día con
 * encabezados sticky, chips de resumen que actúan como filtros, búsqueda y
 * acciones rápidas (mismas reglas de estado que el calendario). Con
 * <paramref name="fixedProfessionalId"/> (vista del administrador: "todas
 * las agendas") usa ese profesional; <paramref name="cancelledBy"/> define
 * el actor de cancelación/reprogramación.
 */
export function ProfessionalAgenda({
  fixedProfessionalId = null,
  fixedProfessionalName = null,
  cancelledBy = "Professional",
  initialDate = null,
  agendaView,
  onAgendaViewChange,
}: {
  fixedProfessionalId?: string | null;
  fixedProfessionalName?: string | null;
  cancelledBy?: "Professional" | "Admin";
  initialDate?: string | null;
  agendaView: AgendaCalendarView;
  onAgendaViewChange: (view: AgendaCalendarView) => void;
}) {
  const t = useT();
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

  const filters = useAppointmentFilters(appointments);
  const actions = useAppointmentActions({
    actor: cancelledBy,
    onSuccess: refetch,
  });
  const [eventPopover, setEventPopover] = useState<{
    appointment: AppointmentDto;
    anchor: Element;
  } | null>(null);
  const [createPreset, setCreatePreset] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  /** Abre el diálogo de creación con un hueco sugerido (próxima hora, 30 min). */
  const openCreateDialog = () => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 60, 0, 0);
    setCreatePreset({
      start,
      end: new Date(start.getTime() + 30 * 60 * 1000),
    });
  };

  // Agrupación por día de las citas FILTRADAS (los KPIs usan el total).
  const groups = useMemo(
    () => groupByDay(filters.filtered),
    [filters.filtered],
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
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={fixedProfessionalId ? t("Agenda") : t("Mi agenda")}
        description={
          professionalName
            ? t("Citas de {name}", { name: professionalName })
            : t("Agenda del profesional")
        }
        icon={CalendarDays}
        actions={
          <AgendaCalendarSwitcher
            active={agendaView}
            onChange={onAgendaViewChange}
          />
        }
      />

      {!professionalId ? (
        <EmptyState
          icon={Stethoscope}
          title={t("El usuario no es un profesional clínico")}
          description={t(
            "La agenda de Citas requiere una asignación clínica en el ERP.",
          )}
        />
      ) : (
        <>
          {/* Controles: rango + búsqueda */}
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
                  <ToggleGroupItem key={option.key} value={option.key}>
                    <Icon data-icon="inline-start" />
                    {option.label}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            <span className="text-[12px] text-muted-foreground">
              {appointments.length} cita
              {appointments.length === 1 ? "" : "s"} {t("en el rango")}
            </span>

            <div className="relative ml-auto">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={filters.query}
                onChange={(e) => filters.setQuery(e.target.value)}
                placeholder={t("Buscar paciente")}
                aria-label={t("Buscar paciente por nombre")}
                className="h-8 w-44 pl-8 text-[12.5px]"
              />
            </div>

            <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
              <CalendarPlus data-icon="inline-start" />
              {t("Nueva cita")}
            </Button>
          </div>

          {/* Chips de resumen: clicables, filtran como la toolbar del calendario */}
          <div className="flex flex-wrap items-center gap-2">
            {summaryStatuses.map((status) => {
              const count = filters.countsByStatus.get(status) ?? 0;
              if (count === 0) return null;
              const active = filters.statuses?.includes(status) ?? false;
              const color = appointmentStatusColor(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => filters.toggleStatus(status)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "border-transparent shadow-sm"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                  style={
                    active
                      ? { backgroundColor: color.bg, color: color.text }
                      : undefined
                  }
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: appointmentStatusDot(status) }}
                    aria-hidden="true"
                  />
                  <span className="text-[12px] font-medium">
                    {appointmentStatusLabel[status]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11.5px] font-bold",
                      active ? "" : "text-foreground",
                    )}
                    style={
                      active
                        ? { backgroundColor: "rgba(0,0,0,0.08)" }
                        : undefined
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {filters.activeCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2 text-[11.5px] text-muted-foreground"
                onClick={filters.clear}
              >
                <X className="size-3.5" data-icon="inline-start" />
                {t("Limpiar filtros")}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
              <p className="text-sm text-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={refetch}>
                {t("Reintentar")}
              </Button>
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={() => <AnimatedIcon name="medical-kit" size={40} />}
              title={t("Sin citas en el rango")}
              description={t("No hay citas programadas para este período.")}
            />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("Sin resultados")}
              description={t(
                "Ninguna cita coincide con los filtros aplicados.",
              )}
            />
          ) : (
            <div className="flex flex-col gap-1">
              {groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-2">
                  {/* Encabezado sticky del día */}
                  <header
                    className={cn(
                      "sticky top-0 z-10 -mx-1 flex items-center gap-2.5 rounded-xl border px-3 py-2 backdrop-blur-sm",
                      group.isToday
                        ? "border-primary/30 bg-primary-soft"
                        : "border-border/60 bg-background/95",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        group.isToday
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <CalendarCheck className="size-3.5" />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">
                      {group.label}
                    </span>
                    <span className="ml-auto text-[11.5px] font-medium text-muted-foreground">
                      {group.items.length} cita
                      {group.items.length === 1 ? "" : "s"}
                    </span>
                  </header>
                  {group.items.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onOpen={(anchor) =>
                        setEventPopover({ appointment, anchor })
                      }
                      onDetail={() =>
                        router.push(`/appointments/citas/${appointment.id}`)
                      }
                      onJoin={() =>
                        router.push(`/appointments/sala/${appointment.id}`)
                      }
                      onCancel={() => actions.openCancel(appointment)}
                      onReschedule={() => actions.openReschedule(appointment)}
                    />
                  ))}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Popover de evento (mismo componente que el calendario) */}
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

      {/* Cancelación / reprogramación (diálogos compartidos) */}
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

      {/* Creación de cita (mismo diálogo que el calendario) */}
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
    </div>
  );
}

/**
 * Fila de la agenda: riel temporal con hora destacada, datos de la cita y
 * acciones rápidas según estado. El click abre el popover del evento; las
 * acciones destructivas abren los diálogos compartidos.
 */
function AppointmentRow({
  appointment,
  onOpen,
  onDetail,
  onJoin,
  onCancel,
  onReschedule,
}: {
  appointment: AppointmentDto;
  onOpen: (anchor: Element) => void;
  onDetail: () => void;
  onJoin: () => void;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const t = useT();
  const color = appointmentStatusColor(appointment.status);
  const cancellable =
    appointment.status === "Confirmed" || appointment.status === "Requested";
  const reschedulable = appointment.status === "Confirmed";
  const joinable =
    appointment.status === "Confirmed" || appointment.status === "InProgress";
  const faded =
    appointment.status === "Cancelled" || appointment.status === "NoShow";

  return (
    <div
      className={cn(
        "group flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md",
        faded && "opacity-70",
      )}
    >
      <button
        onClick={(e) => onOpen(e.currentTarget)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={t("Ver detalles de la cita de {name}", {
          name: appointment.patientName ?? t("Paciente"),
        })}
      >
        {/* Riel temporal */}
        <div className="flex w-16 shrink-0 flex-col items-start border-r border-border pr-3">
          <span className="text-[14px] font-bold text-foreground">
            {formatTime(appointment.scheduledStart)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatTime(appointment.scheduledEnd)}
          </span>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold"
          style={{ backgroundColor: color.bg, color: color.dot }}
          aria-hidden="true"
        >
          {appointment.patientName ? (
            initialsOf(appointment.patientName)
          ) : (
            <Video className="size-4.5" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-px">
          <span
            className={cn(
              "truncate text-[13.5px] font-semibold text-foreground",
              faded && "line-through",
            )}
          >
            {appointment.patientName ?? t("Paciente")}
          </span>
          <span className="truncate text-[12px] text-muted-foreground">
            {appointment.specialtyName ?? t("Especialidad")} ·{" "}
            {appointment.locationName ?? t("Sede")}
          </span>
          {appointment.cancellationReason && (
            <span className="truncate text-[11.5px] text-muted-foreground/70">
              {t("Motivo")}: {appointment.cancellationReason}
            </span>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge
          status={appointmentStatusLabel[appointment.status]}
          color={color}
        />
        <Button size="sm" variant="outline" onClick={onDetail}>
          <ClipboardList data-icon="inline-start" /> {t("Detalle")}
        </Button>
        {joinable && (
          <Button size="sm" onClick={onJoin}>
            <Video data-icon="inline-start" /> {t("Unirme")}
          </Button>
        )}
        {reschedulable && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReschedule}
            aria-label={t("Reprogramar")}
          >
            <CalendarDays data-icon="inline-start" />
          </Button>
        )}
        {cancellable && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={onCancel}
            aria-label={t("Cancelar")}
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
  isToday: boolean;
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
      map.set(key, {
        key,
        date,
        label: "",
        isToday: false,
        items: [appointment],
      });
    }
  }
  const today = new Date();
  return [...map.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((group) => ({
      ...group,
      isToday: startOfDay(group.date).getTime() === startOfDay(today).getTime(),
      items: group.items
        .slice()
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime(),
        ),
      label: formatDayHeader(group.date, today),
    }));
}

/** Iniciales del paciente (2 letras) para el avatar de la fila. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const second =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${second}`.toUpperCase();
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
