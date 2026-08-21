/**
 * Configuración centralizada de variables de entorno del frontend.
 * Todas las URLs de servicios se leen desde aquí (nunca hardcodeadas).
 */
export const env = {
  authApiUrl:
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? "http://localhost:5123",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5122",
  // Microservicio de Telemedicina (schema tele). Comparte el JWT del Auth
  // Service; el frontend lo consume solo para /api/v1/telemedicine/*.
  telemedicineApiUrl:
    process.env.NEXT_PUBLIC_TELEMEDICINE_API_URL ?? "http://localhost:5130",
  // Código de aplicación que identifica este cliente ante el Auth Service
  // ("erp" para el frontend administrativo, "app" para la móvil). Determina
  // el claim `aud` del JWT y el acceso vía UserApplication.
  applicationCode: process.env.NEXT_PUBLIC_APPLICATION_CODE ?? "erp",
  sessionIdleMinutes: Number(
    process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? "30",
  ),
} as const;