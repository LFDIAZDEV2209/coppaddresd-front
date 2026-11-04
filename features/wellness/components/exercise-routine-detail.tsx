"use client";

import { useState, useEffect } from "react";
import { Dumbbell, Eye } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getMediaItemById } from "@/features/media/services/media-service";
import { MediaPlayer } from "@/features/media/components/media-player";
import type { MediaItem } from "@/features/media/types";
import type { ExerciseRoutine } from "../types";
import { PLAN_STATUS_LABELS } from "../services/nutrition-plans-service";
import {
  DIFFICULTY_COLORS,
  CATEGORY_COLORS,
} from "../services/exercise-routines-service";

interface ExerciseRoutineDetailDialogProps {
  routineId: string | null;
  onClose: () => void;
  getRoutine: (id: string) => Promise<ExerciseRoutine | null>;
}

export function ExerciseRoutineDetailDialog({
  routineId,
  onClose,
  getRoutine,
}: ExerciseRoutineDetailDialogProps) {
  const t = useT();
  const [routine, setRoutine] = useState<ExerciseRoutine | null>(null);
  const [loading, setLoading] = useState(Boolean(routineId));
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [demonstrations, setDemonstrations] = useState<Record<string, MediaItem | null>>({});
  const [openedMedia, setOpenedMedia] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!routineId) return;

    let cancelled = false;

    getRoutine(routineId).then((data) => {
      if (!cancelled) {
        setRoutine(data);
        setLoadedRoutineId(routineId);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) { setRoutine(null); setLoadedRoutineId(routineId); setLoading(false); } });

    return () => {
      cancelled = true;
    };
  }, [routineId, getRoutine, attempt]);

  const openDemonstration = async (id: string) => {
    setOpenedMedia(id); setMediaErrors((current) => ({ ...current, [id]: false }));
    if (demonstrations[id]) return;
    try {
      const medium = await getMediaItemById(id);
      setDemonstrations((current) => ({ ...current, [id]: medium }));
    } catch { setMediaErrors((current) => ({ ...current, [id]: true })); }
  };

  if (!routineId) return null;
  const waiting = loading || loadedRoutineId !== routineId;

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog
      open={Boolean(routineId)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-h-[85vh] w-[92vw] max-w-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="size-5" />
            {waiting ? t("Cargando...") : (routine?.name ?? t("Rutina"))}
          </DialogTitle>
        </DialogHeader>

        {waiting ? (
          <DetailSkeleton />
        ) : routine ? (
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 max-h-[60vh]">
            {/* Info básica */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">{t("Categoría")}</span>
                <p>
                  <Badge className={CATEGORY_COLORS[routine.category] ?? ""}>
                    {t(routine.category)}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("Dificultad")}
                </span>
                <p>
                  <Badge
                    className={DIFFICULTY_COLORS[routine.difficulty] ?? ""}
                  >
                    {t(routine.difficulty === "Facil" ? "Fácil" : routine.difficulty === "Dificil" ? "Difícil" : "Moderado")}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("Estado")}</span>
                <p>
                  <Badge className={statusColor(routine.status)}>
                    {t(PLAN_STATUS_LABELS[routine.status])}
                  </Badge>
                </p>
              </div>
              {routine.estimatedMinutes && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t("Duración estimada")}
                  </span>
                  <p className="text-sm font-medium">
                    {t("{minutes} minutos", { minutes: String(routine.estimatedMinutes) })}
                  </p>
                </div>
              )}
              {routine.description && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    {t("Descripción")}
                  </span>
                  <p className="text-sm">{routine.description}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Ejercicios */}
            {routine.exercises.length > 0 ? (
              <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {t("Ejercicios ({count})", { count: String(routine.exercises.length) })}
              </span>
                {routine.exercises
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-medium">
                          {exercise.name}
                        </span>
                      </div>
                      {exercise.targetMuscle && <p className="text-xs text-muted-foreground">{t("Músculo objetivo")}: {exercise.targetMuscle}</p>}
                      {exercise.equipment && <p className="text-xs text-muted-foreground">{t("Equipamiento")}: {exercise.equipment}</p>}
                      {exercise.tips && <p className="rounded-lg bg-primary-soft p-3 text-sm">{exercise.tips}</p>}
                      {exercise.mediaId ? <>
                        <Button type="button" variant="outline" className="min-h-11 justify-start" onClick={() => void openDemonstration(exercise.mediaId!)}>
                          <Eye className="size-4" />{t("Ver demostración")}
                        </Button>
                        {openedMedia === exercise.mediaId && (mediaErrors[exercise.mediaId] ? <p role="alert" className="text-xs text-destructive">{t("No se pudo cargar la demostración. Vuelve a intentarlo.")}</p>
                          : demonstrations[exercise.mediaId] ? <MediaPlayer key={exercise.mediaId} storageKey={demonstrations[exercise.mediaId]!.storageKey}
                              mediaType={demonstrations[exercise.mediaId]!.mediaType} alt={exercise.name} preload="none" className="rounded-xl" />
                            : <Skeleton className="aspect-video w-full rounded-xl" />)}
                      </> : <p className="text-xs text-muted-foreground">{t("Este ejercicio todavía no tiene imagen o vídeo.")}</p>}
                      {exercise.description && (
                        <p className="text-xs text-muted-foreground pl-5">
                          {exercise.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pl-5 mt-1">
                        {exercise.sets && (
                          <Badge variant="outline" className="text-xs">
                            {t("{count} series", { count: String(exercise.sets) })}
                          </Badge>
                        )}
                        {exercise.repetitions && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.repetitions} reps
                          </Badge>
                        )}
                        {exercise.restSeconds && (
                          <Badge variant="outline" className="text-xs">
                            {t("{seconds}s descanso", { seconds: String(exercise.restSeconds) })}
                          </Badge>
                        )}
                        {exercise.durationSecs && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.durationSecs}s
                          </Badge>
                        )}
                        {exercise.weightKg && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.weightKg} kg
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("Esta rutina no tiene ejercicios configurados aún.")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4 text-center">
            <p role="alert" className="text-sm text-muted-foreground">{t("No se pudo cargar la rutina.")}</p>
            <Button type="button" variant="outline" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>{t("Reintentar")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
