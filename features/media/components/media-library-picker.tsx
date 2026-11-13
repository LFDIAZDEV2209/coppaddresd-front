"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, FileAudio, ImageIcon, LockKeyhole, RotateCcw, Search, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";
import { fetchMediaItems, formatDuration, getMediaItemById } from "../services/media-service";
import type { MediaCategory, MediaItem } from "../types";
import { getMediaCategoryMeta, mediaCategoryMeta, mediaTypeMeta } from "./media-meta";
import { MediaPlayer } from "./media-player";
import { MediaThumb } from "./media-thumb";

interface PickerOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds?: readonly string[];
  title?: string;
  description?: string;
  onConfirm: (items: MediaItem[]) => void;
  onReset?: () => void;
}

/** La demostración de un ejercicio es singular; el programa admite secuencias. */
export type MediaLibraryPickerProps = PickerOptions & (
  | { destino: "programa"; multiple?: boolean }
  | { destino: "rutinas"; multiple?: false }
);

/** Un único selector: el destino fija los tipos y nunca hay un filtro de tipo libre. */
export function MediaLibraryPicker(props: MediaLibraryPickerProps) {
  const multiple = props.destino === "programa" && props.multiple === true;
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent size="lg" className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] gap-3 p-3 sm:p-5">
      {props.open && <PickerContent key={`${props.destino}:${multiple}`} {...props} multiple={multiple} />}
    </DialogContent>
  </Dialog>;
}

function accepts(item: MediaItem, destino: "programa" | "rutinas") {
  return item.status === "Published" && (destino === "programa"
    ? item.mediaType === "Podcast"
    : item.mediaType === "Video" || item.mediaType === "Image");
}

