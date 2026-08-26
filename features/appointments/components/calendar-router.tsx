"use client";

import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { AllCalendarsPage } from "./all-calendars-page";
import { ProfessionalCalendar } from "./professional-calendar";

/**
 * Router del calendario por capacidades: el administrador ve el calendario de
 * cualquier profesional (selector global); el profesional el suyo.
 */
export function CalendarRouter() {
  const { can } = useAppContext();

  if (hasAppointmentPermission(can, "Appointments.AdminView")) {
    return <AllCalendarsPage />;
  }

  return <ProfessionalCalendar />;
}