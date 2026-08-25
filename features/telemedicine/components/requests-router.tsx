"use client";

import { useAppContext } from "@/providers/context-provider";
import { AdminRequests } from "./admin-requests";
import { ProfessionalRequests } from "./professional-requests";

/**
 * Router de solicitudes por capacidades: el administrador ve TODAS las
 * solicitudes (listado global); el profesional clínico las asignadas a él.
 */
export function RequestsRouter() {
  const { can } = useAppContext();

  if (can("Telemedicine.AdminView")) {
    return <AdminRequests />;
  }

  return <ProfessionalRequests />;
}