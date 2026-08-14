"use client";

import {
  Clock,
  Eye,
  FileArchive,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MediaItem } from "../types";
import { mediaTypeMeta, mediaStatusMeta, getMediaCategoryMeta } from "./media-meta";
import { formatDuration } from "../services/media-service";
import { MediaThumb } from "./media-thumb";

interface MediaCardGridProps {
  items: MediaItem[];
  onDetails: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export function MediaCardGrid({
  items,
  onDetails,
  onEdit,
  onDelete,
}: MediaCardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const type = mediaTypeMeta[item.mediaType];
        const status = mediaStatusMeta[item.status];
        const category = getMediaCategoryMeta(item.category);
        const TypeIcon = type.icon;

        return (
          <article
            key={item.id}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            {item.thumbnailKey && (
              <MediaThumb
                storageKey={item.thumbnailKey}
                alt={`Miniatura de ${item.title}`}
                className="h-36 w-full rounded-xl object-cover"
              />
            )}
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${type.tone}`}
              >
                <TypeIcon className="size-5" />
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Acciones de ${item.title}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onDetails(item)}>
                    <Eye />
                    Ver detalles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="line-clamp-1 text-xs font-medium text-primary/80">
                {item.author}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.description || "Sin descripción."}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {formatDuration(item.durationSecs)}
              </span>
              <span
                className={`rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold ${category.tone}`}
              >
                {category.label}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold"
                style={{ backgroundColor: status.bg, color: status.text }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: status.dot }}
                />
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">
                Lección #{item.sortOrder}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function MediaGridEmpty({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <FileArchive className="size-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">No encontramos medios</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Prueba con otros filtros o sube un nuevo medio.
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus data-icon="inline-start" />
        Nuevo medio
      </Button>
    </div>
  );
}
