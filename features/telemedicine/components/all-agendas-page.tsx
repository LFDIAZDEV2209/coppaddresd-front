"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { ProfessionalSelector } from "./professional-selector";
import { ProfessionalAgenda } from "./professional-agenda";

/**
 * Vista global del administrador: la agenda de cualquier profesional clínico
 * (selector + acciones de cancelación/reprogramación con actor Admin). Si el
 * admin además es profesional, por defecto selecciona el primero del catálogo.
 */
export function AllAgendasPage({
  initialDate = null,
}: {
  initialDate?: string | null;
}) {
  const [professionalId, setProfessionalId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-primary-soft px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="size-4.5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[13px] font-semibold text-primary-strong">
              Agenda de profesionales
            </p>
            <p className="text-[11.5px] text-primary-strong/70">
              Seleccioná un profesional para ver y gestionar sus citas.
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
        <ProfessionalAgenda
          fixedProfessionalId={professionalId}
          cancelledBy="Admin"
          initialDate={initialDate}
        />
      )}
    </div>
  );
}