function PickerContent({ destino, multiple, selectedIds = [], title, description, onConfirm, onReset, onOpenChange }:
  PickerOptions & { destino: "programa" | "rutinas"; multiple: boolean }) {
  const t = useT();
  const previewRef = useRef<HTMLElement>(null);
  const [initialIds] = useState(() => [...new Set(selectedIds)].slice(0, multiple ? undefined : 1));
  // Se conservan los objetos elegidos aunque cambie la página o la búsqueda.
  const [selected, setSelected] = useState(() => new Map<string, MediaItem | null>(initialIds.map(id => [id, null])));
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MediaCategory | "all">("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.allSettled(initialIds.map(id => getMediaItemById(id))).then(results => {
      if (!active) return;
      const resolved = new Map<string, MediaItem>();
      const failed: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.id === initialIds[index] && accepts(result.value, destino)) resolved.set(initialIds[index], result.value);
        else failed.push(initialIds[index]);
      });
      setSelected(previous => new Map([...previous].map(([id, item]) => [id, item ?? resolved.get(id) ?? null])));
      setUnavailable(failed);
    });
    return () => { active = false; };
  }, [initialIds, destino]);

  useEffect(() => {
    const controller = new AbortController();
    const types: MediaItem["mediaType"][] = destino === "programa" ? ["Podcast"] : ["Video", "Image"];
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void Promise.all(types.map(mediaType => fetchMediaItems(page, 12, {
        search, category, mediaType, status: "Published", sortBy: "title", sortDirection: "asc",
      }, controller.signal))).then(results => {
        if (controller.signal.aborted) return;
        // Defensa adicional: un resultado ajeno al destino nunca llega a la UI.
        const visible = results.flatMap((result, index) => result.data.filter(item =>
          item.mediaType === types[index] && accepts(item, destino)));
        setItems([...new Map(visible.map(item => [item.id, item])).values()]);
        setTotal(results.reduce((sum, result) => sum + result.total, 0));
        setTotalPages(Math.max(1, ...results.map(result => result.totalPages)));
      }).catch(cause => {
        if (!controller.signal.aborted) {
          setItems([]);
          setError(cause instanceof Error ? cause.message : t("No pudimos cargar la biblioteca"));
        }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [destino, page, search, category, reload, t]);

  function toggle(item: MediaItem) {
    setSelected(previous => {
      const next = multiple ? new Map(previous) : new Map<string, MediaItem | null>();
      if (multiple && next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
    setUnavailable(previous => previous.filter(id => id !== item.id));
  }

  function showPreview(item: MediaItem) {
    setPreview(item);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ block: "nearest" }));
    }
  }

  const chosen = [...selected.values()].filter((item): item is MediaItem => item !== null);
  const selectionUnavailable = unavailable.some(id => selected.has(id));
  const categories = Object.entries(mediaCategoryMeta) as Array<[MediaCategory, { label: string; tone: string }]>;

  return <>
    <DialogHeader>
      <DialogTitle>{title ?? t("Añadir desde la biblioteca")}</DialogTitle>
      <span className="flex w-fit max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
        <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />
        {destino === "programa" ? t("Destino: Programa, solo podcasts") : t("Destino: Rutinas, vídeos e imágenes")}
      </span>
      <DialogDescription>{description ?? (destino === "programa"
        ? t("Solo podcasts publicados para el programa.")
        : t("Solo vídeos e imágenes publicados para las rutinas."))}</DialogDescription>
    </DialogHeader>
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
        <Input type="search" aria-label={t("Buscar medios")} placeholder={t("Buscar por título, autor o tema...")}
          value={search} className="pl-9" onChange={event => { setSearch(event.target.value); setPage(1); setLoading(true); }} />
      </div>
      <select aria-label={t("Filtrar por categoría")} value={category}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
        onChange={event => { setCategory(event.target.value as MediaCategory | "all"); setPage(1); setLoading(true); }}>
        <option value="all">{t("Todas las categorías")}</option>
        {categories.map(([value, meta]) => <option key={value} value={value}>{t(meta.label)}</option>)}
      </select>
    </div>
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0" aria-busy={loading}>
        {loading ? <div className="flex flex-col gap-3">{Array.from({ length: 4 }, (_, index) =>
          <Skeleton key={index} className="h-20 rounded-xl" />)}</div>
          : error ? <div className="flex flex-col gap-3 rounded-xl bg-destructive-soft p-4" role="alert">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => setReload(value => value + 1)}>{t("Reintentar")}</Button>
          </div> : items.length === 0 ? <p role="status" className="rounded-xl bg-muted p-6 text-sm">{t("Sin resultados con los filtros")}</p>
            : <div className="flex flex-col gap-2">
              {items.map(item => {
                const Icon = item.mediaType === "Video" ? Video : item.mediaType === "Image" ? ImageIcon : FileAudio;
                const index = [...selected.keys()].indexOf(item.id);
                return <article key={item.id} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${index >= 0 ? "border-primary bg-primary-soft" : "border-transparent bg-card hover:bg-muted/40"}`}>
                  <Button variant="ghost" className="h-auto min-h-16 min-w-0 flex-1 justify-start gap-3 whitespace-normal px-1 text-left"
                    aria-label={t("Seleccionar {title}", { title: item.title })} aria-pressed={index >= 0} onClick={() => toggle(item)}>
                    <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${index >= 0 ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                      {index >= 0 && <Check className="size-3.5" />}
                    </span>
                    <span className="relative hidden size-12 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white min-[360px]:flex">
                      {item.sortOrder > 0 ? <span className="font-heading text-lg font-bold">{item.sortOrder}</span> : <Icon aria-hidden="true" className="size-6" />}
                      {item.thumbnailKey && <MediaThumb storageKey={item.thumbnailKey} alt="" className="absolute inset-0 size-full rounded-lg object-cover" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="break-words text-sm font-semibold">{item.title}</span>
                      <span className="break-words text-xs font-normal text-muted-foreground">{t(getMediaCategoryMeta(item.category).label)}{item.author ? ` · ${item.author}` : ""}</span>
                      <span className="flex flex-wrap gap-2 text-xs font-normal text-muted-foreground">
                        <span>{t(mediaTypeMeta[item.mediaType].label)}</span>
                        {item.mediaType !== "Image" && <span>{formatDuration(item.durationSecs)}</span>}
                      </span>
                    </span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => showPreview(item)}
                    aria-label={t("Vista previa de {title}", { title: item.title })}><Eye /></Button>
                </article>;
              })}
            </div>}
      </div>
      <aside ref={previewRef} aria-label={t("Vista previa")} className="flex min-w-0 flex-col gap-3 self-start rounded-xl bg-muted/50 p-3 lg:sticky lg:top-0">
        <h3 className="text-sm font-semibold">{t("Vista previa")}</h3>
        {preview ? <>
          {preview.mediaType === "Podcast" && <div className="relative flex aspect-video items-center justify-center rounded-xl bg-brand-gradient text-white">
            {preview.sortOrder > 0 ? <span className="font-heading text-5xl font-bold">{preview.sortOrder}</span> : <FileAudio aria-hidden="true" className="size-12" />}
            {preview.thumbnailKey && <MediaThumb storageKey={preview.thumbnailKey} alt="" className="absolute inset-0 size-full rounded-xl object-cover" />}
          </div>}
          <p className="break-words text-sm font-medium">{preview.title}</p>
          <p className="break-words text-xs text-muted-foreground">{t(getMediaCategoryMeta(preview.category).label)}{preview.author ? ` · ${preview.author}` : ""}</p>
          <MediaPlayer key={preview.id} storageKey={preview.storageKey} mediaType={preview.mediaType}
            autoPlay alt={preview.title} className="rounded-lg" />
          {preview.description && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{preview.description}</p>}
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs">
            <span>{t("Estado")}</span><span className="rounded-full bg-success-soft px-2 py-1 text-success-soft-foreground">{t("Publicado")}</span>
          </div>
          {preview.usageCount != null && <p className="text-xs text-muted-foreground">{t("{count} referencias activas", { count: String(preview.usageCount) })}</p>}
        </> : <p className="text-xs text-muted-foreground">{t("Abre una vista previa antes de confirmar la selección.")}</p>}
      </aside>
    </div>
    <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("Página {page} de {totalPages}", { page: String(page), totalPages: String(totalPages) })} · {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>{t("Anterior")}</Button>
          <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => setPage(value => value + 1)}>{t("Siguiente")}</Button>
        </div>
      </div>
      {selected.size > 0 && <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto" aria-label={t("Selección actual")}>
        {[...selected].map(([id, item], index) => <Button key={id} size="sm" variant="secondary" className="max-w-full"
          aria-label={t("Quitar de la selección: {title}", { title: item?.title ?? t("Recurso seleccionado") })}
          onClick={() => setSelected(previous => { const next = new Map(previous); next.delete(id); return next; })}>
          <span className="truncate">{multiple ? `${index + 1}. ` : ""}{item?.title ?? t("Recurso seleccionado")}</span><X />
        </Button>)}
      </div>}
      {selectionUnavailable && <p role="alert" className="text-xs text-destructive">{t("Una selección anterior ya no está disponible. Quítala o elige otro recurso.")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onReset ? <Button variant="outline" size="sm" onClick={() => { onReset(); onOpenChange(false); }}><RotateCcw />{t("Usar por defecto")}</Button>
          : <p className="text-xs text-muted-foreground">{t("{count} seleccionados", { count: String(selected.size) })}</p>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("Cancelar")}</Button>
          <Button size="sm" disabled={selected.size === 0 || chosen.length !== selected.size || selectionUnavailable}
            onClick={() => { onConfirm(chosen); onOpenChange(false); }}>{t("Añadir {count}", { count: String(selected.size) })}</Button>
        </div>
      </div>
    </div>
  </>;
}
