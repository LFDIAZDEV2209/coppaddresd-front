"use client";

// Componentes compartidos de la tabla de contenido semanal del programa.
// Extraídos de program-content-page.tsx para reutilizarse en el panel del
// paciente (EnrollmentContentTab) y en la página de contenido original.

import { useState, useCallback } from "react";
import { CalendarDays, Check, Loader2, Salad, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { ProgramContentWeek, SetWeekContentInput } from "../types";
import type {
  ExerciseRoutineListItem,
  NutritionPlanListItem,
} from "@/features/wellness/types";

// --- Tabla de semanas ---

export function ContentTable({
  content,
  canEdit,
  onSaveWeek,
  enrollmentId,
  availableRoutines,
  availablePlans,
  loadingCatalog,
}: {
  content: { weeks: ProgramContentWeek[]; totalWeeks: number };
  canEdit: boolean;
  onSaveWeek: (weekNumber: number, input: SetWeekContentInput) => Promise<void>;
  enrollmentId: string;
  availableRoutines: ExerciseRoutineListItem[];
  availablePlans: NutritionPlanListItem[];
  loadingCatalog: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Semanas del programa ({content.totalWeeks} semanas)
          </h3>
          <p className="text-xs text-muted-foreground">
            Asigna el plan nutricional y la rutina de ejercicio para cada semana
            del paciente.
          </p>
        </div>

        {loadingCatalog && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Cargando catálogo del paciente...</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Sem.</TableHead>
              <TableHead>Fechas de la semana</TableHead>
              <TableHead className="min-w-[240px]">Plan nutricional</TableHead>
              <TableHead className="min-w-[260px]">
                Rutina de ejercicio
              </TableHead>
              {canEdit && (
                <TableHead className="text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {content.weeks.map((week) => (
              <WeekRow
                key={week.weekNumber}
                week={week}
                canEdit={canEdit}
                onSave={onSaveWeek}
                enrollmentId={enrollmentId}
                availableRoutines={availableRoutines}
                availablePlans={availablePlans}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {content.weeks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Esta inscripción no tiene semanas configuradas.
        </p>
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
}: {
  week: ProgramContentWeek;
  canEdit: boolean;
  onSave: (weekNumber: number, input: SetWeekContentInput) => Promise<void>;
  enrollmentId: string;
  availableRoutines: ExerciseRoutineListItem[];
  availablePlans: NutritionPlanListItem[];
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false);

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
          Sem. {week.weekNumber}
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
    </TableRow>
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