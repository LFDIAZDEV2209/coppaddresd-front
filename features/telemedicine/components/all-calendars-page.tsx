"use client";

import { useState } from "react";
import { ProfessionalSelector } from "./professional-selector";
import { ProfessionalCalendar } from "./professional-calendar";

/**
 * Vista global del administrador: el calendario mensual de cualquier
 * profesional clínico (selector de profesional + grid mensual).
 */
export function AllCalendarsPage() {
  const [professionalId, setProfessionalId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="px-6 pt-6">
        <ProfessionalSelector value={professionalId} onChange={setProfessionalId} />
      </div>
      {professionalId && (
        <ProfessionalCalendar fixedProfessionalId={professionalId} />
      )}
    </div>
  );
}