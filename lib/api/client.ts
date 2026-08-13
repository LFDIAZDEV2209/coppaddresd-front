import { API_BASE_URL, getAuthToken } from "./config";

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data === "object" && data !== null) {
        const err = data as Record<string, unknown>;
        if (typeof err.message === "string") message = err.message;
        if (Array.isArray(err.errors) && err.errors.length > 0) {
          const first = err.errors[0] as Record<string, unknown>;
          if (typeof first.message === "string") message = first.message;
        }
      }
    } catch {
      // Respuesta sin JSON: conservar el status.
    }
    throw new ApiError(message, response.status, response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
