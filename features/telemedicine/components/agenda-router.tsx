"use client";

import { useAppContext } from "@/providers/context-provider";
import { AllAgendasPage } from "./all-agendas-page";
import { ProfessionalAgenda } from "./professional-agenda";

/**
 * Router de la agenda por capacidades: el administrador ve la agenda de
 * cualquier profesional (selector global); el profesional clínico su propia
 * agenda. Extensible: un rol futuro solo agrega un caso declarativo.
 */
export function AgendaRouter() {
  const { can } = useAppContext();

  if (can("Telemedicine.AdminView")) {
    return <AllAgendasPage />;
  }

  return <ProfessionalAgenda />;
}