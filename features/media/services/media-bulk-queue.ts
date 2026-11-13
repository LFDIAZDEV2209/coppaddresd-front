import type { MediaCategory, MediaBulkResult } from "../types";

export type { MediaBulkResult } from "../types";

/** Estados locales de preparación y los tres resultados de la tarea backend 1.13. */
export type MediaBulkState = "pendiente" | "borrador" | "publicado" | "error";

export interface MediaBulkRow {
  /** Identidad local: dos archivos con el mismo nombre siguen siendo filas distintas. */
  key: string;
  file: File;
  title: string;
  author: string;
  category: MediaCategory;
  state: MediaBulkState;
  mediaId: string | null;
  error: string | null;
  durationSecs: number | null;
  progress: number | null;
}

export function mediaTitleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createMediaBulkRows(files: readonly File[]): MediaBulkRow[] {
  return files.map((file) => ({
    key: crypto.randomUUID(),
    file,
    title: mediaTitleFromFilename(file.name),
    author: "",
    category: "Nutricion",
    state: "pendiente",
    mediaId: null,
    error: null,
    durationSecs: null,
    progress: null,
  }));
}

export function mediaBulkResult(row: MediaBulkRow): MediaBulkResult | null {
  if (row.state === "pendiente") return null;
  return {
    nombre: row.file.name,
    estado: row.state,
    ...(row.error ? { error: row.error } : {}),
  };
}

/** No volver a crear los borradores correctos ni los errores de publicación. */
export function mediaBulkDraftCandidates(
  rows: readonly MediaBulkRow[],
): MediaBulkRow[] {
  return rows.filter(
    (row) =>
      !row.mediaId && (row.state === "pendiente" || row.state === "error"),
  );
}

/** Un fallo de publicación conserva su id para reintentar sin duplicar el borrador. */
export function mediaBulkPublishCandidates(
  rows: readonly MediaBulkRow[],
): MediaBulkRow[] {
  return rows.filter(
    (row) => row.mediaId && (row.state === "borrador" || row.state === "error"),
  );
}

/**
 * Cola independiente del transporte pendiente de confirmar en 1.13.
 * El adaptador devuelve el id persistido; cada resultado se comunica al terminar.
 */
export async function createMediaBulkDrafts(
  rows: readonly MediaBulkRow[],
  createDraft: (row: MediaBulkRow) => Promise<string>,
  onResult: (row: MediaBulkRow) => void,
): Promise<void> {
  for (const row of mediaBulkDraftCandidates(rows)) {
    try {
      const mediaId = await createDraft(row);
      if (!mediaId) throw new Error("No se pudo crear el medio.");
      onResult({ ...row, mediaId, state: "borrador", error: null });
    } catch (error) {
      onResult({
        ...row,
        state: "error",
        error:
          error instanceof Error ? error.message : "No se pudo crear el medio.",
      });
    }
  }
}

export async function publishMediaBulkDrafts(
  rows: readonly MediaBulkRow[],
  publishDraft: (row: MediaBulkRow & { mediaId: string }) => Promise<void>,
  onResult: (row: MediaBulkRow) => void,
): Promise<void> {
  for (const row of mediaBulkPublishCandidates(rows)) {
    if (!row.mediaId) continue;
    try {
      await publishDraft({ ...row, mediaId: row.mediaId });
      onResult({ ...row, state: "publicado", error: null });
    } catch (error) {
      onResult({
        ...row,
        state: "error",
        error:
          error instanceof Error
            ? error.message
            : "No se pudo publicar el medio.",
      });
    }
  }
}
