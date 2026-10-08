"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive as ArchiveGlyph,
  BrushCleaning,
  CheckCircle2,
  FileAudio,
  Plus,
  RefreshCw,
  Trash2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import { ApiError } from "@/lib/api/http";
import { useMedia } from "../hooks/use-media";
import {
  archiveMediaItem,
  publishMediaItem,
  unpublishMediaItem,
} from "../services/media-service";
import {
  requestUploadIntent,
  uploadToPresignedUrl,
} from "../services/upload-service";
import { MediaToolbar } from "./media-toolbar";
import { MediaCardGrid, MediaGridEmpty } from "./media-card-grid";
import { MediaTable } from "./media-table";
import { MediaFormDialog } from "./media-form-dialog";
import {
  MediaDetailDialog,
  type MediaDetailAction,
} from "./media-detail-dialog";
import { MediaReferencesDialog } from "./media-references-dialog";
import { MediaDeleteBlockedDialog } from "./media-delete-blocked-dialog";
import { MediaCleanupAdminDialog } from "./media-cleanup-admin-dialog";
import type { MediaItem, MediaInput } from "../types";

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
  const {
    result,
    loading,
    actionLoading,
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    save,
    remove,
    retry,
  } = useMedia();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  /** Medio en edición: el modal ya solo abre para editar; crear → /media/new. */
  const [editing, setEditing] = useState<MediaItem | undefined>();
  const [details, setDetails] = useState<MediaItem | undefined>();
  const [deleting, setDeleting] = useState<MediaItem | undefined>();
  const [pageSize, setPageSizeLocal] = useState(10);
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
    [],
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
    setEditing(media);
  };
  const submit = async (
    input: MediaInput,
    file?: File,
    thumbnailFile?: File | null,
    onProgress?: (percent: number) => void,
  ) => {
    let storageKey = input.storageKey;
    let thumbnailKey = input.thumbnailKey ?? null;

    if (file) {
      onProgress?.(1);
      const intent = await requestUploadIntent(
        file.name,
        input.contentType ?? "application/octet-stream",
      );
      onProgress?.(3);
      await uploadToPresignedUrl(intent.presignedUrl, file, onProgress);
      storageKey = intent.storageKey;
    }

    // Miniatura: si hay archivo nuevo se sube a storage y la metadata apunta
    // a la clave nueva; si no, se conserva lo que trae el input (null si se
    // quitó). El objeto viejo lo limpia el back al detectar el cambio de clave.
    if (thumbnailFile) {
      const thumbIntent = await requestUploadIntent(
        thumbnailFile.name,
        thumbnailFile.type,
        "thumbnail",
      );
      await uploadToPresignedUrl(thumbIntent.presignedUrl, thumbnailFile);
      thumbnailKey = thumbIntent.storageKey;
    }

    await save({ ...input, storageKey, thumbnailKey }, editing?.id);
    setEditing(undefined);
  };

  /**
   * Acción semántica confirmada (REQ-PCA-03): llama al endpoint dedicado,
   * refleja el nuevo estado en la fila y en el detalle abierto, y avisa con
   * toast. Un 422 de validación técnica muestra el ProblemDetails del back.
   */
  const runSemanticAction = async (action: MediaDetailAction) => {
    const target = pendingAction?.item ?? details;
    if (!target) return;
    setPendingAction(null);
    try {
      let updated: MediaItem;
      if (action === "publish") {
        const res = await publishMediaItem(target.id);
        updated = {
          ...target,
          status: res.status,
          publishedAt: res.publishedAt,
        };
      } else if (action === "unpublish") {
        updated = await unpublishMediaItem(target.id);
      } else {
        updated = await archiveMediaItem(target.id);
      }
      toast(
        action === "publish"
          ? t("Medio publicado: los pacientes ya pueden verlo.")
          : action === "unpublish"
            ? t("Medio devuelto a borrador.")
            : t("Medio archivado: sale de las nuevas asignaciones."),
        "success",
      );
      // Reflejar el nuevo estado en el detalle abierto y refrescar la lista.
      setDetails((prev) => (prev?.id === updated.id ? updated : prev));
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
      await remove(target.id);
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
      setDeleting(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Contenido multimedia")}
        description={t(
          "Gestiona los podcasts, videos y audios de las lecciones",
        )}
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
            <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              {t("Nuevo medio")}
            </Button>
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
              {t("Biblioteca de medios")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("Filtra por tipo, estado o busca por título.")}
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
        <MediaToolbar
          filters={filters}
          onFilterChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
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
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={
              result.total === 1
                ? t("{count} medio disponible", { count: String(result.total) })
                : t("{count} medios disponibles", {
                    count: String(result.total),
                  })
            }
            description={
              viewMode === "grid" ? t("Vista de tarjetas") : t("Vista de tabla")
            }
            icon={FileAudio}
            variant="primary"
          />
          {viewMode === "grid" ? (
            <div className="p-4 sm:p-5">
              <MediaCardGrid
                items={result.data}
                onDetails={setDetails}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            </div>
          ) : (
            <MediaTable
              items={result.data}
              onDetails={setDetails}
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
        <MediaGridEmpty onCreate={openCreate} />
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
                setPageSizeLocal(size);
                setPageSize(size);
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

      <MediaFormDialog
        key={editing?.id ?? "edit"}
        open={Boolean(editing)}
        media={editing}
        saving={actionLoading}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSubmit={submit}
      />
      <MediaDetailDialog
        media={details}
        onClose={() => setDetails(undefined)}
        actionLoading={actionLoading}
        onAction={(action) => {
          if (!details) return;
          setPendingAction({ action, item: details });
        }}
        onShowReferences={() => setReferencesFor(details)}
      />

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
        onArchived={(updated) => {
          toast(t("Medio archivado: sale de las nuevas asignaciones."));
          setDetails((prev) => (prev?.id === updated.id ? updated : prev));
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
