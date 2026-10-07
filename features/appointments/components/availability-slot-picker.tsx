"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarClock, Clock3, Loader2 } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { getDateLocale } from "@/lib/i18n/date-locale";
import {
  fetchAvailabilityRange,
  fetchAvailabilitySlots,
} from "../services/appointments-service";
import type { AvailabilitySlotDto } from "../types";

/** Días de la ventana para buscar los horarios más cercanos cuando la fecha no tiene cupos. */
const NEAREST_WINDOW_DAYS = 14;
/** Máximo de horarios cercanos que se ofrecen como chips. */
const NEAREST_SLOTS_LIMIT = 6;

export function AvailabilitySlotPicker({
  professionalId,
  specialtyId,
  organizationId,
  clinicId,
  locationId,
  date,
  selectedStart,
  onSelect,
}: {
  professionalId?: string | null;
  specialtyId?: string | null;
  organizationId?: string | null;
  clinicId?: string | null;
  locationId?: string | null;
  date: string;
  selectedStart?: string | null;
  onSelect: (slot: AvailabilitySlotDto) => void;
}) {
  const t = useT();
  const onSelectRef = useRef(onSelect);
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>([]);
  const [nearestSlots, setNearestSlots] = useState<AvailabilitySlotDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearestLoading, setNearestLoading] = useState(false);
  const [nearestFailed, setNearestFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Callback estable: lee la ref solo al hacer clic, nunca durante el render.
  const handleSelect = useCallback((slot: AvailabilitySlotDto) => {
    onSelectRef.current(slot);
  }, []);

  useEffect(() => {
    if (!date || (!professionalId && !specialtyId)) {
      return;
    }

    const controller = new AbortController();
    // El estado de carga representa la petición externa iniciada por este efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    void fetchAvailabilitySlots({
      professionalId,
      specialtyId,
      organizationId,
      clinicId,
      locationId,
      date,
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        const available = response.slots.filter((slot) => slot.isAvailable);
        setSlots(available);
        setLoading(false);

        if (available.length > 0) {
          setNearestSlots([]);
          setNearestLoading(false);
          return;
        }

        // Sin cupos ese día: se consultan y ofrecen los horarios más cercanos.
        setNearestSlots([]);
        setNearestFailed(false);
        setNearestLoading(true);
        return fetchAvailabilityRange({
          professionalId,
          specialtyId,
          organizationId,
          clinicId,
          locationId,
          from: date,
          to: addDays(date, NEAREST_WINDOW_DAYS - 1),
          signal: controller.signal,
        })
          .then((range) => {
            if (controller.signal.aborted) return;
            setNearestSlots(
              range.days
                .flatMap((day) => day.slots)
                .filter((slot) => slot.isAvailable)
                .toSorted(
                  (a, b) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime(),
                )
                .slice(0, NEAREST_SLOTS_LIMIT),
            );
          })
          .catch(() => {
            if (!controller.signal.aborted) setNearestFailed(true);
          })
          .finally(() => {
            if (!controller.signal.aborted) setNearestLoading(false);
          });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSlots([]);
        setNearestSlots([]);
        setNearestLoading(false);
        setNearestFailed(false);
        setError(
          reason instanceof Error && reason.message
            ? reason.message
            : t("No se pudo consultar la disponibilidad."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [clinicId, date, locationId, organizationId, professionalId, specialtyId, t]);

  if (!professionalId && !specialtyId) {
    return (
      <p className="text-[11.5px] text-muted-foreground" role="status">
        {t("Selecciona un profesional para consultar sus horarios.")}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        {t("Consultando horarios disponibles…")}
      </div>
    );
  }

  if (error) {
    return <p className="text-[12px] text-destructive" role="alert">{error}</p>;
  }

  if (slots.length === 0) {
    // Día sin cupos: mensaje base + próximos horarios (cargando, chips o
    // aviso de que tampoco hay cupos en la ventana consultada).
    let nearestContent: ReactNode = null;
    if (nearestLoading) {
      nearestContent = (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {t("Buscando los próximos horarios…")}
        </div>
      );
    } else if (nearestSlots.length > 0) {
      nearestContent = (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("Próximos horarios disponibles")}
          </p>
          <div
            className="grid grid-cols-2 gap-2"
            aria-label={t("Próximos horarios disponibles")}
          >
            {nearestSlots.map((slot) => (
              <SlotButton
                key={slot.start}
                slot={slot}
                selected={isSlotSelected(selectedStart, slot)}
                icon={<CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />}
                subtitle={formatSlotDay(slot.start)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      );
    } else if (!nearestFailed) {
      nearestContent = (
        <p className="text-[12px] text-muted-foreground" role="status">
          {t("No hay horarios disponibles en los próximos 14 días.")}
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] text-muted-foreground" role="status">
          {t("No hay horarios disponibles para esta fecha.")}
        </p>
        {nearestContent}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={t("Horarios disponibles")}>
      {slots.map((slot) => (
        <SlotButton
          key={slot.start}
          slot={slot}
          selected={isSlotSelected(selectedStart, slot)}
          icon={<Clock3 className="size-3.5 shrink-0" aria-hidden="true" />}
          subtitle={t("{minutes} min", { minutes: String(slot.durationMinutes) })}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

function SlotButton({
  slot,
  selected,
  icon,
  subtitle,
  onSelect,
}: {
  slot: AvailabilitySlotDto;
  selected: boolean;
  icon: ReactNode;
  subtitle: string;
  onSelect: (slot: AvailabilitySlotDto) => void;
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      aria-pressed={selected}
      className="h-auto justify-start gap-2 px-3 py-2 text-left"
      onClick={() => onSelect(slot)}
    >
      {icon}
      <span>
        <span className="block text-sm font-semibold">{formatSlotTime(slot.start)}</span>
        <span className="block text-[10px] opacity-75">{subtitle}</span>
      </span>
    </Button>
  );
}

function isSlotSelected(
  selectedStart: string | null | undefined,
  slot: AvailabilitySlotDto,
): boolean {
  return selectedStart
    ? new Date(selectedStart).getTime() === new Date(slot.start).getTime()
    : false;
}

function formatSlotTime(value: string): string {
  return new Intl.DateTimeFormat(getDateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSlotDay(value: string): string {
  return new Intl.DateTimeFormat(getDateLocale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function addDays(dateValue: string, days: number): string {
  // Mediodía local: evita saltos de día al sumar por zona horaria.
  const base = new Date(`${dateValue}T12:00:00`);
  base.setDate(base.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}
