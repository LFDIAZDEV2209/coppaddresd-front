"use client";

import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { AdminAppointments } from "./admin-appointments";

/**
 * Router de citas por capacidades: el administrador ve TODAS las citas
 * (listado global con filtros); el profesional clínico ve el MISMO listado
 * pero acotado a sus propias citas (alcance por identidad del JWT).
 * El gate acepta el código nuevo (Appointments.AdminView) o su alias legacy
 * (Telemedicine.AdminView) durante la transición de permisos.
 */
export function AppointmentsRouter() {
  const { can } = useAppContext();

  if (hasAppointmentPermission(can, "Appointments.AdminView")) {
    return <AdminAppointments scope="admin" />;
  }

  return <AdminAppointments scope="professional" />;
}
