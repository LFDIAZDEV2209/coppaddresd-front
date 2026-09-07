export type MediaType = "Podcast" | "Video" | "Audio";

export type MediaStatus = "Draft" | "Published" | "Archived";

/** Espejo del enum MediaCategory del backend (CoppAddresd.Domain). */
export type MediaCategory =
  | "Biologia"
  | "Nutricion"
  | "Psicologia"
  | "CrecimientoPersonal"
  | "Habitos"
  | "SaludFisica"
  | "BienestarEmocional"
  | "Mindfulness"
  | "Motivacion";

export interface MediaChapter {
  atSeconds: number;
  label: string;
}

/** Espejo del MediaItemDto del backend (CoppAddresd.Api /api/v1/media). */
export interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  author: string;
  mediaType: MediaType;
  category: MediaCategory;
  /** Clave del objeto en el storage (S3), ej. media/podcasts/abc.mp3 */
  storageKey: string;
  /** Clave de la miniatura en el storage (opcional), ej. media/thumbnails/abc.jpg */
  thumbnailKey: string | null;
  contentType: string | null;
  fileSizeBytes: number | null;
  durationSecs: number | null;
  status: MediaStatus;
  sortOrder: number;
  day: number;
  month: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
  chapters?: MediaChapter[];
  takeaways?: string[];
}

export interface MediaInput {
  title: string;
  description: string | null;
  author: string;
  mediaType: MediaType;
  category: MediaCategory;
  storageKey: string;
  thumbnailKey: string | null;
  contentType: string | null;
  fileSizeBytes: number | null;
  durationSecs: number | null;
  status: MediaStatus;
  sortOrder: number;
  day: number;
  month: number;
  chapters?: MediaChapter[];
  takeaways?: string[];
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
