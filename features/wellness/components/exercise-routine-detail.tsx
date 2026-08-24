"use client";

import { useState, useEffect } from "react";
import { Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [routine, setRoutine] = useState<ExerciseRoutine | null>(null);
  const [loading, setLoading] = useState(Boolean(routineId));

  useEffect(() => {
    if (!routineId) return;

    let cancelled = false;

    getRoutine(routineId).then((data) => {
      if (!cancelled) {
        setRoutine(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [routineId, getRoutine]);

  if (!routineId) return null;

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
      <DialogContent className="max-h-[85vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="size-5" />
            {loading ? "Cargando..." : (routine?.name ?? "Rutina")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <DetailSkeleton />
        ) : routine ? (
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 max-h-[60vh]">
            {/* Info básica */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">Categoría</span>
                <p>
                  <Badge className={CATEGORY_COLORS[routine.category] ?? ""}>
                    {routine.category}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Dificultad
                </span>
                <p>
                  <Badge
                    className={DIFFICULTY_COLORS[routine.difficulty] ?? ""}
                  >
                    {routine.difficulty}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Estado</span>
                <p>
                  <Badge className={statusColor(routine.status)}>
                    {PLAN_STATUS_LABELS[routine.status]}
                  </Badge>
                </p>
              </div>
              {routine.estimatedMinutes && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Duración estimada
                  </span>
                  <p className="text-sm font-medium">
                    {routine.estimatedMinutes} minutos
                  </p>
                </div>
              )}
              {routine.description && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Descripción
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
                  Ejercicios ({routine.exercises.length})
                </span>
                {routine.exercises
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-medium">
                          {exercise.name}
                        </span>
                      </div>
                      {exercise.description && (
                        <p className="text-xs text-muted-foreground pl-5">
                          {exercise.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pl-5 mt-1">
                        {exercise.sets && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.sets} series
                          </Badge>
                        )}
                        {exercise.repetitions && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.repetitions} reps
                          </Badge>
                        )}
                        {exercise.restSeconds && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.restSeconds}s descanso
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
                Esta rutina no tiene ejercicios configurados aún.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No se pudo cargar la rutina.
          </p>
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
