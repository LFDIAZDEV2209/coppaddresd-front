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
  | "validation"
  | "bad-request"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "server"
  | "unavailable"
  | "network"
  | "timeout";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Errores de validación por propiedad (RFC 7807 `errors` / `validationErrors`). */
  readonly errors?: Record<string, string[]>;
  /** Correlation ID del backend para soporte. */
  readonly correlationId?: string;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options?: { errors?: Record<string, string[]>; correlationId?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = options?.errors;
    this.correlationId = options?.correlationId;
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

// Timeout global moderado: cubre la gran mayoría de las peticiones (listas,
// guardados, auth, refresh). Las llamadas de larga duración (p. ej. generación
// con IA) deben pasar un `timeoutMs` explícito en lugar de inflar este default,
// que de otro modo retrasaría hasta ~95s la aparición de errores de red/5xx.
const DEFAULT_TIMEOUT_MS = 30_000;

// El access token vive SOLO en memoria del proceso del navegador: no sobrevive
// recargas (se restaura vía refresh cookie) y es invisible para XSS persistente.
let accessToken: string | null = null;

// Contexto organizacional activo (clínica seleccionada en el switcher). Vive en
// memoria junto al token: el backend lo valida por request (permisos scoped).
let activeClinicId: string | null = null;

let refreshPromise: Promise<RefreshOutcome> | null = null;

let onSessionInvalidated: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setActiveClinicId(clinicId: string | null): void {
  activeClinicId = clinicId;
}

export function getActiveClinicId(): string | null {
  return activeClinicId;
}

/**
 * Registra el handler que ejecuta el AuthProvider cuando el refresh falla de
 * forma definitiva (cookie inválida/expirada/revocada): limpia la sesión y
 * redirige al login.
 */
export function setSessionInvalidatedHandler(
  handler: (() => void) | null,
): void {
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
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const headers = new Headers(extraHeaders);
    if (auth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    if (activeClinicId && !headers.has("X-Clinic-Id")) {
      headers.set("X-Clinic-Id", activeClinicId);
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

    if (response.status === 401 && auth && retry && !isRefreshEndpoint(path)) {
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
    const isAbort =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (isAbort) {
      if (externalSignal?.aborted) {
        throw error;
      }
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

/**
 * Revierte el doble-encoding UTF-8→Latin-1→UTF-8 que a veces viaja en los
 * mensajes de error del backend (QA 02-10: "Credenciales inválidas").
 * LA CAUSA RAÍZ está en literales del backend (gap documentado); aquí se
 * compensa de forma reversible y conservadora: SOLO se corrige si la cadena
 * es 100 % una re-interpretación Latin-1 decodable como UTF-8 (sin
 * caracteres sospechosos de falso positivo); si algo no casa, se conserva
 * la original.
 */
const MOJIBAKE_SUSPECT = /[\u00C2\u00C3\u00C4\u00C5][\u0080-\u00BF]/;

function deMojibake(text: string): string {
  if (!text || !MOJIBAKE_SUSPECT.test(text)) return text;
  // Cada codepoint debe estar en Latin-1 (si no, NO es un artefacto de
  // double-encoding: devolver la original sin tocar).
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i) ?? 0;
    if (code > 0xff) return text;
    bytes[i] = code;
  }
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Secuencia no representable en UTF-8: mantenemos la original.
    return text;
  }
  return decoded.includes("\uFFFD") ? text : decoded;
}

async function toApiError(response: Response): Promise<ApiError> {
  // Problema RFC 7807 (ProblemDetails) del backend o fallback `message`.
  // La lectura es UTF-8 EXPLÍCITa sobre arrayBuffer: response.json() queda
  // a merced del Content-Type, y con fuentes corruptas el fallback TextDecoder
  // (tarea 1.1 del change erp-ux-pulido-testflight) define el comportamiento.
  let detail: string | undefined;
  let errors: Record<string, string[]> | undefined;
  let correlationId: string | undefined;
  try {
    const raw = new TextDecoder("utf-8").decode(await response.arrayBuffer());
    const body: unknown = raw ? JSON.parse(raw) : null;
    if (typeof body === "object" && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record.detail === "string") {
        detail = deMojibake(record.detail);
      } else if (typeof record.message === "string") {
        detail = deMojibake(record.message);
      }
      if (typeof record.correlationId === "string") {
        correlationId = record.correlationId;
      }
      const rawErrors = record.errors;
      if (
        rawErrors &&
        typeof rawErrors === "object" &&
        !Array.isArray(rawErrors)
      ) {
        errors = Object.fromEntries(
          Object.entries(rawErrors).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value.map(String).map(deMojibake)
              : [deMojibake(String(value ?? ""))],
          ]),
        );
      }
    }
  } catch {
    // Respuesta sin cuerpo JSON: se usa el mensaje genérico.
  }

  const common = { errors, correlationId };

  switch (response.status) {
    case 401:
      return new ApiError(
        401,
        "unauthorized",
        detail ?? "No autorizado.",
        common,
      );
    case 403:
      return new ApiError(
        403,
        "forbidden",
        detail ?? "No tienes permisos para realizar esta acción.",
        common,
      );
    case 404:
      return new ApiError(
        404,
        "not-found",
        detail ?? "El recurso no existe.",
        common,
      );
    case 409:
      return new ApiError(
        409,
        "conflict",
        detail ?? "Conflicto con el estado actual del recurso.",
        common,
      );
    case 429:
      return new ApiError(
        429,
        "rate-limit",
        detail ?? "Demasiadas peticiones. Intenta más tarde.",
        common,
      );
    case 400:
    case 422:
      if (errors) {
        return new ApiError(
          response.status,
          "validation",
          detail ?? "La solicitud no es válida.",
          common,
        );
      }
      return new ApiError(
        response.status,
        "bad-request",
        detail ?? "La solicitud no es válida.",
        common,
      );
    default:
      if (
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        return new ApiError(
          response.status,
          "unavailable",
          detail ??
            "El servicio no está disponible en este momento. Intenta más tarde.",
          common,
        );
      }
      if (response.status >= 500) {
        return new ApiError(
          response.status,
          "server",
          detail ?? "Ocurrió un error interno del servidor. Intenta más tarde.",
          common,
        );
      }
      return new ApiError(
        response.status,
        "bad-request",
        detail ?? "La solicitud no es válida.",
        common,
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
    const response = await fetch(`${env.apiUrl}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
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
      const retry = await fetch(`${env.apiUrl}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
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
