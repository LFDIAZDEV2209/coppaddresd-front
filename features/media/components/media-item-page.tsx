"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileAudio, Pencil, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import {
  getMediaItemById,
  updateMediaItem,
  publishMediaItem,
  unpublishMediaItem,
  archiveMediaItem,
} from "../services/media-service";
import { resolveStorageKeys } from "../services/upload-service";
import {
  MediaDetailContent,
  type MediaDetailAction,
} from "./media-detail-dialog";
import { MediaReferencesDialog } from "./media-references-dialog";
import { MediaFormFields } from "./media-form-fields";
import { mediaTypeMeta, mediaStatusMeta } from "./media-meta";
import type { MediaInput, MediaItem } from "../types";

/** Detalle y edición por URL, con los mismos contratos de reproducción, subida y publicación. */
export function MediaItemPage({
  id,
  edit = false,
}: {
  id: string;
  edit?: boolean;
}) {
  const t = useT(),
    router = useRouter(),
    { hasPermission } = useAuth();
  const [media, setMedia] = useState<MediaItem | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [revision, setRevision] = useState(0),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState<MediaDetailAction | null>(null),
    [references, setReferences] = useState(false);
  useBreadcrumbTitle(
    edit ? t("Editar medio") : (media?.title ?? t("Detalle del medio")),
  );
  useEffect(() => {
    let active = true;
    void getMediaItemById(id)
      .then((item) => {
        if (active) {
          setMedia(item);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  const allowed: MediaDetailAction[] = [
    ...(hasPermission("Media.Publish")
      ? (["publish", "unpublish"] as const)
      : []),
    ...(hasPermission("Media.Archive") ? (["archive"] as const) : []),
  ];
  const submit = async (
    input: MediaInput,
    file?: File,
    thumbnail?: File | null,
    onProgress?: (percent: number) => void,
  ) => {
    if (!hasPermission("Media.Edit")) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await resolveStorageKeys(
        input,
        file,
        thumbnail,
        onProgress,
      );
      await updateMediaItem(id, payload);
      router.push(`/media/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("No se pudo guardar el medio."),
      );
    } finally {
      setSaving(false);
    }
  };
  const runAction = async () => {
    if (!pending || !media || !allowed.includes(pending)) return;
    const action = pending;
    setPending(null);
    setSaving(true);
    setError(null);
    try {
      if (action === "publish") await publishMediaItem(id);
      else if (action === "unpublish") await unpublishMediaItem(id);
      else await archiveMediaItem(id);
      setMedia(await getMediaItemById(id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("No se pudo completar la acción."),
      );
    } finally {
      setSaving(false);
    }
  };
  const labels = {
    publish: t("Publicar"),
    unpublish: t("Despublicar"),
    archive: t("Archivar"),
  };
  return (
    <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push(edit ? `/media/${id}` : "/media")}
      >
        <ArrowLeft data-icon="inline-start" />
        {edit ? t("Volver al detalle") : t("Volver a medios")}
      </Button>
      <PageHeader
        title={
          edit ? t("Editar medio") : (media?.title ?? t("Detalle del medio"))
        }
        description={
          edit
            ? t("Actualiza la información y el archivo de este recurso.")
            : media
              ? `${media.author} · ${t(mediaTypeMeta[media.mediaType].label)} · ${t(mediaStatusMeta[media.status].label)}`
              : t("Información del recurso multimedia")
        }
        icon={FileAudio}
        actions={
          !edit && media && hasPermission("Media.Edit") ? (
            <Button
              variant="outline"
              onClick={() => router.push(`/media/${id}/edit`)}
            >
              <Pencil data-icon="inline-start" />
              {t("Editar medio")}
            </Button>
          ) : undefined
        }
      />
      {loading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : loadError || !media ? (
        <div
          role="alert"
          className="rounded-2xl border border-border bg-card p-8"
        >
          <h2 className="font-semibold">{t("No se pudo cargar el medio")}</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            <RefreshCw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      ) : edit && !hasPermission("Media.Edit") ? (
        <p
          role="alert"
          className="rounded-2xl border border-border bg-card p-6"
        >
          {t("No tienes permiso para editar este medio.")}
        </p>
      ) : edit ? (
        <section className="min-w-0">
          <MediaFormFields
            fullPage
            key={id}
            media={media}
            saving={saving}
            serverError={error}
            previewClassName="aspect-video max-h-96!"
            onCancel={() => router.push(`/media/${id}`)}
            onSubmit={submit}
          />
        </section>
      ) : (
        <>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive-soft p-4 text-sm text-destructive-soft-foreground"
            >
              {error}
            </p>
          )}
          <MediaDetailContent
            key={id}
            media={media}
            fullPage
            actionLoading={saving}
            allowedActions={allowed}
            onAction={allowed.length ? setPending : undefined}
            onShowReferences={() => setReferences(true)}
          />
        </>
      )}
      <MediaReferencesDialog
        media={references && media ? media : undefined}
        onClose={() => setReferences(false)}
      />
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === "publish"
                ? t("¿Publicar medio?")
                : pending === "unpublish"
                  ? t("¿Despublicar medio?")
                  : t("¿Archivar medio?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "publish"
                ? t(
                    'Se validará el archivo en storage y "{title}" pasará a estado Publicado: los pacientes podrán verlo.',
                    { title: media?.title ?? "" },
                  )
                : pending === "unpublish"
                  ? t(
                      '"{title}" volverá a borrador y dejará de estar disponible para los pacientes.',
                      { title: media?.title ?? "" },
                    )
                  : t(
                      '"{title}" saldrá de los selectores de nuevas asignaciones, pero conservará su reproducción en las semanas ya programadas.',
                      { title: media?.title ?? "" },
                    )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => void runAction()}
            >
              {pending ? labels[pending] : t("Confirmar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
