/**
 * Configuración centralizada de variables de entorno del frontend.
 * Todas las URLs de servicios se leen desde aquí (nunca hardcodeadas).
 *
 * Desde el api-gateway-yarp, el frontend consume una única URL pública
 * (NEXT_PUBLIC_GATEWAY_URL) que apunta al gateway. El gateway enruta por
 * prefijo de path a cada microservicio (Auth, Api, Telemedicina), por lo que
 * ya no se necesitan URLs separadas por servicio.
 */
const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080";
// En desarrollo el navegador usa el proxy de Next, sin desactivar CORS.
const browserGatewayUrl = process.env.NODE_ENV === "development" && typeof window !== "undefined"
  ? window.location.origin
  : gatewayUrl;

export const env = {
  apiUrl: browserGatewayUrl,
  // Comunidad (GraphQL) — el servicio standalone de la comunidad se consume
  // SIEMPRE a través del gateway (ruta /api/v1/community y /storage). El
  // override NEXT_PUBLIC_COMMUNITY_API_URL solo existe para casos especiales
  // (p. ej. entorno sin gateway); por defecto es la misma URL del gateway.
  communityApiUrl:
    process.env.NEXT_PUBLIC_COMMUNITY_API_URL ??
    browserGatewayUrl,
  // Código de aplicación que identifica este cliente ante el Auth Service
  // ("erp" para el frontend administrativo, "app" para la móvil). Determina
  // el claim `aud` del JWT y el acceso vía UserApplication.
  applicationCode: process.env.NEXT_PUBLIC_APPLICATION_CODE ?? "erp",
  sessionIdleMinutes: Number(
    process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? "30",
  ),
} as const;
