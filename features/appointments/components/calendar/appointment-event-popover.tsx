"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ClipboardList,
  MapPin,
  Stethoscope,
  User,
  Video,
  X,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatDate,
  formatRange,
  formatTime,
} from "../../utils/format";
import type { AppointmentDto } from "../../types";

/**
 * Popover contextual de evento (estilo calendario corporativo): muestra los
 * datos de la cita y las acciones soportadas por la lógica de negocio según
 * estado — Ver detalle (siempre), Unirme (Confirmed/InProgress), Reprogramar
 * (Confirmed), Cancelar (Confirmed/Requested). En pantallas angostas se
 * presenta como sheet inferior con el mismo contenido.
 */
export function AppointmentEventPopover({
  appointment,
  anchor,
  onOpenChange,
  onCancel,
  onReschedule,
  onJoin,
}: {
  appointment: AppointmentDto | null;
  anchor: Element | null;
  onOpenChange: (open: boolean) => void;
  onCancel: (appointment: AppointmentDto) => void;
  onReschedule: (appointment: AppointmentDto) => void;
  onJoin?: (appointment: AppointmentDto) => void;
}) {
  const isDesktop = useIsDesktop();
  const open = appointment !== null;
  const t = useT();

  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onOpenChange(false);
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl px-0 pb-16"
        >
          <SheetTitle className="sr-only">
            {appointment?.patientName ?? t("Cita")}
          </SheetTitle>
          {appointment && (
            <EventBody
              appointment={appointment}
              onCancel={onCancel}
              onReschedule={onReschedule}
              onJoin={onJoin}
              onClose={() => onOpenChange(false)}
              showCloseButton
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        anchor={anchor}
        side="right"
        align="start"
        sideOffset={8}
        className="w-84 gap-0 overflow-hidden rounded-xl p-0 shadow-lg ring-1 ring-foreground/10"
      >
        {appointment && (
          <EventBody
            appointment={appointment}
            onCancel={onCancel}
            onReschedule={onReschedule}
            onJoin={onJoin}
            onClose={() => onOpenChange(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Cuerpo compartido por popover y sheet (misma información y acciones). */
function EventBody({
  appointment,
  onCancel,
  onReschedule,
  onJoin,
  onClose,
  showCloseButton = false,
}: {
  appointment: AppointmentDto;
  onCancel: (appointment: AppointmentDto) => void;
  onReschedule: (appointment: AppointmentDto) => void;
  onJoin?: (appointment: AppointmentDto) => void;
  onClose: () => void;
  /** Botón de cierre propio en la cabecera (variante sheet sin X del layout). */
  showCloseButton?: boolean;
}) {
  const t = useT();
  const color = appointmentStatusColor(appointment.status);
  const cancellable =
    appointment.status === "Confirmed" || appointment.status === "Requested";
  const reschedulable = appointment.status === "Confirmed";
  const joinable =
    (appointment.status === "Confirmed" ||
      appointment.status === "InProgress") &&
    Boolean(onJoin);

  return (
    <div className="flex flex-col">
      {/* Cabecera: franja de estado + horario protagonista (estilo Teams) */}
      <div
        className="relative flex flex-col gap-1 px-4 pt-3.5 pb-3"
        style={{ backgroundColor: color.bg }}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Cerrar")}
            className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ color: color.text }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
        <div className="flex items-center justify-between gap-2 pr-8">
          <span
            className="min-w-0 text-[15px] font-bold leading-none"
            style={{ color: color.text }}
          >
            {formatTime(appointment.scheduledStart)} –{" "}
            {formatTime(appointment.scheduledEnd)}
          </span>
          <span
            className="inline-flex max-w-[55%] shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.16)",
              color: color.text,
            }}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: color.dot }}
              aria-hidden="true"
            />
            <span className="truncate min-w-0">
              {t(appointmentStatusLabel[appointment.status])}
            </span>
          </span>
        </div>
        <span
          className="text-[12px] font-medium"
          style={{ color: color.text, opacity: 0.8 }}
        >
          {formatDate(appointment.scheduledStart)} ·{" "}
          {t("{n} min", { n: String(appointment.durationMinutes) })}
        </span>
      </div>

      {/* Detalle de la cita */}
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        <MetaRow icon={User} label={t("Paciente")}>
          <span className="truncate text-[13px] font-semibold text-foreground">
            {appointment.patientName ?? t("Paciente")}
          </span>
        </MetaRow>
        <MetaRow icon={Stethoscope} label={t("Profesional")}>
          <span className="truncate text-[12.5px] text-foreground">
            {appointment.professionalName ?? "—"}
          </span>
        </MetaRow>
        <MetaRow icon={ClipboardList} label={t("Tipo de consulta")}>
          <span className="truncate text-[12.5px] text-foreground">
            {appointment.specialtyName ?? "—"}
          </span>
        </MetaRow>
        <MetaRow icon={MapPin} label={t("Sede")}>
          <span className="truncate text-[12.5px] text-foreground">
            {appointment.locationName ?? "—"}
          </span>
        </MetaRow>
        {appointment.cancellationReason && (
          <p className="rounded-lg bg-destructive-soft px-3 py-2 text-[12px] text-destructive">
            <span className="font-semibold">{t("Motivo")}:</span>{" "}
            {appointment.cancellationReason}
          </p>
        )}
      </div>

      {/* Acciones según estado y permisos de la lógica actual */}
      <div className="flex flex-wrap items-stretch gap-2 border-t border-border px-4 py-3.5">
        <Link
          href={`/appointments/citas/${appointment.id}`}
          onClick={onClose}
          className={`${buttonLinkClass} min-w-32 flex-1 justify-center`}
        >
          <ClipboardList data-icon="inline-start" className="size-3.5" />
          {t("Ver detalle")}
        </Link>
        {joinable && (
          <Button
            size="sm"
            className="min-w-32 flex-1"
            onClick={() => onJoin?.(appointment)}
          >
            <Video data-icon="inline-start" className="size-3.5" />
            {t("Unirme")}
          </Button>
        )}
        {reschedulable && (
          <Button
            size="sm"
            variant="outline"
            className="min-w-32 flex-1"
            onClick={() => {
              onClose();
              onReschedule(appointment);
            }}
          >
            <CalendarClock data-icon="inline-start" className="size-3.5" />
            {t("Reprogramar")}
          </Button>
        )}
        {cancellable && (
          <Button
            size="sm"
            variant="ghost"
            className="min-w-32 flex-1 text-muted-foreground hover:text-destructive"
            onClick={() => {
              onClose();
              onCancel(appointment);
            }}
          >
            {t("Cancelar")}
          </Button>
        )}
      </div>
    </div>
  );
}

const buttonLinkClass =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </span>
      <span className="sr-only">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** null = aún sin resolver (evita parpadeo de variante durante hidratación). */
function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/** Rango legible reutilizable fuera del popover (tooltip del evento). */
export function eventTooltip(appointment: AppointmentDto): string {
  return formatRange(appointment.scheduledStart, appointment.scheduledEnd);
}
