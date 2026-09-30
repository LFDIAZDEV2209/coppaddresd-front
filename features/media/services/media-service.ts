import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  MediaItem,
  MediaFilters,
  MediaInput,
  MediaPagedEnvelope,
  PaginatedResult,
  MediaPublishResult,
  MediaReferences,
  CleanupOrphanedBlobsResult,
} from "../types";

const PATH = `${env.apiUrl}/api/v1/media`;

/**
 * Pide al back una URL firmada temporal para reproducir el archivo. El
 * <video>/<audio> nativo no puede enviar el header Authorization, por eso la
 * URL es autocontenida (exp+sig). El back la resuelve contra el proveedor de
 * storage activo (Local hoy, S3 mañana) sin exponer la storageKey.
 */
export async function getMediaStreamUrl(storageKey: string): Promise<string> {
  const params = new URLSearchParams({ key: storageKey });
  const data = await apiFetch<{ url: string }>(
    `${env.apiUrl}/api/v1/storage/sign?${params.toString()}`,
  );
  return data.url;
}

/**
 * Listado paginado server-side (REQ-PCA-06): búsqueda, filtros combinados y
 * orden viajan como query parameters; el back responde el envelope estándar
 * { items, totalCount, page, pageSize, totalPages } que se mapea a la forma
 * <c>PaginatedResult</c> usada por las vistas. Los filtros son parciales:
 * los campos ausentes se envían como "todos".
 */
export async function fetchMediaItems(
  page: number,
  pageSize: number,
  filters: Partial<MediaFilters> = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<MediaItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const search = filters.search?.trim();
  if (search) params.set("search", search);
  if (filters.mediaType && filters.mediaType !== "all") {
    params.set("mediaType", filters.mediaType);
  }
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.usage && filters.usage !== "all") {
    params.set("usage", filters.usage);
  }
  if (filters.sortBy) {
    params.set("sortBy", filters.sortBy);
    params.set("sortDirection", filters.sortDirection ?? "asc");
  }

  const envelope = await apiFetch<MediaPagedEnvelope>(
    `${PATH}?${params.toString()}`,
    { signal },
  );
  return {
    data: envelope.items,
    total: envelope.totalCount,
    page: envelope.page,
    pageSize: envelope.pageSize,
    totalPages: envelope.totalPages,
  };
}

/** Detalle de un medio por id (GET /api/v1/media/{id}). */
export async function getMediaItemById(id: string): Promise<MediaItem> {
  return apiFetch<MediaItem>(`${PATH}/${id}`);
}

/**
 * Publica un medio (Draft → Published) con validación técnica del blob en
 * el back (REQ-PCA-02): inconsistencia → 422 ProblemDetails (ApiError).
 */
export async function publishMediaItem(
  id: string,
): Promise<MediaPublishResult> {
  return apiFetch<MediaPublishResult>(`${PATH}/${id}/publish`, {
    method: "POST",
  });
}

/** Despublica un medio (Published → Draft); un Archived responde 422. */
export async function unpublishMediaItem(id: string): Promise<MediaItem> {
  return apiFetch<MediaItem>(`${PATH}/${id}/unpublish`, { method: "POST" });
}

/**
 * Archiva un medio (cualquier estado → Archived): sale de los selectores de
 * nuevas asignaciones pero conserva su reproducción histórica (design D5).
 */
export async function archiveMediaItem(id: string): Promise<MediaItem> {
  return apiFetch<MediaItem>(`${PATH}/${id}/archive`, { method: "POST" });
}

/**
 * "Dónde se usa" (REQ-PCA-07): plantillas y semanas de pacientes que
 * referencian al medio. Consume GET /api/v1/media/{id}/references.
 */
export async function fetchMediaReferences(
  id: string,
): Promise<MediaReferences> {
  return apiFetch<MediaReferences>(`${PATH}/${id}/references`);
}

/**
 * Limpieza de blobs huérfanos del storage (REQ-PCA-08): requiere el permiso
 * System.AdminSettings. Con dryRun=true solo reporta, sin eliminar.
 */
export async function cleanupOrphanedBlobs(input: {
  dryRun: boolean;
  retentionDays: number;
}): Promise<CleanupOrphanedBlobsResult> {
  return apiFetch<CleanupOrphanedBlobsResult>(
    `${PATH}/maintenance/cleanup-orphaned-blobs`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

/**
 * Metadatos mínimos que el back exige para publicar (REQ-PCA-02): duración
 * > 0 y Content-Type registrado. Se usa para deshabilitar el botón
 * "Publicar" con un motivo visible en la UI.
 */
export function hasPublishableMetadata(item: MediaItem): boolean {
  return (
    item.durationSecs !== null &&
    item.durationSecs > 0 &&
    Boolean(item.contentType)
  );
}

export async function createMediaItem(input: MediaInput): Promise<MediaItem> {
  return apiFetch<MediaItem>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMediaItem(
  id: string,
  input: MediaInput,
): Promise<MediaItem> {
  return apiFetch<MediaItem>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteMediaItem(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

export function getMediaTypes(): MediaItem["mediaType"][] {
  return ["Podcast", "Video", "Audio"];
}

export function getMediaStatuses(): MediaItem["status"][] {
  return ["Draft", "Published", "Archived"];
}

export function formatDuration(secs: number | null): string {
  if (secs === null || secs <= 0) return "—";
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
