"use client";

import { useState, useEffect } from "react";
import { Apple } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NutritionPlan, MealType } from "../types";
import { PLAN_STATUS_LABELS } from "../services/nutrition-plans-service";

interface NutritionPlanDetailDialogProps {
  planId: string | null;
  onClose: () => void;
  getPlan: (id: string) => Promise<NutritionPlan | null>;
}

const MEAL_LABELS: Record<MealType, string> = {
  Desayuno: "Desayuno",
  Almuerzo: "Almuerzo",
  Cena: "Cena",
  Snack: "Snack",
};

const MEAL_COLORS: Record<MealType, string> = {
  Desayuno: "bg-yellow-50 border-yellow-200",
  Almuerzo: "bg-green-50 border-green-200",
  Cena: "bg-blue-50 border-blue-200",
  Snack: "bg-purple-50 border-purple-200",
};

export function NutritionPlanDetailDialog({
  planId,
  onClose,
  getPlan,
}: NutritionPlanDetailDialogProps) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPlan(planId).then((data) => {
      if (!cancelled) {
        setPlan(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [planId, getPlan]);

  if (!planId) return null;

  // Group days by dayNumber
  const groupedDays: Record<number, Array<{ id: string; dayNumber: number; mealType: import("../types").MealType; description: string | null; foods: string | null; calories: number | null; notes: string | null; sortOrder: number; mediaId: string | null }>> = {};
  if (plan?.days) {
    for (const day of plan.days) {
      if (!groupedDays[day.dayNumber]) groupedDays[day.dayNumber] = [];
      groupedDays[day.dayNumber].push(day);
    }
  }

  const dayNumbers = Object.keys(groupedDays)
    .map(Number)
    .sort((a, b) => a - b);

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
    <Dialog open={Boolean(planId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl min-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="size-5" />
            {loading ? "Cargando..." : plan?.name ?? "Plan"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <DetailSkeleton />
        ) : plan ? (
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 max-h-[60vh]">
            {/* Info básica */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">Tipo</span>
                <p className="text-sm font-medium">
                  {plan.isTemplate ? "Template" : "Personalizado"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Estado</span>
                <p>
                  <Badge className={statusColor(plan.status)}>
                    {PLAN_STATUS_LABELS[plan.status]}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Duración</span>
                <p className="text-sm font-medium">{plan.durationDays} días</p>
              </div>
              {plan.dailyCalorieTarget && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Calorías diarias
                  </span>
                  <p className="text-sm font-medium">
                    {plan.dailyCalorieTarget} kcal
                  </p>
                </div>
              )}
              {plan.targetCondition && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Condición objetivo
                  </span>
                  <p className="text-sm font-medium">{plan.targetCondition}</p>
                </div>
              )}
              {plan.description && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Descripción
                  </span>
                  <p className="text-sm">{plan.description}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Días */}
            {dayNumbers.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Plan alimentario ({dayNumbers.length} días)
                </span>
                <Tabs defaultValue={String(dayNumbers[0])}>
                  <TabsList className="h-auto flex-wrap gap-1 bg-muted p-1">
                    {dayNumbers.map((d) => (
                      <TabsTrigger key={d} value={String(d)} className="text-xs">
                        Día {d}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {dayNumbers.map((d) => (
                    <TabsContent key={d} value={String(d)}>
                      <div className="flex flex-col gap-2">
                        {(groupedDays[d] ?? [])
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((meal) => (
                            <div
                              key={meal.id}
                              className={`rounded-lg border p-3 ${MEAL_COLORS[meal.mealType]}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase">
                                  {MEAL_LABELS[meal.mealType]}
                                </span>
                                {meal.calories && (
                                  <Badge variant="outline" className="text-xs">
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
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Este plan no tiene días configurados aún.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No se pudo cargar el plan.
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
      <Skeleton className="h-8 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
