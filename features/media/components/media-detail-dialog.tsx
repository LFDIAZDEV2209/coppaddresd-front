"use client";

import { Clock, HardDrive, Hash, FileAudio, User, Tag, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaItem } from "../types";
import { mediaTypeMeta, mediaStatusMeta, getMediaCategoryMeta } from "./media-meta";
import { formatDuration, formatFileSize } from "../services/media-service";
import { MediaPlayer } from "./media-player";
import { MediaThumb } from "./media-thumb";
import { useT } from "@/providers/i18n-provider";

interface MediaDetailDialogProps {
  media?: MediaItem;
  onClose: () => void;
}

export function MediaDetailDialog({ media, onClose }: MediaDetailDialogProps) {
  const t = useT();
  return (
    <Dialog open={Boolean(media)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Detalle del medio')}</DialogTitle>
          <DialogDescription>
            {t('Metadata registrada para la lección.')}
          </DialogDescription>
        </DialogHeader>
        {media && <MediaDetailContent media={media} />}
      </DialogContent>
    </Dialog>
  );
}

function MediaDetailContent({ media }: { media: MediaItem }) {
  const t = useT();
  const type = mediaTypeMeta[media.mediaType];
  const status = mediaStatusMeta[media.status];
  const category = getMediaCategoryMeta(media.category);
  const TypeIcon = type.icon;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-xl bg-primary-soft p-4">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${type.tone}`}
        >
          <TypeIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{media.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {type.label} · {status.label}
          </p>
        </div>
      </div>

      {media.thumbnailKey && (
        <MediaThumb
          storageKey={media.thumbnailKey}
          alt={t('Miniatura de {title}', { title: media.title })}
          className="max-h-72 w-full rounded-xl object-cover"
        />
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <MediaPlayer
          storageKey={media.storageKey}
          mediaType={media.mediaType}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <Detail
          label={t('Tipo de medio')}
          value={type.label}
          icon={<TypeIcon className="size-3.5" />}
        />
        <Detail
          label={t('Autor')}
          value={media.author}
          icon={<User className="size-3.5" />}
        />
        <Detail
          label={t('Categoría')}
          value={category.label}
          icon={<Tag className="size-3.5" />}
        />
        <Detail
          label={t('Día / Mes')}
          value={`${media.day} / ${media.month}`}
          icon={<CalendarDays className="size-3.5" />}
        />
        <Detail
          label={t('Estado')}
          value={status.label}
          icon={<Hash className="size-3.5" />}
        />
        <Detail
          label={t('Duración')}
          value={formatDuration(media.durationSecs)}
          icon={<Clock className="size-3.5" />}
        />
        <Detail
          label={t('Tamaño')}
          value={formatFileSize(media.fileSizeBytes)}
          icon={<HardDrive className="size-3.5" />}
        />
        <Detail
          label={t('Orden de lección')}
          value={`#${media.sortOrder}`}
          icon={<Hash className="size-3.5" />}
        />
        <Detail
          label="Content-Type"
          value={media.contentType || "—"}
          icon={<FileAudio className="size-3.5" />}
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          {t('Descripción')}
        </p>
        <p className="text-sm">{media.description || t('Sin descripción.')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>
          <p>{t('Creado')}</p>
          <p className="mt-0.5 font-medium text-foreground">
            {new Date(media.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <p>{t('Actualizado')}</p>
          <p className="mt-0.5 font-medium text-foreground">
            {media.updatedAt
              ? new Date(media.updatedAt).toLocaleString()
              : "—"}
          </p>
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
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
