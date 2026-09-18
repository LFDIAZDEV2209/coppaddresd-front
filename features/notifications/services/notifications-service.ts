/**
 * Servicio de notificaciones push (device tokens FCM).
 *
 * Contrato del backend (`NotificationsController`):
 * - `POST /api/v1/notifications/devices` con `{ token, platform }` autenticado
 *   por JWT: hace upsert del par (usuario, token). La plataforma se normaliza a
 *   minúsculas; "web" queda como tal y el envío FCM la trata igual que las
 *   nativas (la app móvil usa "android" | "ios").
 */

import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";

const NOTIFICATIONS_PATH = `${env.apiUrl}/api/v1/notifications`;

export type DevicePlatform = "web" | "android" | "ios";

export interface RegisterDeviceInput {
  token: string;
  platform: DevicePlatform;
}

export interface DeviceTokenDto {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: string;
  updatedAt?: string | null;
}

/** Registra (upsert) el token del dispositivo actual para el usuario del JWT. */
export async function registerDevice(
  input: RegisterDeviceInput,
): Promise<DeviceTokenDto> {
  return apiFetch<DeviceTokenDto>(`${NOTIFICATIONS_PATH}/devices`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
