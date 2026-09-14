import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { PatientControlsDto } from "../types/erp";

const PATH = `${env.apiUrl}/api/v1/program/erp`;

/**
 * Controles de hitos del programa para un paciente: timeline, control actual,
 * próximo vencimiento y contadores de adherencia.
 */
export async function fetchPatientControls(
  patientId: string,
  signal?: AbortSignal,
): Promise<PatientControlsDto> {
  return apiFetch<PatientControlsDto>(
    `${PATH}/patients/${encodeURIComponent(patientId)}/controls`,
    { signal },
  );
}

/**
 * Firma un storage key y devuelve una URL temporal de descarga.
 * GET /api/v1/storage/sign — la firma vive ~15 minutos (900s).
 */
export async function signStorageKey(
  key: string,
  expiresInSeconds = 900,
): Promise<string> {
  const params = new URLSearchParams({
    key,
    expiresInSeconds: String(expiresInSeconds),
  });
  const result = await apiFetch<{ url: string; expiresInSeconds: number }>(
    `${env.apiUrl}/api/v1/storage/sign?${params.toString()}`,
  );
  return result.url;
}
