"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Rows3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MediaFilters, MediaCategory } from "../types";
import { mediaCategoryMeta } from "./media-meta";
import { useT } from "@/providers/i18n-provider";

/** Retardo de la búsqueda textual antes de disparar la consulta server-side. */
const SEARCH_DEBOUNCE_MS = 300;

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

  // Búsqueda con debounce (300 ms): la consulta server-side se dispara solo
  // cuando el usuario deja de escribir, sin parpadeos por tecla.
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(() => {
      onFilterChange({ search: searchInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, onFilterChange]);

  const categories = Object.entries(mediaCategoryMeta) as Array<
    [MediaCategory, { label: string; tone: string }]
  >;

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:flex-wrap">
        <div className="relative min-w-0 flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("Buscar medio por título o descripción...")}
            aria-label={t("Buscar medios")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex md:w-fit">
          <select
            className={selectClass}
            value={filters.mediaType}
            onChange={(event) =>
              onFilterChange({
                mediaType: event.target.value as MediaFilters["mediaType"],
              })
            }
            aria-label={t("Filtrar por tipo de medio")}
          >
            <option value="all">{t("Todos los tipos")}</option>
            <option value="Podcast">Podcast</option>
            <option value="Video">Video</option>
            <option value="Audio">Audio</option>
          </select>
          <select
            className={selectClass}
            value={filters.status}
            onChange={(event) =>
              onFilterChange({
                status: event.target.value as MediaFilters["status"],
              })
            }
            aria-label={t("Filtrar por estado")}
          >
            <option value="all">{t("Todos los estados")}</option>
            <option value="Published">{t("Publicado")}</option>
            <option value="Draft">{t("Borrador")}</option>
            <option value="Archived">{t("Archivado")}</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex md:w-fit">
          <select
            className={selectClass}
            value={filters.category}
            onChange={(event) =>
              onFilterChange({
                category: event.target.value as MediaFilters["category"],
              })
            }
            aria-label={t("Filtrar por categoría")}
          >
            <option value="all">{t("Todas las categorías")}</option>
            {categories.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={filters.usage}
            onChange={(event) =>
              onFilterChange({
                usage: event.target.value as MediaFilters["usage"],
              })
            }
            aria-label={t("Filtrar por uso en programa")}
          >
            <option value="all">{t("Uso: todos")}</option>
            <option value="assigned">{t("En uso en programas")}</option>
            <option value="unassigned">{t("Sin asignar")}</option>
          </select>
        </div>
      </div>

      <ToggleGroup
        className="w-fit"
        value={[viewMode]}
        onValueChange={(values) =>
          onViewModeChange((values[0] ?? "grid") as "grid" | "table")
        }
        aria-label={t("Cambiar vista")}
      >
        <ToggleGroupItem value="grid" aria-label={t("Vista de tarjetas")}>
          <LayoutGrid data-icon="inline-start" />
          {t("Tarjetas")}
        </ToggleGroupItem>
        <ToggleGroupItem value="table" aria-label={t("Vista de tabla")}>
          <Rows3 data-icon="inline-start" />
          {t("Tabla")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
