"use client";

import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { AllAgendasPage } from "./all-agendas-page";
import { ProfessionalAgenda } from "./professional-agenda";

/**
 * Router de la agenda por capacidades: el administrador ve la agenda de
 * cualquier profesional (selector global); el profesional clínico su propia
 * agenda. Extensible: un rol futuro solo agrega un caso declarativo.
 */
export function AgendaRouter({
  initialDate = null,
}: {
  initialDate?: string | null;
}) {
  const { can } = useAppContext();

  if (hasAppointmentPermission(can, "Appointments.AdminView")) {
    return <AllAgendasPage initialDate={initialDate} />;
  }

  return <ProfessionalAgenda initialDate={initialDate} />;
}
