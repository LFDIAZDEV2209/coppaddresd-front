/**
 * Servicio de autenticación del frontend contra el microservicio de Auth.
 *
 * Flujo:
 * - login: POST /api/auth/login → recibe access token (el refresh token queda
 *   en cookie HttpOnly puesta por el servidor) → GET /api/auth/me para la sesión.
 * - restore: POST /api/auth/refresh (cookie) → nuevo access token → /api/auth/me.
 * - logout: POST /api/auth/logout con la cookie (el servidor revoca y limpia).
 */

import { env } from "@/lib/config/env";
import { ApiError, apiFetch, refreshAccessToken, setAccessToken } from "./http";
import type { AuthSession, LoginResult } from "./types";

interface TokenResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface MeResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

/**
 * Credenciales del usuario admin de demostración (seed del Auth Service).
 * Solo se muestran en desarrollo para agilizar las pruebas.
 */
export const DEMO_CREDENTIALS = {
  email: "admin@coppaddresd.com",
  password: "Test@1234",
  role: "Admin",
} as const;

export function getDemoCredentials() {
  return [DEMO_CREDENTIALS];
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<LoginResult> {
  try {
    const data = await apiFetch<TokenResponseDto>(
      `${env.apiUrl}/api/auth/login`,
      {
        method: "POST",
        auth: false,
        retry: false,
        body: JSON.stringify({
          email,
          password,
          rememberMe,
          application: env.applicationCode,
        }),
      },
    );

    setAccessToken(data.accessToken);
    const session = await fetchCurrentUser();

    return { success: true, session };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ApiError
          ? error.message
          : "Error inesperado. Intenta de nuevo.",
    };
  }
}

/**
 * Restaura la sesión al cargar la aplicación: refresca el access token con la
 * cookie HttpOnly y obtiene el usuario actual. Devuelve null si la sesión ya
 * no es válida (cookie ausente, expirada, revocada o servicio no disponible).
 */
export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const outcome = await refreshAccessToken();
    if (!outcome.ok) {
      // Sin sesión previa o cookie inválida: no hay nada que restaurar.
      return null;
    }
    const session = await fetchCurrentUser();
    return session;
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<AuthSession> {
  const me = await apiFetch<MeResponseDto>(`${env.apiUrl}/api/auth/me`);

  const name = `${me.firstName} ${me.lastName}`.trim();
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return {
    id: me.id,
    email: me.email,
    firstName: me.firstName,
    lastName: me.lastName,
    name,
    initials: initials || "CA",
    roles: me.roles,
    permissions: me.permissions,
  };
}

/**
 * Cierra la sesión en el Auth Service (revoca refresh tokens y limpia la
 * cookie HttpOnly). Best effort: si el servicio no responde, el estado local
 * igualmente se limpia y la cookie caduca por sí sola.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch(`${env.apiUrl}/api/auth/logout`, {
      method: "POST",
      auth: false,
      retry: false,
    });
  } catch {
    // Best effort: el logout local no debe fallar por el servicio.
  } finally {
    setAccessToken(null);
  }
}