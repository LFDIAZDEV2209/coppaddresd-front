"use client";

// Diálogo "Dónde se usa" (REQ-PCA-07): lista las plantillas y las semanas
// de pacientes que dependen de un medio, consumiendo
// GET /api/v1/media/{id}/references. Es la vista de dependencias que
// acompaña la decisión de eliminar o archivar.

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Link2,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
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
import { fetchMediaReferences } from "../services/media-service";
import type { MediaItem, MediaReferences } from "../types";
import { useT } from "@/providers/i18n-provider";
import { WEEKDAY_LABELS_ISO } from "./media-meta";

interface MediaReferencesDialogProps {
  media?: MediaItem;
  onClose: () => void;
}

export function MediaReferencesDialog({
  media,
  onClose,
}: MediaReferencesDialogProps) {
  const t = useT();
  const open = Boolean(media);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            {t("¿Dónde se usa?")}
          </DialogTitle>
          <DialogDescription>
            {t("Plantillas y semanas de pacientes que dependen de este medio.")}
            {media ? ` ${media.title}` : ""}
          </DialogDescription>
        </DialogHeader>
        {media && <MediaReferencesContent mediaId={media.id} />}
      </DialogContent>
    </Dialog>
  );
}

function MediaReferencesContent({ mediaId }: { mediaId: string }) {
  const t = useT();
  const [refs, setRefs] = useState<MediaReferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMediaReferences(mediaId);
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
  }, [mediaId, reloadKey, t]);

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
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft/40 py-10 text-center">
        <p className="text-xs text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          <RefreshCw data-icon="inline-start" />
          {t("Reintentar")}
        </Button>
      </div>
    );
  }

  if (!refs) return null;

  if (refs.totalReferences === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success">
          <ShieldCheck className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {t("Sin referencias activas")}
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {t(
            "Ninguna plantilla ni semana de paciente usa este medio: es seguro eliminarlo.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {t("{count} referencias activas", {
          count: String(refs.totalReferences),
        })}
      </p>

      {/* Plantillas (WeeklyDayTemplate) */}
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Building2 className="size-3.5 text-primary" />
          {t("Plantillas de programa")}
        </p>
        {refs.templateReferences.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("Ninguna plantilla lo usa.")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {refs.templateReferences.map((ref) => (
              <li
                key={`${ref.templateId}-${ref.weekday}-${ref.points}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium text-foreground">
                    {ref.templateName}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <span>{t(WEEKDAY_LABELS_ISO[ref.weekday] ?? "")}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {ref.points} XP
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Semanas de pacientes (TasksSnapshot) */}
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <User className="size-3.5 text-primary" />
          {t("Semanas de pacientes")}
        </p>
        {refs.enrollmentReferences.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("Ninguna semana de paciente lo usa.")}
          </p>
        ) : (
          <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
            {refs.enrollmentReferences.map((ref) => (
              <li
                key={`${ref.enrollmentId}-${ref.weekNumber}-${ref.weekday}`}
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
                  <span>{t(WEEKDAY_LABELS_ISO[ref.weekday] ?? "")}</span>
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
      </div>
    </div>
  );
}
