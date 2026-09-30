"use client";

// Componentes compartidos de la tabla de contenido semanal del programa.
// Extraídos de program-content-page.tsx para reutilizarse en el panel del
// paciente (EnrollmentContentTab) y en la página de contenido original.

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  Salad,
  Dumbbell,
  Layers,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/layout/section-header";
import { PagedListFooter } from "./paged-list-footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeekTasksDialog } from "./program-week-tasks-dialog";
import { PodcastPickerDialog } from "./podcast-picker-dialog";
import { useT } from "@/providers/i18n-provider";
import {
  fetchEnrollmentWeek,
  replaceEnrollmentWeekTasks,
} from "../services/program-content-service";
import type { ProgramContentWeek, SetWeekContentInput } from "../types";
import type {
  ExerciseRoutineListItem,
  NutritionPlanListItem,
} from "@/features/wellness/types";

// --- Podcast por semana (columna "Podcast del día", REQ-PCA-05) ---

/** Podcast programado de una semana (desde el detalle de la semana). */
interface WeekPodcastInfo {
  /** MediaId del podcast asignado (null = seguir secuencia por defecto). */
  mediaId: string | null;
  /** Título resuelto por el backend (contentName). */
  title: string | null;
  /** Días ISO de la semana con tarea de podcast. */
  weekdays: number[];
}

/**
 * Resuelve el podcast de cada semana visible a partir del detalle de la
 * semana (GET /enrollments/{id}/week/{n}): filas de tarea `podcast` con su
 * contentRefId/contentName. Cachea por inscripción+semana para no repetir
 * peticiones al paginar, con recarga puntual tras un cambio.
 */
