"use client";

import { useAdminSummary } from "../hooks/use-admin";
import { RequestsInbox } from "./requests-inbox";

/**
 * Solicitudes globales (vista admin, requiere Telemedicine.AdminView): la
 * bandeja compartida en modo monitoreo, sin acción de confirmación.
 */
export function AdminRequests() {
  const summary = useAdminSummary();

  return <RequestsInbox scope="admin" summary={summary} />;
}
