"use client";

import { useState } from "react";
import { ProfessionalSelector } from "./professional-selector";
import { ProfessionalAgenda } from "./professional-agenda";

/**
 * Vista global del administrador: la agenda de cualquier profesional clínico
 * (selector + acciones de cancelación/reprogramación con actor Admin). Si el
 * admin además es profesional, por defecto selecciona el primero del catálogo.
 */
export function AllAgendasPage() {
  const [professionalId, setProfessionalId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="px-6 pt-6">
        <ProfessionalSelector value={professionalId} onChange={setProfessionalId} />
      </div>
      {professionalId && (
        <ProfessionalAgenda
          fixedProfessionalId={professionalId}
          cancelledBy="Admin"
        />
      )}
    </div>
  );
}