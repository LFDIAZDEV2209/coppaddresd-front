import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  MediaItem,
  MediaFilters,
  MediaInput,
  PaginatedResult,
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

export async function fetchMediaItems(
  page: number,
  pageSize: number,
  filters: MediaFilters,
): Promise<PaginatedResult<MediaItem>> {
  const params = new URLSearchParams();
  if (filters.mediaType !== "all") params.set("mediaType", filters.mediaType);
  if (filters.status !== "all") params.set("status", filters.status);

  const query = params.toString();
  const items = await apiFetch<MediaItem[]>(query ? `${PATH}?${query}` : PATH);

  const queryLower = filters.search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!queryLower) return true;
    const searchable =
      `${item.title} ${item.description ?? ""} ${item.author} ${item.category} ${item.mediaType}`.toLowerCase();
    return searchable.includes(queryLower);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
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
