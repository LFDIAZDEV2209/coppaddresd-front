"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive as ArchiveGlyph,
  BrushCleaning,
  CheckCircle2,
  FileAudio,
  Clock,
  Eye,
  LayoutGrid,
  Mic,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import { ApiError } from "@/lib/api/http";
import {
  archiveMediaItem,
  deleteMediaItem,
  fetchMediaItems,
  formatDuration,
  publishMediaItem,
  unpublishMediaItem,
} from "../services/media-service";
import { MediaPlayer } from "./media-player";
import { MediaThumb } from "./media-thumb";
import { getMediaCategoryMeta, mediaCategoryMeta, mediaStatusMeta } from "./media-meta";
import { MediaTable } from "./media-table";
import { type MediaDetailAction } from "./media-detail-dialog";
import { MediaReferencesDialog } from "./media-references-dialog";
import { MediaDeleteBlockedDialog } from "./media-delete-blocked-dialog";
import { MediaCleanupAdminDialog } from "./media-cleanup-admin-dialog";
import type { MediaFilters, MediaItem, PaginatedResult } from "../types";

/** Aviso efímero de la biblioteca (resultados de acciones semánticas). */
interface MediaToast {
  id: number;
  message: string;
  type: "success" | "info" | "error";
}

export function MediaPage() {
  const t = useT();
  const router = useRouter();
  const { hasPermission } = useAuth();
  // Permisos de la matriz Media.*: las acciones semánticas y el panel de
  // mantenimiento solo se exponen si el actor tiene el permiso del backend.
  const canPublish = hasPermission("Media.Publish");
  const canArchive = hasPermission("Media.Archive");
  const canSystem = hasPermission("System.AdminSettings");
  const canCreate = hasPermission("Media.Create");
  const canEdit = hasPermission("Media.Edit");
  const canDelete = hasPermission("Media.Delete");
  const [result, setResult] = useState<PaginatedResult<MediaItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilterState] = useState<MediaFilters>({
    search: "", mediaType: "Podcast", category: "all", status: "all",
    usage: "all", sortBy: "createdAt", sortDirection: "desc",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey(value => value + 1), []);
  const setFilters = (partial: Partial<MediaFilters>) => {
    setLoading(true);
    setFilterState(previous => ({ ...previous, ...partial, mediaType: "Podcast" }));
    setPage(1);
  };

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [deleting, setDeleting] = useState<MediaItem | undefined>();
  const [pageSize, setPageSize] = useState(20);
  // El episodio seleccionado no depende del resultado ni de sus filtros.
  const [currentPodcast, setCurrentPodcast] = useState<MediaItem | null>(null);
  const podcasts = useMemo(() => (result?.data ?? []).filter(item => item.mediaType === "Podcast"), [result]);
  const categories = Object.entries(mediaCategoryMeta) as Array<
    [MediaItem["category"], { label: string; tone: string }]
  >;
  const shelves = useMemo(() => {
    const groups = new Map<string, MediaItem[]>();
    for (const item of podcasts) {
      const items = groups.get(item.category) ?? [];
      items.push(item);
      groups.set(item.category, items);
    }
    return [...groups].map(([category, items]) => ({
      category, label: getMediaCategoryMeta(items[0].category).label, items,
    }));
  }, [podcasts]);

  useEffect(() => {
    const controller = new AbortController();
    // Sin debounce: cada búsqueda consulta el catálogo paginado completo.
    // Cancelar la anterior impide que una respuesta lenta sustituya la actual.
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchMediaItems(page, pageSize, filters, controller.signal)
        .then(data => { if (!controller.signal.aborted) setResult(data); })
        .catch(err => {
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err.message : t("Error al cargar podcasts"));
            setResult(null);
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, pageSize, filters, reloadKey, t]);
  /** Feedback tras crear en /media/new (query ?creado=1). */
  const [createdNotice, setCreatedNotice] = useState(false);

  // Acción semántica pendiente de confirmar (publicar/despublicar/archivar).
  const [pendingAction, setPendingAction] = useState<{
    action: MediaDetailAction;
    item: MediaItem;
  } | null>(null);
  // Referencias ("dónde se usa") y eliminación bloqueada por 409.
  const [referencesFor, setReferencesFor] = useState<MediaItem | undefined>();
  const [blockedFor, setBlockedFor] = useState<MediaItem | undefined>();
  const [cleanupOpen, setCleanupOpen] = useState(false);
  /** Toasts efímeros de la biblioteca. */
  const [toasts, setToasts] = useState<MediaToast[]>([]);

  const toast = useCallback(
    (message: string, type: MediaToast["type"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((x) => x.id !== id)),
        4000,
      );
    },
    [setToasts],
  );

  useEffect(() => {
    if (!window.location.search.includes("creado=1")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feedback post-creación (flag de URL), intencional
    setCreatedNotice(true);
    // Limpia el query sin recargar para que recargar la página no repita el banner.
    window.history.replaceState(null, "", "/media");
  }, []);

  const openCreate = () => {
    router.push("/media/new");
  };
  const openEdit = (media: MediaItem) => {
    router.push(`/media/${media.id}/edit`);
  };
  /**
   * Acción semántica confirmada (REQ-PCA-03): llama al endpoint dedicado,
   * refresca el estado de la biblioteca y avisa con
   * toast. Un 422 de validación técnica muestra el ProblemDetails del back.
   */
  const runSemanticAction = async (action: MediaDetailAction) => {
    const target = pendingAction?.item;
    if (!target) return;
    setPendingAction(null);
    try {
      if (action === "publish") {
        await publishMediaItem(target.id);
      } else if (action === "unpublish") {
        await unpublishMediaItem(target.id);
      } else {
        await archiveMediaItem(target.id);
      }
      toast(
        action === "publish"
          ? t("Medio publicado: los pacientes ya pueden verlo.")
          : action === "unpublish"
            ? t("Medio devuelto a borrador.")
            : t("Medio archivado: sale de las nuevas asignaciones."),
        "success",
      );
      retry();
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : t("No se pudo completar la acción."),
        "error",
      );
    }
  };

  /**
   * Eliminación con salvaguarda (REQ-PCA-07): si el back responde 409
   * Conflict por referencias activas, abre el diálogo que explica las
   * dependencias y sugiere archivar en lugar de eliminar.
   */
  const confirmDelete = async () => {
    const target = deleting;
    if (!target) return;
    try {
      setActionLoading(true);
      await deleteMediaItem(target.id);
      if (currentPodcast?.id === target.id) setCurrentPodcast(null);
      retry();
      toast(
        t('Medio "{title}" eliminado.', { title: target.title }),
        "success",
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setBlockedFor(target);
      } else {
        toast(
          err instanceof Error
            ? err.message
            : t("No se pudo eliminar el medio."),
          "error",
        );
      }
    } finally {
      setActionLoading(false);
      setDeleting(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 min-w-0">
      <PageHeader
        title={t("Biblioteca de podcasts")}
        description={t("Explora por categoría y escucha sin salir de la biblioteca.")}
        icon={FileAudio}
        actions={
          <>
            {canSystem && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCleanupOpen(true)}
                title={t("Limpieza de blobs huérfanos (solo administradores)")}
              >
                <BrushCleaning data-icon="inline-start" />
                {t("Mantenimiento")}
              </Button>
            )}
            {canCreate && <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              {t("Nuevo medio")}
            </Button>}
          </>
        }
      />

      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label={t("Filtros de medios")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {t("Biblioteca de podcasts")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("{count} podcasts", { count: String(result?.total ?? 0) })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={loading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            {t("Actualizar")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 basis-64 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input type="search" className="pl-9" value={filters.search}
              onChange={event => setFilters({ search: event.target.value })}
              placeholder={t("Buscar podcasts")} aria-label={t("Buscar podcasts")} />
          </div>
          <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.status} onChange={event => setFilters({ status: event.target.value as MediaFilters["status"] })}
            aria-label={t("Filtrar por estado")}>
            <option value="all">{t("Todos los estados")}</option>
            <option value="Published">{t("Publicado")}</option>
            <option value="Draft">{t("Borrador")}</option>
            <option value="Archived">{t("Archivado")}</option>
          </select>
          <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.usage} onChange={event => setFilters({ usage: event.target.value as MediaFilters["usage"] })}
            aria-label={t("Filtrar por uso en programa")}>
            <option value="all">{t("Uso: todos")}</option>
            <option value="assigned">{t("En uso en programas")}</option>
            <option value="unassigned">{t("Sin asignar")}</option>
          </select>
          <ToggleGroup value={[viewMode]} onValueChange={values => setViewMode((values[0] ?? "grid") as "grid" | "table")}
            aria-label={t("Cambiar vista")}>
            <ToggleGroupItem value="grid" aria-label={t("Vista de tarjetas")}><LayoutGrid />{t("Tarjetas")}</ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label={t("Vista de tabla")}><Rows3 />{t("Tabla")}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] lg:flex-wrap" role="group" aria-label={t("Filtrar por categoría")}>
          <Button variant={filters.category === "all" ? "default" : "outline"} size="sm"
            aria-pressed={filters.category === "all"} onClick={() => setFilters({ category: "all" })}>{t("Todas las categorías")}</Button>
          {categories.map(([category, meta]) => <Button key={category} size="sm"
            variant={filters.category === category ? "default" : "outline"} aria-pressed={filters.category === category}
            onClick={() => setFilters({ category })}>{t(meta.label)}</Button>)}
        </div>
      </section>

      {createdNotice && (
        <div
          className="flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-soft-foreground"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{t("Medio creado correctamente.")}</span>
          <button
            type="button"
            onClick={() => setCreatedNotice(false)}
            className="text-xs font-medium underline-offset-2 hover:underline"
          >
            {t("Cerrar")}
          </button>
        </div>
      )}

      {loading ? (
        <MediaSkeleton viewMode={viewMode} />
      ) : error ? (
        <MediaErrorState message={error} onRetry={retry} />
      ) : result && podcasts.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-brand-blue-soft/40 bg-card shadow-xs">
          <SectionHeader
            title={
              t("{count} podcasts", { count: String(result.total) })
            }
            description={
              viewMode === "grid" ? t("Vista de tarjetas") : t("Vista de tabla")
            }
            icon={FileAudio}
            variant="primary"
          />
          {viewMode === "grid" ? (
            <div className="flex min-w-0 flex-col gap-8 p-4 sm:p-5">
              {shelves.map(shelf => <section key={shelf.category} className="min-w-0" aria-label={t(shelf.label)}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-heading text-lg font-semibold">{t(shelf.label)}</h3>
                  <span className="text-xs text-muted-foreground">{t("{count} podcasts", { count: String(shelf.items.length) })}</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
                  {shelf.items.map(item => <PodcastCard key={item.id} item={item} selected={currentPodcast?.id === item.id}
                    onPlay={() => setCurrentPodcast(item)} onDetails={() => router.push(`/media/${item.id}`)}
                    onEdit={canEdit ? () => openEdit(item) : undefined} onDelete={canDelete ? () => setDeleting(item) : undefined} />)}
                </div>
              </section>)}
            </div>
          ) : (
            <MediaTable
              items={podcasts}
              onDetails={(item) => router.push(`/media/${item.id}`)}
              onEdit={openEdit}
              onDelete={setDeleting}
              onPublish={
                canPublish
                  ? (item) => setPendingAction({ action: "publish", item })
                  : undefined
              }
              onUnpublish={
                canPublish
                  ? (item) => setPendingAction({ action: "unpublish", item })
                  : undefined
              }
              onArchive={
                canArchive
                  ? (item) => setPendingAction({ action: "archive", item })
                  : undefined
              }
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-14 text-center" role="status">
          <Mic aria-hidden="true" className="size-8 text-muted-foreground" />
          <h2 className="font-semibold">{t("No se encontraron podcasts")}</h2>
          <Button variant="outline" onClick={() => setFilters({ search: "", category: "all", status: "all", usage: "all" })}>{t("Limpiar filtros")}</Button>
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t("Página {page} de {totalPages}", {
              page: String(result.page),
              totalPages: String(result.totalPages),
            })}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={pageSize}
              onChange={(event) => {
                const size = Number(event.target.value);
                setPageSize(size);
                setPage(1);
              }}
              aria-label={t("Medios por página")}
            >
              <option value={10}>10 {t("por página")}</option>
              <option value={20}>20 {t("por página")}</option>
              <option value={50}>50 {t("por página")}</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                {t("Anterior")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                {t("Siguiente")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fuera de carga/resultados: filtrar, paginar o cambiar vista no desmonta el audio. */}
      {currentPodcast && <section aria-label={t("Reproduciendo ahora")}
        className="sticky bottom-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-card px-4 py-4 shadow-lg sm:-mx-6 sm:px-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Mic aria-hidden="true" className="size-6" /></span>
        <div className="min-w-0 basis-40 flex-1">
          <p className="text-xs text-muted-foreground">{t("Reproduciendo ahora")}</p>
          <p className="truncate text-sm font-semibold" title={currentPodcast.title}>{currentPodcast.title}</p>
          <p className="truncate text-xs text-muted-foreground">{currentPodcast.author}</p>
        </div>
        <div className="order-last w-full sm:order-none sm:w-auto sm:min-w-56 sm:flex-1">
          <MediaPlayer key={currentPodcast.id} storageKey={currentPodcast.storageKey} mediaType="Podcast" autoPlay alt={currentPodcast.title} />
        </div>
        <Button variant="ghost" size="icon" aria-label={t("Cerrar reproductor")} onClick={() => setCurrentPodcast(null)}><X /></Button>
      </section>}

      {/* Confirmación de acción semántica (REQ-PCA-03) */}
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia
            className={
              pendingAction?.action === "archive"
                ? "bg-muted text-muted-foreground"
                : "bg-success-soft text-success"
            }
          >
            {pendingAction?.action === "publish" && <CheckCircle2 />}
            {pendingAction?.action === "unpublish" && <RefreshCw />}
            {pendingAction?.action === "archive" && <ArchiveGlyph />}
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "publish" && t("¿Publicar medio?")}
              {pendingAction?.action === "unpublish" &&
                t("¿Despublicar medio?")}
              {pendingAction?.action === "archive" && t("¿Archivar medio?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "publish" &&
                t(
                  'Se validará el archivo en storage y "{title}" pasará a estado Publicado: los pacientes podrán verlo.',
                  { title: pendingAction?.item.title ?? "" },
                )}
              {pendingAction?.action === "unpublish" &&
                t(
                  '"{title}" volverá a borrador y dejará de estar disponible para los pacientes.',
                  { title: pendingAction?.item.title ?? "" },
                )}
              {pendingAction?.action === "archive" &&
                t(
                  '"{title}" saldrá de los selectores de nuevas asignaciones, pero conservará su reproducción en las semanas ya programadas.',
                  { title: pendingAction?.item.title ?? "" },
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingAction?.action === "archive"
                  ? "bg-muted-foreground hover:bg-muted-foreground/90"
                  : "bg-success text-success-foreground hover:bg-success/90"
              }
              disabled={actionLoading}
              onClick={() =>
                void runSemanticAction(pendingAction?.action ?? "publish")
              }
            >
              {pendingAction?.action === "publish" && t("Publicar")}
              {pendingAction?.action === "unpublish" && t("Despublicar")}
              {pendingAction?.action === "archive" && t("Archivar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Eliminación bloqueada: 409 → dependencias + archivar (REQ-PCA-07) */}
      <MediaDeleteBlockedDialog
        media={blockedFor}
        onClose={() => setBlockedFor(undefined)}
        onArchived={() => {
          toast(t("Medio archivado: sale de las nuevas asignaciones."));

          retry();
        }}
      />

      {/* Dónde se usa (GET /media/{id}/references, REQ-PCA-07) */}
      <MediaReferencesDialog
        media={referencesFor}
        onClose={() => setReferencesFor(undefined)}
      />

      {/* Mantenimiento de huérfanos (solo System.AdminSettings, REQ-PCA-08) */}
      <MediaCleanupAdminDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        onPurged={(report) => {
          toast(
            t("Purga completada: {count} objetos eliminados.", {
              count: String(report.purgedObjects),
            }),
            "success",
          );
          retry();
        }}
      />

      {/* Toasts de la biblioteca */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toastItem) => (
            <div
              key={toastItem.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
                toastItem.type === "success"
                  ? "border-success/20 bg-success-soft text-success-soft-foreground"
                  : toastItem.type === "error"
                    ? "border-destructive/20 bg-destructive-soft text-destructive"
                    : "border-info/20 bg-info-soft text-info-soft-foreground"
              }`}
              role="status"
            >
              <span className="flex-1">{toastItem.message}</span>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((x) => x.id !== toastItem.id))
                }
                className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
                aria-label={t("Cerrar aviso")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Eliminar medio?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Se eliminará la metadata de "{title}". Esta acción no se puede deshacer.',
                { title: deleting?.title ?? "" },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={() => void confirmDelete()}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PodcastCard({ item, selected, onPlay, onDetails, onEdit, onDelete }: {
  item: MediaItem; selected: boolean; onPlay: () => void; onDetails: () => void;
  onEdit?: () => void; onDelete?: () => void;
}) {
  const t = useT();
  const status = mediaStatusMeta[item.status];
  return <article className={`group flex w-52 shrink-0 flex-col gap-3 rounded-xl p-3 transition-colors ${selected ? "bg-primary-soft" : "bg-muted/40 hover:bg-muted"}`}>
    <div className="relative aspect-square rounded-lg bg-brand-gradient text-white">
      {item.sortOrder > 0 ? <span className="absolute inset-0 flex items-center justify-center font-heading text-5xl font-bold">{item.sortOrder}</span>
        : <Mic aria-hidden="true" className="absolute inset-0 m-auto size-14" />}
      {item.thumbnailKey && <MediaThumb storageKey={item.thumbnailKey} alt="" className="absolute inset-0 size-full rounded-lg object-cover" />}
      <Button size="icon" className="absolute right-2 bottom-2 rounded-full shadow-sm"
        onClick={onPlay} disabled={!item.storageKey}
        aria-label={t("Escuchar {title}", { title: item.title })}><Play className="fill-current" /></Button>
    </div>
    <div className="flex flex-1 flex-col gap-1">
      <h4 className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold" title={item.title}>{item.title}</h4>
      <p className="truncate text-xs text-muted-foreground" title={item.author}>{item.author}</p>
    </div>
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock aria-hidden="true" className="size-3.5" />{formatDuration(item.durationSecs)}</span>
      <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: status.bg, color: status.text }}>{t(status.label)}</span>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("Acciones de {title}", { title: item.title })} />}><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDetails}><Eye />{t("Ver detalles")}</DropdownMenuItem>
          {onEdit && <DropdownMenuItem onClick={onEdit}><Pencil />{t("Editar")}</DropdownMenuItem>}
          {onDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 />{t("Eliminar")}</DropdownMenuItem></>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </article>;
}

function MediaSkeleton({ viewMode }: { viewMode: "grid" | "table" }) {
  if (viewMode === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            key={index}
          >
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="mt-2 h-5 w-1/3 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
          key={index}
        >
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-20 lg:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function MediaErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        {t("No pudimos cargar la biblioteca")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
      </Button>
    </div>
  );
}
