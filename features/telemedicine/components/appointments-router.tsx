"use client";

import { useAppContext } from "@/providers/context-provider";
import { AdminAppointments } from "./admin-appointments";

/**
 * Router de citas por capacidades: el administrador ve TODAS las citas
 * (listado global con filtros); el profesional clínico ve el MISMO listado
 * pero acotado a sus propias citas (alcance por identidad del JWT).
 */
export function AppointmentsRouter() {
  const { can } = useAppContext();

  if (can("Telemedicine.AdminView")) {
    return <AdminAppointments scope="admin" />;
  }

  return <AdminAppointments scope="professional" />;
}
