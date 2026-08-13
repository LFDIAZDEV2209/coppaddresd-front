/**
 * Configuración centralizada de variables de entorno del frontend.
 * Todas las URLs de servicios se leen desde aquí (nunca hardcodeadas).
 */
export const env = {
  authApiUrl:
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? "http://localhost:5058",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5122",
  sessionIdleMinutes: Number(
    process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? "30",
  ),
} as const;