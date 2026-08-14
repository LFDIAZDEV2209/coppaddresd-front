/**
 * Cliente HTTP central de la aplicación.
 *
 * Responsabilidades:
 * - Adjunta el access token (en memoria, nunca en localStorage) como Bearer.
 * - En 401: refresca la sesión con single-flight (una sola petición de
 *   refresh concurrente, evita loops) y reintenta la petición original una vez.
 * - Raza multi-pestaña: si el refresh devuelve 401 (otra pestaña rotó la
 *   cookie justo antes), reintenta una sola vez tras un breve delay — la
 *   cookie nueva ya quedó en el cookie jar compartido.
 * - Mapea errores a ApiError tipado (network, timeout, 401, 403, 429, 5xx).
 * - Timeout con AbortController.
 */

import { env } from "@/lib/config/env";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "bad-request"
  | "rate-limit"
  | "server"
  | "network"
  | "timeout";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface RefreshOutcome {
  ok: boolean;
  /** true: sesión inválida (refrescar es inútil). false: error transitorio. */
  invalid: boolean;
  /**
   * "missing": no había cookie (visitante sin sesión previa) — no se muestra
   * el banner de expiración. "invalid": cookie corrupta/expirada/revocada.
   */
  reason?: "missing" | "invalid";
  token?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

// El access token vive SOLO en memoria del proceso del navegador: no sobrevive
// recargas (se restaura vía refresh cookie) y es invisible para XSS persistente.
let accessToken: string | null = null;

let refreshPromise: Promise<RefreshOutcome> | null = null;

let onSessionInvalidated: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Registra el handler que ejecuta el AuthProvider cuando el refresh falla de
 * forma definitiva (cookie inválida/expirada/revocada): limpia la sesión y
 * redirige al login.
 */
export function setSessionInvalidatedHandler(handler: (() => void) | null): void {
  onSessionInvalidated = handler;
}

interface ApiRequestOptions extends RequestInit {
  /** Adjuntar Bearer token (default true). */
  auth?: boolean;
  /** Reintentar con refresh en 401 (default true). Login/logout: false. */
  retry?: boolean;
  timeoutMs?: number;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    retry = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: extraHeaders,
    signal: externalSignal,
    ...fetchInit
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Signal externo (p. ej. abort en cleanup de efectos): al abortarse, se
  // cancela también la petición interna. Evita requests huérfanos en doble
  // montaje de efectos (StrictMode en dev) y races de filtros/paginación.
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true },
      );
    }
  }

  try {
    const headers = new Headers(extraHeaders);
    if (auth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    if (fetchInit.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let response = await fetch(path, {
      ...fetchInit,
      headers,
      signal: controller.signal,
      credentials: "include",
    });

    if (
      response.status === 401 &&
      auth &&
      retry &&
      !isRefreshEndpoint(path)
    ) {
      const outcome = await refreshAccessToken();

      if (outcome.ok && outcome.token) {
        headers.set("Authorization", `Bearer ${outcome.token}`);
        response = await fetch(path, {
          ...fetchInit,
          headers,
          signal: controller.signal,
          credentials: "include",
        });
      } else if (outcome.invalid && outcome.reason === "invalid") {
        onSessionInvalidated?.();
        throw new ApiError(
          401,
          "unauthorized",
          "Tu sesión expiró. Inicia sesión nuevamente.",
        );
      } else if (outcome.invalid) {
        // Sin cookie previa: el request simplemente no está autenticado.
        throw new ApiError(401, "unauthorized", "No autorizado.");
      } else {
        throw new ApiError(
          0,
          "network",
          "No se pudo renovar la sesión. Verifica tu conexión e intenta de nuevo.",
        );
      }
    }

    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        0,
        "timeout",
        "El servidor tardó demasiado en responder. Intenta de nuevo.",
      );
    }
    throw new ApiError(
      0,
      "network",
      "No se pudo conectar con el servidor. Verifica tu conexión.",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  let detail: string | undefined;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
    ) {
      detail = (body as { message: string }).message;
    }
  } catch {
    // Respuesta sin cuerpo JSON: se usa el mensaje genérico.
  }

  switch (response.status) {
    case 401:
      return new ApiError(401, "unauthorized", detail ?? "No autorizado.");
    case 403:
      return new ApiError(
        403,
        "forbidden",
        detail ?? "No tienes permisos para realizar esta acción.",
      );
    case 429:
      return new ApiError(
        429,
        "rate-limit",
        detail ?? "Demasiadas peticiones. Intenta más tarde.",
      );
    default:
      if (response.status >= 500) {
        return new ApiError(
          response.status,
          "server",
          "El servicio no está disponible. Intenta más tarde.",
        );
      }
      return new ApiError(
        response.status,
        "bad-request",
        detail ?? "La solicitud no es válida.",
      );
  }
}

function isRefreshEndpoint(path: string): boolean {
  return path.endsWith("/api/auth/refresh");
}

/**
 * Renueva el access token usando la cookie HttpOnly de refresh.
 * Single-flight: llamadas concurrentes comparten una sola petición.
 */
export async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<RefreshOutcome> {
  try {
    const response = await fetch(`${env.authApiUrl}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const data = (await response.json()) as { accessToken?: string };
      if (!data.accessToken) {
        return { ok: false, invalid: true };
      }
      accessToken = data.accessToken;
      return { ok: true, invalid: false, token: data.accessToken };
    }

    if (response.status === 401) {
      // Raza multi-pestaña: otra pestaña pudo rotar la cookie en este instante.
      // Su Set-Cookie ya actualizó el cookie jar compartido: reintentar una vez.
      const firstReason = refreshReason(response);
      await delay(800);
      const retry = await fetch(`${env.authApiUrl}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (retry.ok) {
        const data = (await retry.json()) as { accessToken?: string };
        if (!data.accessToken) {
          return { ok: false, invalid: true, reason: "invalid" };
        }
        accessToken = data.accessToken;
        return { ok: true, invalid: false, token: data.accessToken };
      }

      return { ok: false, invalid: true, reason: firstReason };
    }

    // 5xx / error de red: la sesión sigue siendo válida, es un problema
    // transitorio del Auth Service. No se invalida la sesión.
    return { ok: false, invalid: false };
  } catch {
    return { ok: false, invalid: false };
  }
}

function refreshReason(response: Response): "missing" | "invalid" {
  const status = response.headers.get("x-refresh-status");
  return status === "missing" ? "missing" : "invalid";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}