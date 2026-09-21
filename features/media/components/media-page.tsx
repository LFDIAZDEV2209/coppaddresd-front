"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileAudio, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { useT } from "@/providers/i18n-provider";
import { useMedia } from "../hooks/use-media";
import {
  requestUploadIntent,
  uploadToPresignedUrl,
} from "../services/upload-service";
import { MediaToolbar } from "./media-toolbar";
import { MediaCardGrid, MediaGridEmpty } from "./media-card-grid";
import { MediaTable } from "./media-table";
import { MediaFormDialog } from "./media-form-dialog";
import { MediaDetailDialog } from "./media-detail-dialog";
import type { MediaItem, MediaInput } from "../types";

export function MediaPage() {
  const t = useT();
  const router = useRouter();
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
  const [pageSize, setPageSizeLocal] = useState(8);
  /** Feedback tras crear en /media/new (query ?creado=1). */
  const [createdNotice, setCreatedNotice] = useState(false);

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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t('Contenido multimedia')}
        description={t('Gestiona los podcasts, videos y audios de las lecciones')}
        icon={FileAudio}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            {t('Nuevo medio')}
          </Button>
        }
      />

      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label={t('Filtros de medios')}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t('Biblioteca de medios')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('Filtra por tipo, estado o busca por título.')}
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
            {t('Actualizar')}
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
          className="flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-foreground"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{t('Medio creado correctamente.')}</span>
          <button
            type="button"
            onClick={() => setCreatedNotice(false)}
            className="text-xs font-medium underline-offset-2 hover:underline"
          >
            {t('Cerrar')}
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
            title={result.total === 1
              ? t('{count} medio disponible', { count: String(result.total) })
              : t('{count} medios disponibles', { count: String(result.total) })}
            description={
              viewMode === "grid"
                ? t('Vista de tarjetas')
                : t('Vista de tabla')
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
            />
          )}
        </div>
      ) : (
        <MediaGridEmpty onCreate={openCreate} />
      )}

      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('Página {page} de {totalPages}', { page: String(result.page), totalPages: String(result.totalPages) })}
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
              aria-label={t('Medios por página')}
            >
              <option value={8}>8 {t('por página')}</option>
              <option value={12}>12 {t('por página')}</option>
              <option value={24}>24 {t('por página')}</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                {t('Anterior')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                {t('Siguiente')}
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
      />
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('¿Eliminar medio?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Se eliminará la metadata de "{title}". Esta acción no se puede deshacer.', { title: deleting?.title ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancelar')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id);
                setDeleting(undefined);
              }}
            >
              {t('Eliminar')}
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
        {t('No pudimos cargar la biblioteca')}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t('Reintentar')}
      </Button>
    </div>
  );
}
