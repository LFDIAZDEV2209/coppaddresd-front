"use client";

import { useState, useEffect } from "react";
import { Dumbbell, Apple, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getExerciseRoutine } from "../services/exercise-routines-service";
import { getNutritionPlan } from "../services/nutrition-plans-service";
import {
  DIFFICULTY_COLORS,
  CATEGORY_COLORS,
} from "../services/exercise-routines-service";
import { PLAN_STATUS_LABELS } from "../services/nutrition-plans-service";
import type {
  UnifiedAssignment,
  ExerciseRoutine,
  NutritionPlan,
  NutritionPlanDay,
} from "../types";

const MEAL_LABELS: Record<string, string> = {
  Desayuno: "Desayuno",
  Almuerzo: "Almuerzo",
  Cena: "Cena",
  Snack: "Snack",
};
const MEAL_ICONS: Record<string, string> = {
  Desayuno: "🌅",
  Almuerzo: "☀️",
  Cena: "🌙",
  Snack: "🍎",
};
const MEAL_COLORS: Record<string, string> = {
  Desayuno: "border-l-yellow-400 bg-yellow-50/50",
  Almuerzo: "border-l-green-400 bg-green-50/50",
  Cena: "border-l-blue-400 bg-blue-50/50",
  Snack: "border-l-purple-400 bg-purple-50/50",
};

interface Props {
  assignment: UnifiedAssignment | null;
  onClose: () => void;
}

