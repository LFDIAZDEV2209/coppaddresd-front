"use client";

import { useState, useEffect } from "react";
import { GlassWater, Search, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api/http";
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
  CreateNutritionPlanInput,
  UpdateNutritionPlanInput,
  NutritionGeneratedPayload,
} from "../types";
import {
  MEAL_TYPES,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  getNutritionPlan,
  fetchPatientsForPicker,
} from "../services/nutrition-plans-service";
import {
  generatePlan,
  mapNutritionPayloadToForm,
} from "../services/generate-plan-service";

interface NutritionPlanFormDialogProps {
  open: boolean;
  plan?: NutritionPlanListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: CreateNutritionPlanInput | UpdateNutritionPlanInput,
    id?: string,
  ) => Promise<void>;
  /** Se invoca tras crear (no editar) un plan vinculado a un paciente. */
  onCreated?: (patientName: string) => void;
}

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface DayMealData {
  description: string;
  foods: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  waterMl: string;
  notes: string;
}

const MEAL_LABELS: Record<MealType, string> = {
  Desayuno: "Desayuno",
  Almuerzo: "Almuerzo",
  Cena: "Cena",
  Snack: "Snack",
};

/** Vasos de 300 ml para la meta de agua diaria. Regla de redondeo consistente:
 *  Math.round(ml / 300) con mínimo 1 vaso (2000 ml → 7 vasos). */
const glassesForDailyWater = (value: string): number => {
  const ml = Number(value);
  const safeMl = Number.isFinite(ml) && ml > 0 ? ml : 2000;
  return Math.max(1, Math.round(safeMl / 300));
};

