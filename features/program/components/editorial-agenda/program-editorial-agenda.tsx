"use client";

// Agenda editorial del programa (REQ-PCR-05 → REQ-PCA-05): matriz de 12
// semanas × 7 días que muestra el podcast asignado a cada casilla con
// duración, autor y estado de publicación. En modo edición permite asignar,
// reemplazar y quitar el podcast de cada día (con preescucha) sin diálogos
// anidados: la tupla canónica (Plantilla, Semana, Día) → MediaId vive en las
// filas WeeklyDayTemplate de la plantilla.

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Mic, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  getMediaItemById,
  formatDuration,
} from "@/features/media/services/media-service";
import { MediaAudioPreview } from "@/features/media/components/media-audio-preview";
import { mediaStatusMeta } from "@/features/media/components/media-meta";
import { PodcastPickerDialog } from "../podcast-picker-dialog";
import type { WeeklyDayTask } from "../../types";
import type { MediaItem } from "@/features/media/types";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

/** Máximo de semanas visibles en la matriz (programa de 83 días = 12 semanas). */
const MAX_AGENDA_WEEKS = 12;

/** Etiquetas ISO de los días: 1 = lunes … 7 = domingo. */
const AGENDA_DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const AGENDA_DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

interface ProgramEditorialAgendaProps {
  /** Filas del horario semanal de la plantilla (todas las tareas). */
  days: WeeklyDayTask[];
  /** Semanas del programa (se muestran hasta 12). */
  totalWeeks: number;
  /** Edición habilitada (plantilla Draft + Program.Edit). */
  editable: boolean;
  /** Cambio de podcast de un día: null = quitar la fila de podcast. */
  onChange?: (
    weekday: number,
    mediaId: string | null,
    media?: MediaItem | null,
  ) => void;
  /** Acciones extra en el encabezado (p. ej. asignación masiva). */
  actions?: React.ReactNode;
}

/**
 * Resuelve los metadatos (autor, duración, estado) de cada mediaId de la
 * plantilla en una sola pasada (≤ 7 llamadas, una por día distinto) y
 * alimenta la matriz con título/autor/duración/estado por casilla.
 */
