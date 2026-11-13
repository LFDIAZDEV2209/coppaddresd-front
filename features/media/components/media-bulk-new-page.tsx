"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import {
  MediaBulkUpload,
  type MediaBulkUploadProps,
} from "./media-bulk-upload";
import {
  createMediaItem,
  getMediaItemById,
  publishMediaItem,
  updateMediaItem,
} from "../services/media-service";
import {
  detectMediaMetadata,
  resolveStorageKeys,
} from "../services/upload-service";
import type { MediaBulkRow } from "../services/media-bulk-queue";
import type { MediaInput } from "../types";

/** Adaptador de las operaciones individuales existentes; no presupone rutas de lote nuevas de 1.13. */
export function MediaBulkNewPage() {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
  const uploaded = useRef(new Map<string, MediaInput>());

  const createDraft: MediaBulkUploadProps["createDraft"] = async (
    row,
    signal,
    onProgress,
  ) => {
    signal.throwIfAborted();
    let input = uploaded.current.get(row.key);
    if (!input) {
      const metadata = await detectMediaMetadata(row.file);
      signal.throwIfAborted();
      onProgress?.({ durationSecs: metadata.durationSecs });
      input = await resolveStorageKeys(
        {
          title: row.title.trim(),
          description: null,
          author: row.author.trim(),
          category: row.category,
          mediaType: "Podcast",
          status: "Draft",
          sortOrder: 1,
          day: 1,
          month: 1,
          storageKey: "",
          thumbnailKey: null,
          contentType: metadata.contentType,
          fileSizeBytes: row.file.size,
          durationSecs: metadata.durationSecs,
        },
        row.file,
        undefined,
        (percent) => onProgress?.({ percent }),
      );
      // El POST ya es idempotente por storageKey: conservarla si se pierde su respuesta.
      uploaded.current.set(row.key, input);
    }
    signal.throwIfAborted();
    const item = await createMediaItem({
      ...input,
      title: row.title.trim(),
      author: row.author.trim(),
      category: row.category,
      status: "Draft",
    });
    if (item.status !== "Draft")
      throw new Error(t("No se pudo crear el medio."));
    return item.id;
  };

  const publishDraft = async (
    row: MediaBulkRow & { mediaId: string },
    signal: AbortSignal,
  ) => {
    signal.throwIfAborted();
    const current = await getMediaItemById(row.mediaId);
    // Una respuesta de publicación perdida no justifica despublicar ni crear otra copia.
    if (current.status === "Published") return;
    if (current.status !== "Draft")
      throw new Error(
        t("El medio ya no es un borrador. Actualiza la biblioteca."),
      );
    signal.throwIfAborted();
    if (
      current.title !== row.title.trim() ||
      current.author !== row.author.trim() ||
      current.category !== row.category
    ) {
      if (!can("Media.Edit"))
        throw new Error(t("No tienes permiso para editar este medio."));
      await updateMediaItem(current.id, {
        title: row.title.trim(),
        author: row.author.trim(),
        category: row.category,
        description: current.description,
        mediaType: current.mediaType,
        storageKey: current.storageKey,
        thumbnailKey: current.thumbnailKey,
        contentType: current.contentType,
        fileSizeBytes: current.fileSizeBytes,
        durationSecs: current.durationSecs,
        status: current.status,
        sortOrder: current.sortOrder,
        day: current.day,
        month: current.month,
        chapters: current.chapters,
        takeaways: current.takeaways,
      });
    }
    signal.throwIfAborted();
    const result = await publishMediaItem(row.mediaId);
    if (result.status !== "Published")
      throw new Error(t("No se pudo publicar el medio."));
  };

  return (
    <div className="p-4 sm:p-6">
      <section className="mx-auto flex min-w-0 max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Subir podcasts")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Cada archivo queda como borrador con el título tomado del nombre. Complétalos aquí y publícalos juntos.",
              )}
            </p>
          </div>
          <Link
            href="/media"
            className={buttonVariants({
              variant: "ghost",
              className: "min-h-11 min-w-11 shrink-0",
            })}
          >
            <X aria-hidden="true" />
            <span className="sr-only">{t("Volver a medios")}</span>
          </Link>
        </header>
        <div className="p-5 sm:p-6">
          <MediaBulkUpload
            createDraft={createDraft}
            publishDraft={publishDraft}
            onCancel={() => router.push("/media")}
          />
        </div>
      </section>
    </div>
  );
}
