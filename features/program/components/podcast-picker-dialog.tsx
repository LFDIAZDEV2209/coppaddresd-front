"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchMediaItems,
  formatDuration,
} from "@/features/media/services/media-service";
import { MediaAudioPreview } from "@/features/media/components/media-audio-preview";
import { mediaCategoryMeta } from "@/features/media/components/media-meta";
import type { MediaItem, MediaCategory } from "@/features/media/types";
import { useT } from "@/providers/i18n-provider";

/** Retardo de búsqueda antes de disparar la consulta server-side. */
const SEARCH_DEBOUNCE_MS = 300;

interface PodcastPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMediaId: string | null;
  dayLabel?: string;
  onSelect: (mediaId: string | null, mediaItem?: MediaItem | null) => void;
}

/**
 * Selector de podcasts educativos (REQ-PCA-05): búsqueda server-side con
 * debounce, filtro por categoría y paginación real (GET /api/v1/media).
 * Solo lista podcasts PUBLICADOS; permite preescuchar cada fragmento antes
 * de confirmar la asignación sin salir del diálogo.
 */
export function PodcastPickerDialog({
  open,
  onOpenChange,
  currentMediaId,
  dayLabel,
  onSelect,
}: PodcastPickerDialogProps) {
  const t = useT();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<MediaCategory | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(currentMediaId);
  const [prevOpen, setPrevOpen] = useState(open);

  // Sincronizar estado al abrir el diálogo (ajuste durante render).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedId(currentMediaId);
      setSearchQuery("");
      setDebouncedSearch("");
      setCategory("all");
      setPage(1);
    }
  }

  // Debounce de búsqueda (300 ms → consulta server-side).
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cargar podcasts paginados server-side (búsqueda, categoría y estado van
  // como query parameters; el filtro de tipo y estado fija solo publicados).
  useEffect(() => {
    if (!open) return;
    let isCancelled = false;
    const controller = new AbortController();

    async function loadPodcasts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchMediaItems(
          page,
          pageSize,
          {
            search: debouncedSearch,
            category,
            mediaType: "Podcast",
            status: "Published",
          },
          controller.signal,
        );
        if (!isCancelled && !controller.signal.aborted) {
          setItems(res.data);
          setTotal(res.total);
          setTotalPages(Math.max(1, res.totalPages));
        }
      } catch (err) {
        if (
          !isCancelled &&
          !controller.signal.aborted &&
          !(err instanceof DOMException && err.name === "AbortError")
        ) {
          setError(
            err instanceof Error ? err.message : t("Error al cargar podcasts"),
          );
          setItems([]);
        }
      } finally {
        if (!isCancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPodcasts();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [open, page, debouncedSearch, category, reloadTrigger, t]);

  const handleConfirm = () => {
    const selectedItem = items.find((i) => i.id === selectedId) ?? null;
    onSelect(selectedId, selectedItem);
    onOpenChange(false);
  };

  const handleResetToDefault = () => {
    setSelectedId(null);
    onSelect(null, null);
    onOpenChange(false);
  };

  const categories = Object.entries(mediaCategoryMeta) as Array<
    [MediaCategory, { label: string; tone: string }]
  >;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t("Seleccionar podcast educativo")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {dayLabel
                  ? t("Asigna el episodio para el {day}", { day: dayLabel })
                  : t("Busca y selecciona un podcast publicado")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Buscador + filtro de categoría */}
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={t("Buscar por título, autor o tema...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
              aria-label={t("Buscar podcasts")}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as MediaCategory | "all");
              setPage(1);
            }}
            aria-label={t("Filtrar por categoría")}
          >
            <option value="all">{t("Todas las categorías")}</option>
            {categories.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          {selectedId !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="h-9 gap-1.5 border-dashed text-xs"
              title={t("Restablecer al podcast por defecto del programa")}
            >
              <RotateCcw className="size-3.5" />
              <span>{t("Usar por defecto")}</span>
            </Button>
          )}
        </div>

        {/* Lista de podcasts paginada server-side */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReloadTrigger((c) => c + 1)}
              >
                {t("Reintentar")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center">
              <Headphones className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                {t("No se encontraron podcasts")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {searchQuery || category !== "all"
                  ? t("Intenta con otros términos de búsqueda.")
                  : t("No hay podcasts publicados disponibles en el sistema.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 py-1 sm:grid-cols-2">
              {items.map((item) => {
                const isSelected = selectedId === item.id;
                const categoryMeta = mediaCategoryMeta[item.category];

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                    aria-pressed={isSelected}
                    className={`group flex cursor-pointer flex-col justify-between gap-2.5 rounded-xl border p-3 transition-all hover:shadow-xs ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span
                          className="line-clamp-1 text-xs font-bold text-foreground transition-colors group-hover:text-primary"
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        {item.author && (
                          <span className="line-clamp-1 text-[11px] text-muted-foreground">
                            {item.author}
                          </span>
                        )}
                      </div>
                      <div
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/40"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
                      {/* Preescucha inline: escuchar el fragmento antes de asignar */}
                      <MediaAudioPreview
                        storageKey={item.storageKey}
                        label={item.title}
                        compact
                        className="flex-1"
                      />
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[9px] font-normal"
                        >
                          {categoryMeta?.label ?? item.category}
                        </Badge>
                        {item.durationSecs && (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {formatDuration(item.durationSecs)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con paginación server-side */}
        <div className="flex shrink-0 items-center justify-between border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">
            {total > 0 ? (
              <span>
                {t("Página")}{" "}
                <strong className="text-foreground">{page}</strong> {t("de")}{" "}
                <strong className="text-foreground">{totalPages}</strong> ·{" "}
                {t("{count} podcasts", { count: String(total) })}
              </span>
            ) : (
              <span>{t("Sin resultados")}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="size-4" />
              <span>{t("Anterior")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2 text-xs"
            >
              <span>{t("Siguiente")}</span>
              <ChevronRight className="size-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              className="ml-2 h-8 px-4 text-xs"
            >
              {t("Confirmar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