function useAgendaMedia(days: WeeklyDayTask[]) {
  const [mediaById, setMediaById] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const mediaIds = useMemo(
    () =>
      [
        ...new Set(
          days
            .filter((d) => d.taskCode === "podcast" && d.mediaId)
            .map((d) => d.mediaId as string),
        ),
      ].sort(),
    [days],
  );

  useEffect(() => {
    const missing = mediaIds.filter((id) => !(id in mediaById));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const resolved = await Promise.all(
          missing.map((id) => getMediaItemById(id).catch(() => null)),
        );
        if (cancelled) return;
        setMediaById((prev) => {
          const next = { ...prev };
          missing.forEach((id, index) => {
            if (resolved[index]) next[id] = resolved[index] as MediaItem;
          });
          return next;
        });
        setFailed(resolved.some((r) => r === null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mediaById se consulta por cierre al momento del efecto
  }, [mediaIds]);

  const unresolved = mediaIds.filter((id) => !(id in mediaById));
  /** Cachea un medio ya resuelto (evita reconsultar el detalle). */
  const cacheMedia = useCallback((media: MediaItem) => {
    setMediaById((prev) => ({ ...prev, [media.id]: media }));
  }, []);
  return {
    mediaById,
    resolving: loading || unresolved.length > 0,
    failed,
    cacheMedia,
  };
}

export function ProgramEditorialAgenda({
  days,
  totalWeeks,
  editable,
  onChange,
  actions,
}: ProgramEditorialAgendaProps) {
  const t = useT();

  // Fila de podcast por weekday (la plantilla aplica el mismo horario a
  // todas las semanas: cada fila WeeklyDayTemplate representa el día).
  const podcastByWeekday = useMemo(() => {
    const map: Record<number, WeeklyDayTask> = {};
    for (const d of days) {
      if (d.taskCode === "podcast") map[d.weekday] = d;
    }
    return map;
  }, [days]);

  const { mediaById, resolving, failed, cacheMedia } = useAgendaMedia(days);

  // Selector de podcast para una casilla concreta.
  const [picker, setPicker] = useState<{
    weekday: number;
    currentMediaId: string | null;
  } | null>(null);

  const assignedCount = Object.keys(podcastByWeekday).length;
  const weeks = Math.max(
    1,
    Math.min(totalWeeks || MAX_AGENDA_WEEKS, MAX_AGENDA_WEEKS),
  );

  const handleSelect = (
    mediaId: string | null,
    mediaItem?: MediaItem | null,
  ) => {
    if (!picker) return;
    onChange?.(picker.weekday, mediaId, mediaItem ?? null);
    if (mediaItem) {
      // Cache local: la casilla muestra el podcast recién elegido sin
      // reconsultar el detalle.
      cacheMedia(mediaItem);
    }
    setPicker(null);
  };

  const cellTone = (status?: string) => {
    if (status === "Published") return "border-success/30 bg-success-soft/40";
    if (status === "Archived") return "border-border bg-muted/40";
    return "border-warning/30 bg-warning-soft/40";
  };

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      aria-label={t("Agenda editorial del programa")}
    >
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarRange className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{t("Agenda editorial")}</h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "{count} de 7 días con podcast asignado · se repite en las {weeks} semanas",
                { count: String(assignedCount), weeks: String(weeks) },
              )}
            </p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Matriz 12 semanas × 7 días */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[760px]">
          {/* Cabecera de días */}
          <div
            className="grid items-end gap-1.5 border-b border-border pb-1.5"
            style={{ gridTemplateColumns: `52px repeat(7, minmax(0, 1fr))` }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Sem")}
            </span>
            {AGENDA_DAY_SHORT.map((short, index) => (
              <span
                key={short}
                title={t(AGENDA_DAY_LABELS[index])}
                className="text-[11px] font-semibold text-foreground"
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">
                  {t(AGENDA_DAY_LABELS[index])}
                </span>
              </span>
            ))}
          </div>

          {/* Filas por semana */}
          {Array.from({ length: weeks }, (_, weekIndex) => weekIndex + 1).map(
            (week) => (
              <div
                key={week}
                className="grid gap-1.5 border-b border-border/40 py-1.5 last:border-0"
                style={{
                  gridTemplateColumns: `52px repeat(7, minmax(0, 1fr))`,
                }}
              >
                <div className="flex items-center">
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-[11px] font-bold tabular-nums text-foreground">
                    {week}
                  </span>
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
                  const row = podcastByWeekday[weekday];
                  const media = row?.mediaId
                    ? mediaById[row.mediaId]
                    : undefined;
                  const missingMeta = Boolean(row?.mediaId) && !media;
                  const statusMeta = media
                    ? mediaStatusMeta[media.status]
                    : undefined;

                  return (
                    <div
                      key={weekday}
                      role={editable ? "button" : undefined}
                      tabIndex={editable && !resolving ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (
                          editable &&
                          (e.key === "Enter" || e.key === " ") &&
                          e.target === e.currentTarget
                        ) {
                          e.preventDefault();
                          setPicker({
                            weekday,
                            currentMediaId: row?.mediaId ?? null,
                          });
                        }
                      }}
                      onClick={() => {
                        if (!editable || resolving) return;
                        setPicker({
                          weekday,
                          currentMediaId: row?.mediaId ?? null,
                        });
                      }}
                      title={
                        media
                          ? `${media.title} · ${media.author}`
                          : editable
                            ? t("Asignar podcast")
                            : t("Sin podcast asignado")
                      }
                      aria-disabled={!editable || resolving}
                      className={cn(
                        "group flex min-h-[64px] flex-col justify-between gap-1 rounded-lg border p-1.5 text-left",
                        row && media
                          ? cellTone(media.status)
                          : row
                            ? "border-border bg-card"
                            : "border-dashed border-border bg-transparent",
                        editable &&
                          "cursor-pointer hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      {/* Contenido de la casilla */}
                      {row && media ? (
                        <>
                          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">
                            {media.title}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {media.author}
                          </span>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {formatDuration(media.durationSecs)}
                            </span>
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: statusMeta?.dot }}
                              title={statusMeta?.label}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <MediaAudioPreview
                              storageKey={media.storageKey}
                              label={media.title}
                              compact
                              className="flex-1"
                            />
                            {editable && (
                              <span
                                role="button"
                                tabIndex={0}
                                title={t("Quitar podcast")}
                                aria-label={t("Quitar podcast")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChange?.(weekday, null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onChange?.(weekday, null);
                                  }
                                }}
                                className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </span>
                            )}
                          </div>
                        </>
                      ) : row && missingMeta ? (
                        /* Metadatos en resolución: skeleton por casilla */
                        <div className="flex flex-1 flex-col gap-1 py-0.5">
                          <Skeleton className="h-2.5 w-full" />
                          <Skeleton className="h-2 w-3/4" />
                          <Skeleton className="h-2 w-1/3" />
                        </div>
                      ) : (
                        <span className="flex flex-1 items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
                          {editable ? (
                            <>
                              <Plus className="size-3" />
                              {t("Asignar podcast")}
                            </>
                          ) : (
                            <Mic className="size-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Leyenda de estado + aviso de resolución */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        {failed && (
          <Badge
            variant="outline"
            className="border-destructive/30 text-destructive"
          >
            {t("No se pudieron resolver algunos metadatos")}
          </Badge>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[var(--success-foreground)]" />
          {t("Publicado")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[var(--warning)]" />
          {t("Borrador")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[var(--muted-foreground)]" />
          {t("Archivado")}
        </span>
        {editable && (
          <span className="ml-auto">
            {t("Haz clic en una casilla para asignar o cambiar el podcast")}
          </span>
        )}
      </div>

      {picker && (
        <PodcastPickerDialog
          open
          onOpenChange={(open) => !open && setPicker(null)}
          currentMediaId={picker.currentMediaId}
          dayLabel={t(AGENDA_DAY_LABELS[picker.weekday - 1])}
          onSelect={handleSelect}
        />
      )}
    </section>
  );
}
