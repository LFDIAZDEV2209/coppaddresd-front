"use client";

import { useAppContext } from "@/providers/context-provider";
import { AllCalendarsPage } from "./all-calendars-page";
import { ProfessionalCalendar } from "./professional-calendar";

/**
 * Router del calendario por capacidades: el administrador ve el calendario de
 * cualquier profesional (selector global); el profesional el suyo.
 */
export function CalendarRouter() {
  const { can } = useAppContext();

  if (can("Telemedicine.AdminView")) {
    return <AllCalendarsPage />;
  }

  return <ProfessionalCalendar />;
}