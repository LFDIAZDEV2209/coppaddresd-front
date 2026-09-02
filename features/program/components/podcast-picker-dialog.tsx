"use client";

import { useState, useEffect } from "react";
import { Search, Headphones, ChevronLeft, ChevronRight, Check, RotateCcw } from "lucide-react";
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
import { fetchMediaItems, formatDuration } from "@/features/media/services/media-service";
import type { MediaItem } from "@/features/media/types";

interface PodcastPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMediaId: string | null;
  dayLabel?: string;
  onSelect: (mediaId: string | null, mediaItem?: MediaItem | null) => void;
}

export function PodcastPickerDialog({
  open,
  onOpenChange,
  currentMediaId,
  dayLabel,
  onSelect,
}: PodcastPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(currentMediaId);
  const [prevOpen, setPrevOpen] = useState(open);

  // Sincronizar estado al abrir el diálogo (ajustar estado durante el render)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedId(currentMediaId);
      setSearchQuery("");
      setDebouncedSearch("");
      setPage(1);
    }
  }

  // Debounce de búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Cargar podcasts paginados desde la API
  useEffect(() => {
    if (!open) return;
    let isCancelled = false;

    async function loadPodcasts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchMediaItems(page, pageSize, {
          search: debouncedSearch,
          mediaType: "Podcast",
          status: "Published",
        });
        if (!isCancelled) {
          setItems(res.data);
          setTotal(res.total);
          setTotalPages(Math.max(1, res.totalPages));
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar podcasts");
          setItems([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadPodcasts();

    return () => {
      isCancelled = true;
    };
  }, [open, page, debouncedSearch, reloadTrigger]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Seleccionar podcast educativo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {dayLabel ? `Asigna el episodio para el ${dayLabel}` : "Busca y selecciona un podcast publicado"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Buscador */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, autor o tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          {selectedId !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="h-9 text-xs gap-1.5 border-dashed"
              title="Restablecer al podcast por defecto del programa"
            >
              <RotateCcw className="size-3.5" />
              <span>Usar por defecto</span>
            </Button>
          )}
        </div>

        {/* Lista de podcasts paginada */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setReloadTrigger((c) => c + 1)}>
                Reintentar
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center bg-muted/10">
              <Headphones className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold text-foreground">
                No se encontraron podcasts
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchQuery
                  ? "Intenta con otros términos de búsqueda."
                  : "No hay podcasts publicados disponibles en el sistema."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
              {items.map((item) => {
                const isSelected = selectedId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`group flex flex-col justify-between gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-2xs"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors" title={item.title}>
                          {item.title}
                        </span>
                        {item.author && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
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

                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                        {item.category}
                      </Badge>
                      {item.durationSecs && (
                        <span>{formatDuration(item.durationSecs)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con Paginación */}
        <div className="shrink-0 flex items-center justify-between border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">
            {total > 0 ? (
              <span>
                Página <strong className="text-foreground">{page}</strong> de{" "}
                <strong className="text-foreground">{totalPages}</strong> ({total} podcasts)
              </span>
            ) : (
              <span>Sin resultados</span>
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
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2 text-xs"
            >
              <span>Siguiente</span>
              <ChevronRight className="size-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              className="h-8 text-xs px-4 ml-2"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
