"use client";

import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { AdminRequests } from "./admin-requests";
import { ProfessionalRequests } from "./professional-requests";

/**
 * Router de solicitudes por capacidades: el administrador ve TODAS las
 * solicitudes (listado global); el profesional clínico las asignadas a él.
 */
export function RequestsRouter() {
  const { can } = useAppContext();

  if (hasAppointmentPermission(can, "Appointments.AdminView")) {
    return <AdminRequests />;
  }

  return <ProfessionalRequests />;
}