export function NutritionPlanFormDialog({
  open,
  plan,
  saving,
  onOpenChange,
  onSubmit,
  onCreated,
}: NutritionPlanFormDialogProps) {
  const isEditing = Boolean(plan);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCondition, setTargetCondition] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState("");
  const [dailyProteinTarget, setDailyProteinTarget] = useState("");
  const [dailyCarbsTarget, setDailyCarbsTarget] = useState("");
  const [dailyFatTarget, setDailyFatTarget] = useState("");
  const [dailyFiberTarget, setDailyFiberTarget] = useState("");
  const [allergens, setAllergens] = useState("");
  const [mealTiming, setMealTiming] = useState("");
  const [isTemplate, setIsTemplate] = useState(true);
  const [status, setStatus] = useState<NutritionPlanStatus>("Draft");

  // Days state: key = "dayNumber-mealType"
  const [days, setDays] = useState<Record<string, DayMealData>>({});
  // Meta de agua diaria por DÍA (mismo valor para todas las comidas del día,
  // igual que dayNumber). Se edita una sola vez por día, no por comida.
  const [dailyWaterByDay, setDailyWaterByDay] = useState<Record<number, string>>({});
  const [activeDay, setActiveDay] = useState("1");
  const [loadingDetail, setLoadingDetail] = useState(Boolean(plan));

  // Estado del picker de paciente + generación con IA (solo en creación)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [selectedPatientLabel, setSelectedPatientLabel] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PickerItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Búsqueda de paciente con debounce (mismo patrón que assignment-form)
  useEffect(() => {
    if (patientSearch.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLoadingPatients(true);
      try {
        const result = await fetchPatientsForPicker(1, 10, patientSearch);
        setPatientResults(
          result.data.map((p) => ({
            id: p.id,
            label: `${p.firstName} ${p.lastName}`,
            sublabel: p.email ?? p.medicalRecordNumber ?? undefined,
          })),
        );
      } catch {
        setPatientResults([]);
      } finally {
        setLoadingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Cargar el detalle completo al editar (el item del listado no trae días
  // ni todos los campos: el detalle es la fuente de verdad)
  useEffect(() => {
    if (!plan) return;

    let cancelled = false;

    getNutritionPlan(plan.id)
      .then((full) => {
        if (cancelled) return;
        if (!full) return;

        // Datos básicos
        setName(full.name);
        setDescription(full.description ?? "");
        setTargetCondition(full.targetCondition ?? "");
        setDurationDays(String(full.durationDays));
        setDailyCalorieTarget(full.dailyCalorieTarget?.toString() ?? "");
        setDailyProteinTarget(full.dailyProteinTarget?.toString() ?? "");
        setDailyCarbsTarget(full.dailyCarbsTarget?.toString() ?? "");
        setDailyFatTarget(full.dailyFatTarget?.toString() ?? "");
        setDailyFiberTarget(full.dailyFiberTarget?.toString() ?? "");
        setAllergens(full.allergens ?? "");
        setMealTiming(full.mealTiming ?? "");
        setIsTemplate(full.isTemplate);
        setStatus(full.status);

        // Paciente asociado (planes personalizados)
        if (full.patientId) {
          setSelectedPatientId(full.patientId);
          setSelectedPatientLabel(full.patientName ?? "");
        } else {
          setSelectedPatientId(null);
          setSelectedPatientLabel("");
        }

        // Días/comidas
        if (full.days && full.days.length > 0) {
          const newDays: Record<string, DayMealData> = {};
          // Estructura base para todos los días del plan
          for (let d = 1; d <= full.durationDays; d++) {
            for (const meal of MEAL_TYPES) {
              newDays[`${d}-${meal}`] = { description: "", foods: "", calories: "", proteinG: "", carbsG: "", fatG: "", fiberG: "", waterMl: "", notes: "" };
            }
          }
          // Rellenar con los datos existentes
          for (const day of full.days) {
            newDays[`${day.dayNumber}-${day.mealType}`] = {
              description: day.description ?? "",
              foods: day.foods ?? "",
              calories: day.calories?.toString() ?? "",
              proteinG: day.proteinG?.toString() ?? "",
              carbsG: day.carbsG?.toString() ?? "",
              fatG: day.fatG?.toString() ?? "",
              fiberG: day.fiberG?.toString() ?? "",
              waterMl: day.waterMl?.toString() ?? "",
              notes: day.notes ?? "",
            };
          }
          setDays(newDays);

          // Meta de agua diaria: todas las filas del día traen el mismo valor
          // (misma convención que dayNumber). Tomar el de la primera fila que
          // lo traiga; default 2000 si el backend no lo envía.
          const newDailyWater: Record<number, string> = {};
          for (let d = 1; d <= full.durationDays; d++) {
            newDailyWater[d] = "2000";
          }
          for (const day of full.days) {
            if (day.dailyWaterMl) {
              newDailyWater[day.dayNumber] = String(day.dailyWaterMl);
            }
          }
          setDailyWaterByDay(newDailyWater);

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
          proteinG: "",
          carbsG: "",
          fatG: "",
          fiberG: "",
          waterMl: "",
          notes: "",
        };
      }
    }
    setDays(newDays);

    // Conservar la meta de agua de los días existentes; default 2000 para los nuevos
    setDailyWaterByDay((prev) => {
      const next: Record<number, string> = {};
      for (let d = 1; d <= num; d++) {
        next[d] = prev[d] ?? "2000";
      }
      return next;
    });
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

const handleSelectPatient = (p: PickerItem) => {
      setSelectedPatientId(p.id);
      setSelectedPatientLabel(p.label);
      setPatientSearch("");
      setPatientResults([]);
      setGenerateError("");
      // Un plan vinculado a un paciente es personalizado (no template) y
      // nace como asignación activa para que aparezca en Asignaciones.
      setIsTemplate(false);
      setStatus("Active");
    };

  const handleClearPatient = () => {
    setSelectedPatientId(null);
    setSelectedPatientLabel("");
    setGenerateError("");
  };

  // Genera el plan con IA y pre-llena el form completo
  const handleGenerate = async () => {
    if (!selectedPatientId) return;

    setGenerating(true);
    setGenerateError("");
    try {
      const response = await generatePlan(selectedPatientId, "nutrition");
      const values = mapNutritionPayloadToForm(
        response.payload as unknown as NutritionGeneratedPayload,
      );
      setName(values.name);
      setDescription(values.description);
      setTargetCondition(values.targetCondition);
      setDurationDays(values.durationDays);
      setDailyCalorieTarget(values.dailyCalorieTarget);
      setDailyProteinTarget(values.dailyProteinTarget);
      setDailyCarbsTarget(values.dailyCarbsTarget);
      setDailyFatTarget(values.dailyFatTarget);
      setDailyFiberTarget(values.dailyFiberTarget);
      setAllergens(values.allergens);
      setMealTiming(values.mealTiming);
      setDays(values.days);

      // La IA no genera la meta de agua diaria: default 2000 para todos los días
      const generatedDuration = Math.max(
        Math.trunc(Number(values.durationDays)) || 1,
        1,
      );
      const generatedDailyWater: Record<number, string> = {};
      for (let d = 1; d <= generatedDuration; d++) {
        generatedDailyWater[d] = "2000";
      }
      setDailyWaterByDay(generatedDailyWater);

      // Al vincular con paciente, el plan es personalizado
      setIsTemplate(false);
    } catch (err) {
      setGenerateError(
        err instanceof ApiError
          ? err.message
          : "No se pudo generar el plan. Intenta nuevamente.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const numDays = parseInt(durationDays, 10);
    if (!name.trim() || isNaN(numDays) || numDays < 1) return;

    // Build days array from the record
    const daysArray: NutritionPlanDayInput[] = [];
    for (let d = 1; d <= numDays; d++) {
      // Meta de agua diaria: se envía igual en todas las comidas del día
      // (default 2000 cuando está vacía o es inválida; el backend usa 2000 para 0)
      const parsedDailyWater = parseInt(dailyWaterByDay[d] ?? "2000", 10);
      const dailyWaterMl =
        !isNaN(parsedDailyWater) && parsedDailyWater > 0
          ? parsedDailyWater
          : 2000;
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
            proteinG: data.proteinG ? parseFloat(data.proteinG) : null,
            carbsG: data.carbsG ? parseFloat(data.carbsG) : null,
            fatG: data.fatG ? parseFloat(data.fatG) : null,
            fiberG: data.fiberG ? parseFloat(data.fiberG) : null,
            waterMl: data.waterMl ? parseInt(data.waterMl, 10) : null,
            dailyWaterMl,
            notes: data.notes || null,
            sortOrder: idx,
            mediaId: null,
          });
        }
      });
    }

    const parseNum = (v: string) => v ? parseFloat(v) : null;

    if (isEditing && plan) {
      await onSubmit(
        {
          name: name.trim(),
          description: description.trim() || null,
          targetCondition: targetCondition.trim() || null,
          durationDays: numDays,
          dailyCalorieTarget: dailyCalorieTarget ? parseInt(dailyCalorieTarget, 10) : null,
          dailyProteinTarget: parseNum(dailyProteinTarget),
          dailyCarbsTarget: parseNum(dailyCarbsTarget),
          dailyFatTarget: parseNum(dailyFatTarget),
          dailyFiberTarget: parseNum(dailyFiberTarget),
          allergens: allergens.trim() || null,
          mealTiming: mealTiming.trim() || null,
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
        dailyCalorieTarget: dailyCalorieTarget ? parseInt(dailyCalorieTarget, 10) : null,
        dailyProteinTarget: parseNum(dailyProteinTarget),
        dailyCarbsTarget: parseNum(dailyCarbsTarget),
        dailyFatTarget: parseNum(dailyFatTarget),
        dailyFiberTarget: parseNum(dailyFiberTarget),
        allergens: allergens.trim() || null,
        mealTiming: mealTiming.trim() || null,
        // Con paciente seleccionado el plan es personalizado y queda vinculado
        isTemplate: selectedPatientId ? false : isTemplate,
        patientId: selectedPatientId,
        sourcePlanId: null,
        status,
        days: daysArray.length > 0 ? daysArray : null,
      });

      // Al crear con paciente, el backend crea la asignación en la misma
      // transacción: notificar para confirmar el vínculo.
      if (selectedPatientId) {
        onCreated?.(selectedPatientLabel);
      }
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
            {/* Paciente (opcional) + generación con IA */}
            <div className="flex flex-col gap-1.5">
              <Label>
                {isEditing ? "Paciente asociado" : "Paciente (opcional)"}
              </Label>
              {isEditing ? (
                // En edición: mostrar el paciente del plan (solo lectura)
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {selectedPatientLabel || "—"}
                </div>
              ) : selectedPatientId && selectedPatientLabel ? (
                <div className="flex flex-col gap-2">
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                    {selectedPatientLabel}
                    <button
                      type="button"
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      onClick={handleClearPatient}
                      aria-label="Quitar paciente"
                    >
                      ×
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={generating || saving}
                    onClick={handleGenerate}
                  >
                    <Sparkles data-icon="inline-start" className="size-3" />
                    {generating
                      ? "Generando..."
                      : "Generar plan con IA"}
                  </Button>
                  {generateError && (
                    <p className="text-xs text-destructive">
                      {generateError}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar paciente por nombre..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setGenerateError("");
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  {loadingPatients && (
                    <p className="text-xs text-muted-foreground">
                      Buscando...
                    </p>
                  )}
                  {patientResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => handleSelectPatient(p)}
                        >
                          <span>{p.label}</span>
                          {p.sublabel && (
                            <span className="text-xs text-muted-foreground">
                              {p.sublabel}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {patientSearch.length >= 2 &&
                    !loadingPatients &&
                    patientResults.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No se encontraron pacientes.
                      </p>
                    )}
                </>
              )}
            </div>

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
                <Label htmlFor="plan-protein">Proteína (g/día)</Label>
                <Input
                  id="plan-protein"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dailyProteinTarget}
                  onChange={(e) => setDailyProteinTarget(e.target.value)}
                  placeholder="Ej: 120"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-carbs">Carbohidratos (g/día)</Label>
                <Input
                  id="plan-carbs"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dailyCarbsTarget}
                  onChange={(e) => setDailyCarbsTarget(e.target.value)}
                  placeholder="Ej: 200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-fat">Grasa (g/día)</Label>
                <Input
                  id="plan-fat"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dailyFatTarget}
                  onChange={(e) => setDailyFatTarget(e.target.value)}
                  placeholder="Ej: 60"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-fiber">Fibra (g/día)</Label>
                <Input
                  id="plan-fiber"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dailyFiberTarget}
                  onChange={(e) => setDailyFiberTarget(e.target.value)}
                  placeholder="Ej: 30"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="plan-allergens">Alergias / Restricciones</Label>
                <Input
                  id="plan-allergens"
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                  placeholder="Ej: Gluten, Lactosa, Frutos secos"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="plan-meal-timing">Horarios de comida</Label>
                <Input
                  id="plan-meal-timing"
                  value={mealTiming}
                  onChange={(e) => setMealTiming(e.target.value)}
                  placeholder="Ej: 7:00, 12:00, 15:30, 19:00"
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
                  {dayTabs.map((d) => {
                    const glasses = glassesForDailyWater(
                      dailyWaterByDay[d] ?? "2000",
                    );
                    return (
                      <TabsContent key={d} value={String(d)} className="mt-2">
                        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                          {/* Meta de agua del DÍA: se edita una vez por día, no por
                              comida (el input "Agua (ml)" de cada comida es otro
                              concepto: agua de esa comida). */}
                          <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">
                              Agua del día
                            </span>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`daily-water-${d}`}>
                                  Meta de agua (ml)
                                </Label>
                                <Input
                                  id={`daily-water-${d}`}
                                  type="number"
                                  min={0}
                                  step={50}
                                  value={dailyWaterByDay[d] ?? "2000"}
                                  onChange={(e) =>
                                    setDailyWaterByDay((prev) => ({
                                      ...prev,
                                      [d]: e.target.value,
                                    }))
                                  }
                                  className="h-8 w-28 text-sm"
                                />
                              </div>
                              <div
                                className="flex items-center gap-1 pb-1"
                                aria-hidden="true"
                              >
                                {Array.from({ length: glasses }, (_, i) => (
                                  <GlassWater
                                    key={i}
                                    className="size-4 text-sky-500"
                                  />
                                ))}
                              </div>
                              <span className="pb-1 text-xs text-muted-foreground">
                                ≈ {glasses} vasos de 300 ml
                              </span>
                            </div>
                          </div>
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
                              <div className="grid gap-2 sm:grid-cols-3">
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
                                  type="number"
                                  step="0.1"
                                  placeholder="Proteína (g)"
                                  value={data.proteinG}
                                  onChange={(e) =>
                                    updateDayMeal(d, meal, "proteinG", e.target.value)
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Carbos (g)"
                                  value={data.carbsG}
                                  onChange={(e) =>
                                    updateDayMeal(d, meal, "carbsG", e.target.value)
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Grasa (g)"
                                  value={data.fatG}
                                  onChange={(e) =>
                                    updateDayMeal(d, meal, "fatG", e.target.value)
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Fibra (g)"
                                  value={data.fiberG}
                                  onChange={(e) =>
                                    updateDayMeal(d, meal, "fiberG", e.target.value)
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  placeholder="Agua (ml)"
                                  value={data.waterMl}
                                  onChange={(e) =>
                                    updateDayMeal(d, meal, "waterMl", e.target.value)
                                  }
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="Notas"
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
                  );
                })}
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
