"use client";

import { LayoutGrid, Rows3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MediaFilters } from "../types";
import { useT } from "@/providers/i18n-provider";

interface MediaToolbarProps {
  filters: MediaFilters;
  onFilterChange: (filters: Partial<MediaFilters>) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
}

export function MediaToolbar({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: MediaToolbarProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={filters.search}
            onChange={(event) =>
              onFilterChange({ search: event.target.value })
            }
            placeholder={t('Buscar medio por título o descripción...')}
            aria-label={t('Buscar medios')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex md:w-fit">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.mediaType}
            onChange={(event) =>
              onFilterChange({
                mediaType: event.target.value as MediaFilters["mediaType"],
              })
            }
            aria-label={t('Filtrar por tipo de medio')}
          >
            <option value="all">{t('Todos los tipos')}</option>
            <option value="Podcast">Podcast</option>
            <option value="Video">Video</option>
            <option value="Audio">Audio</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.status}
            onChange={(event) =>
              onFilterChange({
                status: event.target.value as MediaFilters["status"],
              })
            }
            aria-label={t('Filtrar por estado')}
          >
            <option value="all">{t('Todos los estados')}</option>
            <option value="Published">{t('Publicado')}</option>
            <option value="Draft">{t('Borrador')}</option>
            <option value="Archived">{t('Archivado')}</option>
          </select>
        </div>
      </div>

      <ToggleGroup
        className="w-fit"
        value={[viewMode]}
        onValueChange={(values) =>
          onViewModeChange((values[0] ?? "grid") as "grid" | "table")
        }
        aria-label={t('Cambiar vista')}
      >
        <ToggleGroupItem value="grid" aria-label={t('Vista de tarjetas')}>
          <LayoutGrid data-icon="inline-start" />
          {t('Tarjetas')}
        </ToggleGroupItem>
        <ToggleGroupItem value="table" aria-label={t('Vista de tabla')}>
          <Rows3 data-icon="inline-start" />
          {t('Tabla')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
