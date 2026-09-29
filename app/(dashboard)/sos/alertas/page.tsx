import { SosAlertsInbox } from "@/features/sos/components/sos-alerts-inbox";

/**
 * Bandeja de alertas SOS del ERP (borrador Misión SOS Panic).
 * El gate del permiso `Sos.Alerts.Manage` vive en el componente (estado de
 * acceso denegado); la autorización real la aplica el backend en `aud=erp`
 * (design D5/D8 de openspec/changes/sos-panic-real).
 */
export default function Page() {
  return <SosAlertsInbox />;
}
