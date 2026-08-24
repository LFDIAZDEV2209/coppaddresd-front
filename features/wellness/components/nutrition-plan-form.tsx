"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  NutritionPlanListItem,
  NutritionPlanDayInput,
  MealType,
  NutritionPlanStatus,
} from "../types";
import {
  MEAL_TYPES,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  getNutritionPlan,
} from "../services/nutrition-plans-service";

interface NutritionPlanFormDialogProps {
  open: boolean;
  plan?: NutritionPlanListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input:
      | {
          name: string;
          description: string | null;
          targetCondition: string | null;
          durationDays: number;
          dailyCalorieTarget: number | null;
          isTemplate: boolean;
          patientId: null;
          sourcePlanId: null;
          status: NutritionPlanStatus;
          days: NutritionPlanDayInput[] | null;
        }
      | {
          name: string;
          description: string | null;
          targetCondition: string | null;
          durationDays: number;
          dailyCalorieTarget: number | null;
          status: NutritionPlanStatus;
          days: NutritionPlanDayInput[] | null;
        },
    id?: string,
  ) => Promise<void>;
}

interface DayMealData {
  description: string;
  foods: string;
  calories: string;
  notes: string;
}

const MEAL_LABELS: Record<MealType, string> = {
  Desayuno: "Desayuno",
  Almuerzo: "Almuerzo",
  Cena: "Cena",
  Snack: "Snack",
};

