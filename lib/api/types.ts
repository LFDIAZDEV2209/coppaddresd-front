/**
 * Sesión de usuario autenticado. Se construye desde `GET /api/auth/me` del Auth
 * Service: incluye roles y permisos para que la autorización granular futura
 * (por rol, por permiso directo de usuario, o combinación) no requiera
 * rehacer la autenticación.
 */
export interface AuthSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

export type LogoutReason = "manual" | "expired";