function useWeekPodcasts(
  enrollmentId: string,
  weekNumbers: number[],
  refreshKey: number,
) {
  const [podcastByWeek, setPodcastByWeek] = useState<
    Record<number, WeekPodcastInfo | null>
  >({});
  const [loadingWeeks, setLoadingWeeks] = useState<Record<number, boolean>>({});
  const cacheRef = useRef<Set<string>>(new Set());

  const weeksKey = weekNumbers.join(",");

  const loadWeek = useCallback(
    async (weekNumber: number, enrollment: string) => {
      const detail = await fetchEnrollmentWeek(enrollment, weekNumber);
      const weekdays: number[] = [];
      let mediaId: string | null = null;
      let title: string | null = null;
      for (const day of detail.days) {
        const podcastTask = day.tasks.find(
          (task) => task.taskCode === "podcast",
        );
        if (!podcastTask) continue;
        weekdays.push(day.weekday);
        if (!mediaId && podcastTask.contentRefId) {
          mediaId = podcastTask.contentRefId;
          title = podcastTask.contentName ?? null;
        }
      }
      // Sin filas de podcast → null (la semana no programa podcast).
      return weekdays.length > 0 ? { mediaId, title, weekdays } : null;
    },
    [],
  );

  useEffect(() => {
    const pending = weekNumbers.filter((week) => {
      const key = `${enrollmentId}:${week}:${refreshKey}`;
      return !cacheRef.current.has(key);
    });
    if (pending.length === 0) return;
    let cancelled = false;
    void (async () => {
      setLoadingWeeks((prev) => {
        const next = { ...prev };
        pending.forEach((week) => {
          next[week] = true;
        });
        return next;
      });
      const results = await Promise.allSettled(
        pending.map((week) => loadWeek(week, enrollmentId)),
      );
      if (cancelled) return;
      pending.forEach((week) => {
        cacheRef.current.add(`${enrollmentId}:${week}:${refreshKey}`);
      });
      setPodcastByWeek((prev) => {
        const next = { ...prev };
        pending.forEach((week, index) => {
          const outcome = results[index];
          next[week] = outcome.status === "fulfilled" ? outcome.value : null;
        });
        return next;
      });
      setLoadingWeeks((prev) => {
        const next = { ...prev };
        pending.forEach((week) => {
          delete next[week];
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- weekNumbers se consume vía weeksKey
  }, [enrollmentId, weeksKey, refreshKey, loadWeek]);

  /** Refresca una semana puntual (tras cambiar su podcast). */
  const reloadWeek = useCallback(
    async (weekNumber: number) => {
      setLoadingWeeks((prev) => ({ ...prev, [weekNumber]: true }));
      try {
        const info = await loadWeek(weekNumber, enrollmentId);
        setPodcastByWeek((prev) => ({ ...prev, [weekNumber]: info }));
      } catch {
        setPodcastByWeek((prev) => ({ ...prev, [weekNumber]: null }));
      } finally {
        setLoadingWeeks((prev) => {
          const next = { ...prev };
          delete next[weekNumber];
          return next;
        });
      }
    },
    [enrollmentId, loadWeek],
  );

  return { podcastByWeek, loadingWeeks, reloadWeek };
}

// --- Tabla de semanas ---

export function ContentTable({
  content,
  canEdit,
  onSaveWeek,
  enrollmentId,
  availableRoutines,
  availablePlans,
  loadingCatalog,
  podcastRefreshKey = 0,
  onPodcastUpdated,
}: {
  content: { weeks: ProgramContentWeek[]; totalWeeks: number };
  canEdit: boolean;
  onSaveWeek: (weekNumber: number, input: SetWeekContentInput) => Promise<void>;
  enrollmentId: string;
  availableRoutines: ExerciseRoutineListItem[];
  availablePlans: NutritionPlanListItem[];
  loadingCatalog: boolean;
  /** Bump para recargar el podcast de todas las semanas (tras asignación masiva). */
  podcastRefreshKey?: number;
  /** Notificación externa tras cambiar el podcast de una semana (toast). */
  onPodcastUpdated?: (weekNumber: number, mediaId: string | null) => void;
}) {
  const t = useT();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(content.weeks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedWeeks = useMemo(
    () =>
      content.weeks.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [content.weeks, currentPage, pageSize],
  );

  // Podcast por semana (columna "Podcast del día") para las semanas de la
  // página visible: se resuelve con el detalle de cada semana y se cachea.
  const { podcastByWeek, loadingWeeks, reloadWeek } = useWeekPodcasts(
    enrollmentId,
    pagedWeeks.map((w) => w.weekNumber),
    podcastRefreshKey,
  );

  /**
   * Cambia el podcast de una semana completa: reemplaza el mediaId de las
   * filas de tarea `podcast` (PUT /enrollments/{id}/week/{n}/tasks) y
   * refresca la columna con el detalle actualizado.
   */
  const handleChangeWeekPodcast = useCallback(
    async (weekNumber: number, mediaId: string | null) => {
      const detail = await fetchEnrollmentWeek(enrollmentId, weekNumber);
      const payload = detail.days.flatMap((day) =>
        day.tasks.map((task, idx) => ({
          weekday: day.weekday,
          taskCode: task.taskCode,
          points: task.scheduledPoints,
          sortOrder: idx + 1,
          routineId:
            task.taskCode === "ejercicio"
              ? (task.routineId ?? task.contentRefId ?? null)
              : null,
          mediaId: task.taskCode === "podcast" ? mediaId : null,
        })),
      );
      await replaceEnrollmentWeekTasks(enrollmentId, weekNumber, payload);
      onPodcastUpdated?.(weekNumber, mediaId);
      await reloadWeek(weekNumber);
    },
    [enrollmentId, onPodcastUpdated, reloadWeek],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp page, intentional
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <SectionHeader
          title={`Días del programa (${content.totalWeeks} días)`}
          description="Asigna el plan nutricional y la rutina de ejercicio para cada día del paciente."
          icon={Layers}
          variant="secondary"
          className="min-w-0 flex-1 border-none bg-transparent px-0 py-0"
        />
        {loadingCatalog && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Cargando catálogo...</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0B2B4A] hover:bg-[#0B2B4A]">
              <TableHead className="w-16 text-white">Día</TableHead>
              <TableHead className="text-white">Fecha</TableHead>
              <TableHead className="min-w-[240px] text-white">
                Plan nutricional
              </TableHead>
              <TableHead className="min-w-[260px] text-white">
                Rutina de ejercicio
              </TableHead>
              <TableHead className="min-w-[200px] text-white">
                {t("Podcast del día")}
              </TableHead>
              {canEdit && (
                <TableHead className="text-right text-white">
                  Acciones
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedWeeks.map((week) => (
              <WeekRow
                key={week.weekNumber}
                week={week}
                canEdit={canEdit}
                onSave={onSaveWeek}
                enrollmentId={enrollmentId}
                availableRoutines={availableRoutines}
                availablePlans={availablePlans}
                podcast={podcastByWeek[week.weekNumber]}
                podcastLoading={Boolean(loadingWeeks[week.weekNumber])}
                onPodcastChange={canEdit ? handleChangeWeekPodcast : undefined}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {content.weeks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Esta inscripción no tiene días configurados.
        </p>
      ) : (
        <PagedListFooter
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </section>
  );
}

// --- Fila de semana con inline edit (con Select desplegable) ---

export function WeekRow({
  week,
  canEdit,
  onSave,
  enrollmentId,
  availableRoutines,
  availablePlans,
  podcast,
  podcastLoading = false,
  onPodcastChange,
}: {
  week: ProgramContentWeek;
  canEdit: boolean;
  onSave: (weekNumber: number, input: SetWeekContentInput) => Promise<void>;
  enrollmentId: string;
  availableRoutines: ExerciseRoutineListItem[];
  availablePlans: NutritionPlanListItem[];
  /** Podcast resuelto de la semana (null = la semana no programa podcast). */
  podcast?: WeekPodcastInfo | null;
  /** Carga del detalle de la semana para resolver el podcast. */
  podcastLoading?: boolean;
  /** Cambiar el podcast de la semana (solo con Program.Edit). */
  onPodcastChange?: (
    weekNumber: number,
    mediaId: string | null,
  ) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false);
  const [podcastPickerOpen, setPodcastPickerOpen] = useState(false);
  const [changingPodcast, setChangingPodcast] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);

  const [nutritionPlanId, setNutritionPlanId] = useState<string | null>(
    week.nutritionPlan?.id ?? null,
  );
  const [exerciseRoutineId, setExerciseRoutineId] = useState<string | null>(
    week.exerciseRoutine?.id ?? null,
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(week.weekNumber, {
        nutritionPlanId,
        exerciseRoutineId,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [week.weekNumber, nutritionPlanId, exerciseRoutineId, onSave]);

  const startEdit = useCallback(() => {
    setNutritionPlanId(week.nutritionPlan?.id ?? null);
    setExerciseRoutineId(week.exerciseRoutine?.id ?? null);
    setEditing(true);
  }, [week]);

  /** Aplica el podcast elegido a todas las filas de la semana. */
  const handlePodcastSelect = useCallback(
    async (mediaId: string | null) => {
      if (!onPodcastChange) return;
      setChangingPodcast(true);
      setPodcastError(null);
      try {
        await onPodcastChange(week.weekNumber, mediaId);
        setPodcastPickerOpen(false);
      } catch (err) {
        setPodcastError(
          err instanceof Error
            ? err.message
            : t("No se pudo cambiar el podcast de la semana."),
        );
      } finally {
        setChangingPodcast(false);
      }
    },
    [onPodcastChange, week.weekNumber, t],
  );

  // Asegurar que el plan nutricional asignado esté en las opciones del desplegable
  const allPlans = [...availablePlans];
  if (
    week.nutritionPlan &&
    !allPlans.some((p) => p.id === week.nutritionPlan!.id)
  ) {
    allPlans.unshift({
      id: week.nutritionPlan.id,
      name: week.nutritionPlan.name,
      durationDays: null,
    } as unknown as NutritionPlanListItem);
  }

  // Asegurar que la rutina asignada esté en las opciones del desplegable
  const allRoutines = [...availableRoutines];
  if (
    week.exerciseRoutine &&
    !allRoutines.some((r) => r.id === week.exerciseRoutine!.id)
  ) {
    allRoutines.unshift({
      id: week.exerciseRoutine.id,
      name: week.exerciseRoutine.name,
      category: "Asignada",
      difficulty: "",
    } as unknown as ExerciseRoutineListItem);
  }

  const selectedPlanName = nutritionPlanId
    ? (allPlans.find((p) => p.id === nutritionPlanId)?.name ??
      (nutritionPlanId === week.nutritionPlan?.id
        ? week.nutritionPlan?.name
        : null) ??
      undefined)
    : undefined;

  const selectedRoutineName = exerciseRoutineId
    ? (allRoutines.find((r) => r.id === exerciseRoutineId)?.name ??
      (exerciseRoutineId === week.exerciseRoutine?.id
        ? week.exerciseRoutine?.name
        : null) ??
      undefined)
    : undefined;

  if (editing) {
    return (
      <TableRow className="bg-primary/5">
        <TableCell className="font-bold text-sm tabular-nums">
          Día {week.weekNumber}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {week.weekStartDateLocal} — {week.weekEndDateLocal}
        </TableCell>

        {/* Select Plan Nutricional */}
        <TableCell>
          <Select
            value={nutritionPlanId ?? "none"}
            onValueChange={(val) =>
              setNutritionPlanId(val === "none" ? null : val)
            }
          >
            <SelectTrigger className="w-full text-xs h-8 bg-card">
              <SelectValue placeholder="Seleccionar plan...">
                {selectedPlanName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="none"
                label="Sin asignar"
                className="text-xs text-muted-foreground italic"
              >
                Sin asignar (Ninguno)
              </SelectItem>
              {allPlans.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  label={p.name}
                  className="text-xs"
                >
                  <span className="font-semibold">{p.name}</span>
                  {p.durationDays && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ({p.durationDays}d)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Select Rutina de Ejercicio */}
        <TableCell>
          <Select
            value={exerciseRoutineId ?? "none"}
            onValueChange={(val) =>
              setExerciseRoutineId(val === "none" ? null : val)
            }
          >
            <SelectTrigger className="w-full text-xs h-8 bg-card">
              <SelectValue placeholder="Seleccionar rutina...">
                {selectedRoutineName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="none"
                label="Sin asignar"
                className="text-xs text-muted-foreground italic"
              >
                Sin asignar (Ninguna)
              </SelectItem>
              {allRoutines.map((r) => (
                <SelectItem
                  key={r.id}
                  value={r.id}
                  label={r.name}
                  className="text-xs"
                >
                  <span className="font-semibold">{r.name}</span>
                  {r.category && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      · {r.category} {r.difficulty ? `(${r.difficulty})` : ""}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Podcast del día (solo lectura en edición; el cambio va por el picker) */}
        <TableCell>
          <WeekPodcastCell
            podcast={podcast}
            loading={podcastLoading}
            error={podcastError}
          />
        </TableCell>

        {/* Acciones de guardado */}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="gap-1"
            >
              {saving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
              Guardar
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="hover:bg-muted/40">
      <TableCell className="font-semibold text-sm tabular-nums">
        {week.weekNumber}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {week.weekStartDateLocal} — {week.weekEndDateLocal}
      </TableCell>
      <TableCell>
        {week.nutritionPlan ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Salad className="mr-1 size-3" />
            {week.nutritionPlan.name}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-muted-foreground border-dashed"
          >
            Sin asignar
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {week.exerciseRoutine ? (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Dumbbell className="mr-1 size-3" />
            {week.exerciseRoutine.name}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-muted-foreground border-dashed"
          >
            Sin asignar
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <WeekPodcastCell
          podcast={podcast}
          loading={podcastLoading}
          error={podcastError}
          canEdit={canEdit && Boolean(onPodcastChange) && !changingPodcast}
          onChangePodcast={
            canEdit && onPodcastChange
              ? () => setPodcastPickerOpen(true)
              : undefined
          }
        />
      </TableCell>
      {canEdit && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTasksDialogOpen(true)}
              className="gap-1 text-xs"
            >
              <CalendarDays className="size-3.5" />
              Ver tareas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={startEdit}
              className="text-xs"
            >
              Editar
            </Button>
          </div>
        </TableCell>
      )}

      <WeekTasksDialog
        open={tasksDialogOpen}
        onOpenChange={setTasksDialogOpen}
        week={week}
        enrollmentId={enrollmentId}
      />

      {/* Selector directo del podcast de la semana (REQ-PCA-05) */}
      {podcastPickerOpen && (
        <PodcastPickerDialog
          open
          onOpenChange={setPodcastPickerOpen}
          currentMediaId={podcast?.mediaId ?? null}
          dayLabel={t("Semana {week}", { week: String(week.weekNumber) })}
          onSelect={(mediaId) => {
            void handlePodcastSelect(mediaId);
          }}
        />
      )}
    </TableRow>
  );
}

// --- Celda de podcast por semana ---

/**
 * Celda "Podcast del día": badge con el título del medio programado, estado
 * de carga (skeleton), empty (sin podcast) y acción directa de cambio con
 * permiso Program.Edit.
 */
function WeekPodcastCell({
  podcast,
  loading,
  error,
  canEdit = false,
  onChangePodcast,
}: {
  podcast?: WeekPodcastInfo | null;
  loading?: boolean;
  error?: string | null;
  canEdit?: boolean;
  onChangePodcast?: () => void;
}) {
  const t = useT();

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  if (error) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
        <Loader2 className="size-3" />
        {t("No disponible")}
      </span>
    );
  }

  // La semana no tiene filas de podcast programadas.
  if (!podcast || podcast.weekdays.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge
          variant="outline"
          className="text-muted-foreground border-dashed"
        >
          {t("Sin podcast")}
        </Badge>
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {podcast.mediaId ? (
        <Badge className="bg-violet-100 text-violet-800 border-violet-200">
          <Mic className="mr-1 size-3" />
          <span className="max-w-[180px] truncate" title={podcast.title ?? ""}>
            {podcast.title ?? podcast.mediaId.substring(0, 8)}
          </span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="text-muted-foreground"
          title={t("La semana sigue la secuencia por defecto del programa")}
        >
          <Mic className="mr-1 size-3" />
          {t("Secuencia por defecto")}
        </Badge>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">
          {podcast.weekdays.length}{" "}
          {podcast.weekdays.length === 1 ? t("día") : t("días")}
        </span>
        {canEdit && onChangePodcast && (
          <button
            type="button"
            onClick={onChangePodcast}
            className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("Cambiar")}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Skeleton ---

export function ContentSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

// --- Error state ---

export function ContentErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar el contenido
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
