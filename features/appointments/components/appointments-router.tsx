"use client";

import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { AdminAppointments } from "./admin-appointments";
import { ProfessionalAgenda } from "./professional-agenda";

/**
 * Router de citas por capacidades: el administrador ve TODAS las citas
 * (listado global con filtros); el profesional clínico las suyas (agenda).
 */
export function AppointmentsRouter() {
  const { can } = useAppContext();

  if (hasAppointmentPermission(can, "Appointments.AdminView")) {
    return <AdminAppointments />;
  }

  return <ProfessionalAgenda />;
}