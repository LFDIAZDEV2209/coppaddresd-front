import type { HealthAlert, PatientProfile } from "../types";

interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** El directorio enriquece la tabla; sí es obligatorio para notificar. */
export function resolveAlertData(
  alerts: LoadState<HealthAlert[]>,
  patients: LoadState<PatientProfile[]>,
  requirePatientDirectory: boolean,
  statusChanges: Record<string, HealthAlert["status"]>,
) {
  return {
    loading: alerts.loading || (requirePatientDirectory && patients.loading),
    error: alerts.error ?? (requirePatientDirectory ? patients.error : null),
    data:
      alerts.data === null || (requirePatientDirectory && patients.data === null)
        ? null
        : {
            alerts: alerts.data.map((alert) => ({
              ...alert,
              status: statusChanges[alert.id] ?? alert.status,
            })),
            patients: patients.data ?? [],
          },
  };
}

/** Usa únicamente nombres reales del directorio o del DTO de la alerta. */
export function alertPatientName(
  alert: HealthAlert,
  patient?: Pick<PatientProfile, "firstName" | "lastName">,
): string {
  const directoryName = patient
    ? `${patient.firstName} ${patient.lastName}`.trim()
    : "";
  return directoryName || alert.patientName?.trim() || "";
}