export function NutritionPlanFormDialog({
  open,
  plan,
  saving,
  onOpenChange,
  onSubmit,
}: NutritionPlanFormDialogProps) {
  const isEditing = Boolean(plan);

  // Form state
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [targetCondition, setTargetCondition] = useState(
    plan?.targetCondition ?? "",
  );
  const [durationDays, setDurationDays] = useState(
    plan?.durationDays ? String(plan.durationDays) : "7",
  );
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(
    plan?.dailyCalorieTarget?.toString() ?? "",
  );
  const [isTemplate, setIsTemplate] = useState(plan?.isTemplate ?? true);
  const [status, setStatus] = useState<NutritionPlanStatus>(
    plan?.status ?? "Draft",
  );

  // Days state: key = "dayNumber-mealType"
  const [days, setDays] = useState<Record<string, DayMealData>>({});
  const [activeDay, setActiveDay] = useState("1");
  const [loadingDetail, setLoadingDetail] = useState(Boolean(plan));

  // Cargar el detalle completo al editar (el item del listado no trae días)
  useEffect(() => {
    if (!plan) return;

    let cancelled = false;

    getNutritionPlan(plan.id)
      .then((full) => {
        if (cancelled) return;
        if (full?.days && full.days.length > 0) {
          const newDays: Record<string, DayMealData> = {};
          // Estructura base para todos los días del plan
          for (let d = 1; d <= full.durationDays; d++) {
            for (const meal of MEAL_TYPES) {
              newDays[`${d}-${meal}`] = {
                description: "",
                foods: "",
                calories: "",
                notes: "",
              };
            }
          }
          // Rellenar con los datos existentes
          for (const day of full.days) {
            newDays[`${day.dayNumber}-${day.mealType}`] = {
              description: day.description ?? "",
              foods: day.foods ?? "",
              calories: day.calories?.toString() ?? "",
              notes: day.notes ?? "",
            };
          }
          setDays(newDays);
          const firstDay = full.days
            .map((d) => d.dayNumber)
            .sort((a, b) => a - b)[0];
          if (firstDay) setActiveDay(String(firstDay));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan]);

  // Generate days when duration changes
  const handleDurationChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 365) {
      setDurationDays(value);
      return;
    }
    setDurationDays(value);

    // Generate empty structure for new days
    const newDays: Record<string, DayMealData> = {};
    for (let d = 1; d <= num; d++) {
      for (const meal of MEAL_TYPES) {
        const key = `${d}-${meal}`;
        newDays[key] = days[key] ?? {
          description: "",
          foods: "",
          calories: "",
          notes: "",
        };
      }
    }
    setDays(newDays);
  };

  const updateDayMeal = (
    dayNumber: number,
    meal: MealType,
    field: keyof DayMealData,
    value: string,
  ) => {
    const key = `${dayNumber}-${meal}`;
    setDays((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    const numDays = parseInt(durationDays, 10);
    if (!name.trim() || isNaN(numDays) || numDays < 1) return;

    // Build days array from the record
    const daysArray: NutritionPlanDayInput[] = [];
    for (let d = 1; d <= numDays; d++) {
      MEAL_TYPES.forEach((meal, idx) => {
        const key = `${d}-${meal}`;
        const data = days[key];
        if (data && (data.description || data.foods || data.calories)) {
          daysArray.push({
            dayNumber: d,
            mealType: meal,
            description: data.description || null,
            foods: data.foods || null,
            calories: data.calories ? parseInt(data.calories, 10) : null,
            notes: data.notes || null,
            sortOrder: idx,
            mediaId: null,
          });
        }
      });
    }

    if (isEditing && plan) {
      await onSubmit(
        {
          name: name.trim(),
          description: description.trim() || null,
          targetCondition: targetCondition.trim() || null,
          durationDays: numDays,
          dailyCalorieTarget: dailyCalorieTarget
            ? parseInt(dailyCalorieTarget, 10)
            : null,
          status,
          days: daysArray.length > 0 ? daysArray : null,
        },
        plan.id,
      );
    } else {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        targetCondition: targetCondition.trim() || null,
        durationDays: numDays,
        dailyCalorieTarget: dailyCalorieTarget
          ? parseInt(dailyCalorieTarget, 10)
          : null,
        isTemplate,
        patientId: null,
        sourcePlanId: null,
        status,
        days: daysArray.length > 0 ? daysArray : null,
      });
    }

    onOpenChange(false);
  };

  const numDays = parseInt(durationDays, 10) || 1;
  const dayTabs = Array.from(
    { length: Math.min(numDays, 30) },
    (_, i) => i + 1,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl min-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Editar plan de alimentación"
              : "Nuevo plan de alimentación"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del plan y sus comidas."
              : "Crea un nuevo plan nutricional con sus días y comidas."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4 py-2">
            {/* Datos básicos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="plan-name">Nombre *</Label>
                <Input
                  id="plan-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Plan keto bajo en carbohidratos"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="plan-desc">Descripción</Label>
                <Textarea
                  id="plan-desc"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Descripción del plan..."
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-condition">Condición objetivo</Label>
                <Input
                  id="plan-condition"
                  value={targetCondition}
                  onChange={(e) => setTargetCondition(e.target.value)}
                  placeholder="Ej: Obesidad, Diabetes tipo 2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-duration">Duración (días) *</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => handleDurationChange(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-calories">Calorías diarias objetivo</Label>
                <Input
                  id="plan-calories"
                  type="number"
                  min={0}
                  value={dailyCalorieTarget}
                  onChange={(e) => setDailyCalorieTarget(e.target.value)}
                  placeholder="Ej: 1800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Estado</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as NutritionPlanStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PLAN_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isEditing && (
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={isTemplate ? "template" : "custom"}
                    onValueChange={(v) => setIsTemplate(v === "template")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="template">
                        Template (biblioteca)
                      </SelectItem>
                      <SelectItem value="custom">
                        Personalizado (paciente)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Días y comidas */}
            {numDays > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Días y comidas</Label>
                {loadingDetail && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Cargando comidas del plan...
                  </p>
                )}
                <Tabs value={activeDay} onValueChange={setActiveDay}>
                  <TabsList className="h-auto flex-wrap gap-1 bg-muted p-1">
                    {dayTabs.map((d) => (
                      <TabsTrigger
                        key={d}
                        value={String(d)}
                        className="text-xs"
                      >
                        Día {d}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {dayTabs.map((d) => (
                    <TabsContent key={d} value={String(d)} className="mt-2">
                      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                        {MEAL_TYPES.map((meal) => {
                          const key = `${d}-${meal}`;
                          const data = days[key] ?? {
                            description: "",
                            foods: "",
                            calories: "",
                            notes: "",
                          };
                          return (
                            <div
                              key={meal}
                              className="flex flex-col gap-2 rounded-md bg-muted/50 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase text-muted-foreground">
                                  {MEAL_LABELS[meal]}
                                </span>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Descripción (ej: Ensalada de pollo)"
                                  value={data.description}
                                  onChange={(e) =>
                                    updateDayMeal(
                                      d,
                                      meal,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="Alimentos (ej: Pollo, aguacate, lechuga)"
                                  value={data.foods}
                                  onChange={(e) =>
                                    updateDayMeal(
                                      d,
                                      meal,
                                      "foods",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  placeholder="Calorías"
                                  value={data.calories}
                                  onChange={(e) =>
                                    updateDayMeal(
                                      d,
                                      meal,
                                      "calories",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="Notas (ej: Sin sal, porción doble)"
                                  value={data.notes}
                                  onChange={(e) =>
                                    updateDayMeal(
                                      d,
                                      meal,
                                      "notes",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
