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
  /**
   * Número de referencias activas (plantillas/semanas) que el listado
   * server-side resuelve por fila (REQ-PCA-06). Ausente en el detalle.
   */
  usageCount?: number;
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

/**
 * Filtros del listado de medios (REQ-PCA-06). Todos los campos viajan al
 * servidor: la paginación, búsqueda, filtros y orden son server-side.
 */
export interface MediaFilters {
  search: string;
  mediaType: MediaType | "all";
  category: MediaCategory | "all";
  status: MediaStatus | "all";
  /** Uso en programas: asignado a plantillas/semanas o disponible. */
  usage: "all" | "assigned" | "unassigned";
  sortBy: "title" | "author" | "createdAt" | "durationSecs" | "sortOrder";
  sortDirection: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Envelope estándar del listado paginado server-side (REQ-PCA-06): espejo de
 * <c>PagedMediaItemsResult</c> del backend
 * (GET /api/v1/media → { items, totalCount, page, pageSize, totalPages }).
 */
export interface MediaPagedEnvelope {
  items: MediaItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Detalle de la validación técnica del blob al publicar (REQ-PCA-02). */
export interface MediaPublishValidation {
  storageKeyVerified: boolean;
  fileSizeBytes: number | null;
  durationSecs: number | null;
  thumbnailVerified: boolean;
}

/** Respuesta de POST /api/v1/media/{id}/publish. */
export interface MediaPublishResult {
  id: string;
  status: MediaStatus;
  publishedAt: string | null;
  validation: MediaPublishValidation;
}

/** Referencia de un medio en una fila de plantilla (WeeklyDayTemplate). */
export interface MediaTemplateReference {
  templateId: string;
  templateName: string;
  weekday: number;
  points: number;
}

/** Referencia de un medio en el snapshot de una semana de paciente. */
export interface MediaEnrollmentReference {
  enrollmentId: string;
  patientName: string | null;
  weekNumber: number;
  weekday: number;
  isFrozen: boolean;
}

/** Respuesta de GET /api/v1/media/{id}/references ("dónde se usa"). */
export interface MediaReferences {
  mediaId: string;
  totalReferences: number;
  templateReferences: MediaTemplateReference[];
  enrollmentReferences: MediaEnrollmentReference[];
}

/** Reporte del recolector de huérfanos (REQ-PCA-08). */
export interface CleanupOrphanedBlobsResult {
  dryRun: boolean;
  retentionDays: number;
  orphanedObjects: number;
  purgedObjects: number;
  bytesFreed: number;
  orphanedKeys: string[];
}
