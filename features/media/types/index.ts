export type MediaType = "Podcast" | "Video" | "Audio";

export type MediaStatus = "Draft" | "Published" | "Archived";

/** Espejo del MediaItemDto del backend (CoppAddresd.Api /api/v1/media). */
export interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  mediaType: MediaType;
  /** Clave del objeto en el storage (S3), ej. media/podcasts/abc.mp3 */
  storageKey: string;
  contentType: string | null;
  fileSizeBytes: number | null;
  durationSecs: number | null;
  status: MediaStatus;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
}

export interface MediaInput {
  title: string;
  description: string | null;
  mediaType: MediaType;
  storageKey: string;
  contentType: string | null;
  fileSizeBytes: number | null;
  durationSecs: number | null;
  status: MediaStatus;
  sortOrder: number;
}

export interface MediaFilters {
  search: string;
  mediaType: MediaType | "all";
  status: MediaStatus | "all";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
