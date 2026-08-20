/**
 * Invitaciones de primer acceso (onboarding del profesional).
 * Endpoints públicos del Auth Service: validar el token y aceptar la
 * invitación estableciendo la contraseña (nunca se envían credenciales).
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";

export interface InvitationValidation {
  valid: boolean;
  error?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  expiresAt?: string;
}

export async function validateInvitation(token: string): Promise<InvitationValidation> {
  return apiFetch<InvitationValidation>(
    `${env.authApiUrl}/api/invitations/validate?token=${encodeURIComponent(token)}`,
    { auth: false, retry: false },
  );
}

export async function acceptInvitation(token: string, password: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`${env.authApiUrl}/api/invitations/accept`, {
    method: "POST",
    auth: false,
    retry: false,
    body: JSON.stringify({ token, password }),
  });
}