export function AssignmentDetailDialog({ assignment, onClose }: Props) {
  const [routine, setRoutine] = useState<ExerciseRoutine | null>(null);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(Boolean(assignment));

  useEffect(() => {
    if (!assignment) return;
    let cancelled = false;
    const load = async () => {
      try {
        if (assignment.type === "routine") {
          const data = await getExerciseRoutine(assignment.itemId);
          if (!cancelled) setRoutine(data);
        } else {
          const data = await getNutritionPlan(assignment.itemId);
          if (!cancelled) setPlan(data);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [assignment]);

  if (!assignment) return null;

  return (
    <Dialog
      open={Boolean(assignment)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {assignment.type === "routine" ? (
              <Dumbbell className="size-5 text-blue-600" />
            ) : (
              <Apple className="size-5 text-green-600" />
            )}
            {assignment.itemName ??
              (assignment.type === "routine" ? "Rutina" : "Plan")}
          </DialogTitle>
          <DialogDescription>
            Asignada a {assignment.patientName ?? "—"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <DetailSkeleton />
          ) : assignment.type === "routine" ? (
            <RoutineDetail assignment={assignment} routine={routine} />
          ) : (
            <PlanDetail assignment={assignment} plan={plan} />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

function statusColor(s: string) {
  if (s === "Active") return "bg-green-100 text-green-800";
  if (s === "Draft") return "bg-yellow-100 text-yellow-800";
  if (s === "Completed") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

function RoutineDetail({
  assignment,
  routine,
}: {
  assignment: UnifiedAssignment;
  routine: ExerciseRoutine | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <InfoItem label="Paciente" value={assignment.patientName} />
        <InfoItem
          label="Estado"
          value={
            assignment.status === "Active"
              ? "Activa"
              : assignment.status === "Paused"
                ? "Pausada"
                : "Completada"
          }
        />
        {assignment.frequency && (
          <InfoItem
            label="Frecuencia"
            value={
              assignment.frequency === "Diaria"
                ? "Diaria"
                : assignment.frequency === "TresVecesSemana"
                  ? "3x/semana"
                  : "Personalizada"
            }
          />
        )}
        <InfoItem
          label="Inicio"
          value={new Date(assignment.startDate).toLocaleDateString("es-CO")}
        />
        {assignment.endDate && (
          <InfoItem
            label="Fin"
            value={new Date(assignment.endDate).toLocaleDateString("es-CO")}
          />
        )}
      </div>
      {assignment.notes && (
        <>
          <Separator />
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Notas
            </span>
            <p className="text-sm mt-1">{assignment.notes}</p>
          </div>
        </>
      )}
      <Separator />
      {routine ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColor(routine.status)}>
              {PLAN_STATUS_LABELS[routine.status] ?? routine.status}
            </Badge>
            <Badge className={DIFFICULTY_COLORS[routine.difficulty] ?? ""}>
              {routine.difficulty}
            </Badge>
            <Badge className={CATEGORY_COLORS[routine.category] ?? ""}>
              {routine.category}
            </Badge>
            {routine.estimatedMinutes && (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" />
                {routine.estimatedMinutes} min
              </Badge>
            )}
          </div>
          {routine.description && (
            <p className="text-sm text-muted-foreground">
              {routine.description}
            </p>
          )}
          {routine.exercises.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Ejercicios ({routine.exercises.length})
              </span>
              {routine.exercises
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((e, i) => (
                  <div
                    key={e.id}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="text-sm font-medium">{e.name}</span>
                    </div>
                    {e.description && (
                      <p className="text-xs text-muted-foreground pl-5">
                        {e.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pl-5 mt-1">
                      {e.sets && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {e.sets} series
                        </Badge>
                      )}
                      {e.repetitions && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {e.repetitions} reps
                        </Badge>
                      )}
                      {e.restSeconds && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {e.restSeconds}s descanso
                        </Badge>
                      )}
                      {e.durationSecs && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {e.durationSecs}s
                        </Badge>
                      )}
                      {e.weightKg && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {e.weightKg} kg
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No se pudo cargar el detalle de la rutina
        </div>
      )}
    </div>
  );
}

function PlanDetail({
  assignment,
  plan,
}: {
  assignment: UnifiedAssignment;
  plan: NutritionPlan | null;
}) {
  const [activeDay, setActiveDay] = useState(1);
  const groupedDays: Record<number, NutritionPlanDay[]> = {};
  if (plan?.days)
    for (const day of plan.days) {
      if (!groupedDays[day.dayNumber]) groupedDays[day.dayNumber] = [];
      groupedDays[day.dayNumber].push(day);
    }
  const dayNumbers = Object.keys(groupedDays)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <InfoItem label="Paciente" value={assignment.patientName} />
        <InfoItem
          label="Estado"
          value={
            assignment.status === "Active"
              ? "Activa"
              : assignment.status === "Paused"
                ? "Pausada"
                : "Completada"
          }
        />
        <InfoItem
          label="Inicio"
          value={new Date(assignment.startDate).toLocaleDateString("es-CO")}
        />
        {assignment.endDate && (
          <InfoItem
            label="Fin"
            value={new Date(assignment.endDate).toLocaleDateString("es-CO")}
          />
        )}
      </div>
      {assignment.notes && (
        <>
          <Separator />
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Notas
            </span>
            <p className="text-sm mt-1">{assignment.notes}</p>
          </div>
        </>
      )}
      <Separator />
      {plan ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColor(plan.status)}>
              {PLAN_STATUS_LABELS[plan.status] ?? plan.status}
            </Badge>
            <Badge variant="outline">{plan.durationDays} días</Badge>
            {plan.dailyCalorieTarget && (
              <Badge variant="outline" className="gap-1">
                <Flame className="size-3" />
                {plan.dailyCalorieTarget} kcal/día
              </Badge>
            )}
            {plan.targetCondition && (
              <Badge variant="outline">{plan.targetCondition}</Badge>
            )}
          </div>
          {plan.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}
          {dayNumbers.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Plan alimentario ({dayNumbers.length} días)
              </span>
              <div className="flex flex-wrap gap-1">
                {dayNumbers.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActiveDay(d)}
                    className={
                      activeDay === d
                        ? "px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground"
                        : "px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground"
                    }
                  >
                    Día {d}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {(groupedDays[activeDay] ?? [])
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((meal) => (
                    <div
                      key={meal.id}
                      className={
                        "rounded-lg border-l-4 p-3 " +
                        (MEAL_COLORS[meal.mealType] ??
                          "border-l-gray-400 bg-gray-50/50")
                      }
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">
                          {MEAL_ICONS[meal.mealType] ?? "🍽️"}
                        </span>
                        <span className="text-xs font-bold uppercase">
                          {MEAL_LABELS[meal.mealType] ?? meal.mealType}
                        </span>
                        {meal.calories && (
                          <Badge
                            variant="outline"
                            className="text-xs py-0 h-5 ml-auto"
                          >
                            {meal.calories} kcal
                          </Badge>
                        )}
                      </div>
                      {meal.description && (
                        <p className="text-sm font-medium">
                          {meal.description}
                        </p>
                      )}
                      {meal.foods && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {meal.foods}
                        </p>
                      )}
                      {meal.notes && (
                        <p className="text-xs italic text-muted-foreground mt-1">
                          {meal.notes}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No se pudo cargar el detalle del plan
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
