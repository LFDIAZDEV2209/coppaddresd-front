"use client";

// Modal de eliminación bloqueada (REQ-PCA-07): cuando el backend rechaza
// DELETE /api/v1/media/{id} con 409 Conflict por referencias activas, este
// diálogo explica por qué, lista las dependencias (plantillas y semanas) y
// ofrece archivar en lugar de eliminar (design D5).

import { useEffect, useState } from "react";
import { Archive, Building2, Lock, ShieldAlert, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  archiveMediaItem,
  fetchMediaReferences,
} from "../services/media-service";
import type { MediaItem, MediaReferences } from "../types";
import { useT } from "@/providers/i18n-provider";
import { WEEKDAY_LABELS_ISO } from "./media-meta";

interface MediaDeleteBlockedDialogProps {
  media?: MediaItem;
  onClose: () => void;
  /** Se dispara al archivar con éxito (recarga la biblioteca). */
  onArchived?: (item: MediaItem) => void;
}

export function MediaDeleteBlockedDialog({
  media,
  onClose,
  onArchived,
}: MediaDeleteBlockedDialogProps) {
  const t = useT();
  const open = Boolean(media);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-destructive" />
            {t("No se puede eliminar el medio")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "El medio tiene referencias activas. Sugerencia: archívalo en lugar de eliminarlo.",
            )}
          </DialogDescription>
        </DialogHeader>
        {media && (
          <MediaDeleteBlockedContent
            media={media}
            onClose={onClose}
            onArchived={onArchived}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MediaDeleteBlockedContent({
  media,
  onClose,
  onArchived,
}: {
  media: MediaItem;
  onClose: () => void;
  onArchived?: (item: MediaItem) => void;
}) {
  const t = useT();
  const [refs, setRefs] = useState<MediaReferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMediaReferences(media.id);
        if (!cancelled) setRefs(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t("No se pudieron cargar las referencias."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [media.id, t]);

  /** Archivar retira el medio de los selectores sin romper el historial. */
  const handleArchive = async () => {
    setArchiving(true);
    setArchiveError(null);
    try {
      const updated = await archiveMediaItem(media.id);
      onArchived?.(updated);
      onClose();
    } catch (err) {
      setArchiveError(
        err instanceof Error ? err.message : t("No se pudo archivar el medio."),
      );
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-destructive-soft/40 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("Cerrar")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dependencias que bloquean la eliminación */}
      {refs && refs.totalReferences > 0 && (
        <ul className="flex flex-col gap-1.5">
          {refs.templateReferences.map((ref) => (
            <li
              key={`t-${ref.templateId}-${ref.weekday}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground">
                  {ref.templateName}
                </span>
              </span>
              <span className="shrink-0 text-muted-foreground">
                {t(WEEKDAY_LABELS_ISO[ref.weekday] ?? "")}
              </span>
            </li>
          ))}
          {refs.enrollmentReferences.map((ref) => (
            <li
              key={`e-${ref.enrollmentId}-${ref.weekNumber}-${ref.weekday}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <User className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground">
                  {ref.patientName ??
                    t("Paciente ({id})", {
                      id: ref.enrollmentId.substring(0, 8),
                    })}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <span>
                  {t("Semana {week}", { week: String(ref.weekNumber) })}
                </span>
                {ref.isFrozen && (
                  <Badge
                    variant="secondary"
                    className="bg-warning-soft text-warning-soft-foreground text-[10px]"
                  >
                    {t("Congelada")}
                  </Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {archiveError && (
        <p
          className="rounded-lg bg-destructive-soft/40 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {archiveError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("Cerrar")}
        </Button>
        <Button
          size="sm"
          variant="default"
          disabled={archiving}
          onClick={() => void handleArchive()}
          title={t(
            "El medio sale de los selectores de nuevas asignaciones pero conserva su reproducción histórica.",
          )}
        >
          <Archive data-icon="inline-start" />
          {t("Archivar en su lugar")}
        </Button>
      </div>

      <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        {t(
          "Archivar protege la integridad de las semanas en curso: el paciente sigue viendo su lección y el medio desaparece de las nuevas asignaciones.",
        )}
      </p>
    </div>
  );
}
