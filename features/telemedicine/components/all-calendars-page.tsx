"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { ProfessionalSelector } from "./professional-selector";
import { ProfessionalCalendar } from "./professional-calendar";

/**
 * Vista global del administrador: el calendario de cualquier profesional
 * clínico (selector + grid mensual/semanal).
 */
export function AllCalendarsPage() {
  const [professionalId, setProfessionalId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-primary-soft px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="size-4.5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[13px] font-semibold text-primary-strong">
              Calendario de profesionales
            </p>
            <p className="text-[11.5px] text-primary-strong/70">
              Seleccioná un profesional para ver y gestionar sus citas en el
              calendario.
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-72">
            <ProfessionalSelector
              value={professionalId}
              onChange={setProfessionalId}
            />
          </div>
        </div>
      </div>
      {professionalId && (
        <ProfessionalCalendar fixedProfessionalId={professionalId} />
      )}
    </div>
  );
}
