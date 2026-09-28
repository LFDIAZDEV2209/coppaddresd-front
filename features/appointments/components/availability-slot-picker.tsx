"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Loader2 } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { fetchAvailabilitySlots } from "../services/appointments-service";
import type { AvailabilitySlotDto } from "../types";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
        setSlots(response.slots.filter((slot) => slot.isAvailable));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSlots([]);
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
    return (
      <p className="text-[12px] text-muted-foreground" role="status">
        {t("No hay horarios disponibles para esta fecha.")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={t("Horarios disponibles")}>
      {slots.map((slot) => {
        const selected = selectedStart
          ? new Date(selectedStart).getTime() === new Date(slot.start).getTime()
          : false;
        return (
          <Button
            key={slot.start}
            type="button"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            className="h-auto justify-start gap-2 px-3 py-2 text-left"
            onClick={() => onSelectRef.current(slot)}
          >
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">{formatSlotTime(slot.start)}</span>
              <span className="block text-[10px] opacity-75">{t("{minutes} min", { minutes: String(slot.durationMinutes) })}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function formatSlotTime(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
