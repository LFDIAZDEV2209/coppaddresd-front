"use client";

import { useState } from "react";
import {
  Archive,
  Clock,
  HardDrive,
  Hash,
  FileAudio,
  User,
  Tag,
  CalendarDays,
  Link2,
  Send,
  Undo2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "../types";
import {
  mediaTypeMeta,
  mediaStatusMeta,
  getMediaCategoryMeta,
} from "./media-meta";
import {
  formatDuration,
  formatFileSize,
  hasPublishableMetadata,
} from "../services/media-service";
import { MediaPlayer } from "./media-player";
import { MediaThumb } from "./media-thumb";
import { useT } from "@/providers/i18n-provider";

export type MediaDetailAction = "publish" | "unpublish" | "archive";

interface MediaDetailDialogProps {
  media?: MediaItem;
  onClose: () => void;
  /** Acciones semánticas (presentes solo con permiso); confirman en el padre. */
  onAction?: (action: MediaDetailAction) => void;
  /** Bloqueado mientras corre otra acción. */
  actionLoading?: boolean;
  /** Abre el diálogo "Dónde se usa" en el padre. */
  onShowReferences?: () => void;
}

export function MediaDetailDialog({
  media,
  onClose,
  onAction,
  actionLoading = false,
  onShowReferences,
}: MediaDetailDialogProps) {
  const t = useT();
  return (
    <Dialog open={Boolean(media)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border bg-primary-soft px-6 py-5 pr-12">
          <DialogTitle>{t("Detalle del medio")}</DialogTitle>
          <DialogDescription>
            {t("Metadata registrada para la lección.")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {media && (
            <MediaDetailContent
              key={media.id}
              media={media}
              onAction={onAction}
              actionLoading={actionLoading}
              onShowReferences={onShowReferences}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MediaDetailContent({
  media,
  onAction,
  actionLoading,
  onShowReferences,
}: {
  media: MediaItem;
  onAction?: (action: MediaDetailAction) => void;
  actionLoading?: boolean;
  onShowReferences?: () => void;
}) {
  const t = useT();
  const type = mediaTypeMeta[media.mediaType];
  const status = mediaStatusMeta[media.status];
  const category = getMediaCategoryMeta(media.category);
  const TypeIcon = type.icon;
  const publishable = hasPublishableMetadata(media);
  const [fileDuration, setFileDuration] = useState<number | null>(null);

  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-4 md:col-span-2">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${type.tone}`}
        >
          <TypeIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-semibold leading-snug">{media.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {type.label} · {status.label}
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        {media.thumbnailKey && media.mediaType !== "Video" && (
          <MediaThumb
            storageKey={media.thumbnailKey}
            alt={t("Miniatura de {title}", { title: media.title })}
            className="aspect-video max-h-72 w-full rounded-xl object-cover"
          />
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <MediaPlayer
            key={media.storageKey}
            storageKey={media.storageKey}
            mediaType={media.mediaType}
            onDuration={setFileDuration}
          />
        </div>

        {/* Acciones semánticas + "dónde se usa" (REQ-PCA-03/07) */}
        {onAction && (
          <div className="flex flex-wrap items-center gap-2 [&_button]:min-h-10">
            {media.status === "Draft" && (
              <Button
                size="sm"
                disabled={actionLoading || !publishable}
                title={
                  !publishable
                    ? t(
                        "Faltan metadatos para publicar (duración o Content-Type).",
                      )
                    : undefined
                }
                onClick={() => onAction("publish")}
              >
                <Send data-icon="inline-start" />
                {t("Publicar")}
              </Button>
            )}
            {media.status === "Published" && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => onAction("unpublish")}
              >
                <Undo2 data-icon="inline-start" />
                {t("Despublicar")}
              </Button>
            )}
            {media.status !== "Archived" && (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => onAction("archive")}
              >
                <Archive data-icon="inline-start" />
                {t("Archivar")}
              </Button>
            )}
            {onShowReferences && (
              <Button
                size="sm"
                variant="ghost"
                disabled={actionLoading}
                onClick={onShowReferences}
                className="basis-full sm:basis-auto"
              >
                <Link2 data-icon="inline-start" />
                {t("¿Dónde se usa?")}
              </Button>
            )}
          </div>
        )}

      </div>
      <div className="min-w-0 space-y-5 rounded-xl border border-border bg-background p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
          <Detail
            label={t("Tipo de medio")}
            value={type.label}
            icon={<TypeIcon className="size-3.5" />}
          />
          <Detail
            label={t("Autor")}
            value={media.author}
            icon={<User className="size-3.5" />}
          />
          <Detail
            label={t("Categoría")}
            value={category.label}
            icon={<Tag className="size-3.5" />}
          />
          <Detail
            label={t("Día / Mes")}
            value={`${media.day} / ${media.month}`}
            icon={<CalendarDays className="size-3.5" />}
          />
          <Detail
            label={t("Estado")}
            value={status.label}
            icon={<Hash className="size-3.5" />}
          />
          <Detail
            label={t("Duración")}
            value={formatDuration(fileDuration ?? media.durationSecs)}
            icon={<Clock className="size-3.5" />}
          />
          <Detail
            label={t("Tamaño")}
            value={formatFileSize(media.fileSizeBytes)}
            icon={<HardDrive className="size-3.5" />}
          />
          <Detail
            label={t("Orden de lección")}
            value={`#${media.sortOrder}`}
            icon={<Hash className="size-3.5" />}
          />
          <Detail
            label="Content-Type"
            value={media.contentType || "—"}
            icon={<FileAudio className="size-3.5" />}
          />
        </div>

        {fileDuration !== null && media.durationSecs != null && Math.abs(fileDuration - media.durationSecs) > 1 && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
            {t("Duración registrada: {duration}", { duration: formatDuration(media.durationSecs) })}
          </p>
        )}

        <div className="rounded-lg border border-border p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {t("Descripción")}
          </p>
          <p className="text-sm">{media.description || t("Sin descripción.")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <p>{t("Creado")}</p>
            <p className="mt-0.5 font-medium text-foreground">
              {new Date(media.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p>{t("Actualizado")}</p>
            <p className="mt-0.5 font-medium text-foreground">
              {media.updatedAt ? new Date(media.updatedAt).toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
