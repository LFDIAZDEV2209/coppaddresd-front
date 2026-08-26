"use client";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MediaItem } from "../types";
import { mediaTypeMeta, mediaStatusMeta, getMediaCategoryMeta } from "./media-meta";
import { MediaThumb } from "./media-thumb";
import { formatDuration, formatFileSize } from "../services/media-service";
import { useT } from "@/providers/i18n-provider";

interface MediaTableProps {
  items: MediaItem[];
  onDetails: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export function MediaTable({
  items,
  onDetails,
  onEdit,
  onDelete,
}: MediaTableProps) {
  const t = useT();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Medio')}</TableHead>
          <TableHead className="hidden md:table-cell">{t('Tipo')}</TableHead>
          <TableHead className="hidden lg:table-cell">{t('Categoría')}</TableHead>
          <TableHead className="hidden lg:table-cell">{t('Duración')}</TableHead>
          <TableHead className="hidden lg:table-cell">{t('Tamaño')}</TableHead>
          <TableHead>{t('Estado')}</TableHead>
          <TableHead className="hidden md:table-cell">{t('Orden')}</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">{t('Acciones')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const type = mediaTypeMeta[item.mediaType];
          const status = mediaStatusMeta[item.status];
          const category = getMediaCategoryMeta(item.category);
          const TypeIcon = type.icon;

          return (
            <TableRow key={item.id}>
              <TableCell>
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => onDetails(item)}
                >
                  {item.thumbnailKey ? (
                    <MediaThumb
                      storageKey={item.thumbnailKey}
                      alt={t('Miniatura de {title}', { title: item.title })}
                      className="size-9 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${type.tone}`}
                    >
                      <TypeIcon className="size-4" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {type.label} · {item.contentType ?? t('sin tipo')}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {type.label}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span
                  className={`inline-flex rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold ${category.tone}`}
                >
                  {category.label}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {formatDuration(item.durationSecs)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {formatFileSize(item.fileSizeBytes)}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                #{item.sortOrder}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('Acciones de {title}', { title: item.title })}
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onDetails(item)}>
                      <Eye />
                      {t('Ver detalles')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil />
                      {t('Editar')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 />
                      {t('Eliminar')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
