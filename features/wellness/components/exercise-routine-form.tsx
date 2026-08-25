"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  ExerciseRoutineListItem,
  RoutineExerciseInput,
  RoutineDifficulty,
  RoutineCategory,
  NutritionPlanStatus,
  CreateExerciseRoutineInput,
  UpdateExerciseRoutineInput,
} from "../types";
import {
  DIFFICULTY_OPTIONS,
  CATEGORY_OPTIONS,
  getExerciseRoutine,
} from "../services/exercise-routines-service";
import {
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
} from "../services/nutrition-plans-service";

interface ExerciseRoutineFormDialogProps {
  open: boolean;
  routine?: ExerciseRoutineListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
    id?: string,
  ) => Promise<void>;
}

interface ExerciseFormData {
  name: string;
  description: string;
  sets: string;
  repetitions: string;
  restSeconds: string;
  durationSecs: string;
  weightKg: string;
  targetMuscle: string;
  equipment: string;
  tempo: string;
  rpe: string;
  tips: string;
  notes: string;
}

const EMPTY_EXERCISE: ExerciseFormData = {
  name: "",
  description: "",
  sets: "",
  repetitions: "",
  restSeconds: "",
  durationSecs: "",
  weightKg: "",
  targetMuscle: "",
  equipment: "",
  tempo: "",
  rpe: "",
  tips: "",
  notes: "",
};

export function ExerciseRoutineFormDialog({
  open,
  routine,
  saving,
  onOpenChange,
  onSubmit,
}: ExerciseRoutineFormDialogProps) {
  const isEditing = Boolean(routine);

  const [name, setName] = useState(routine?.name ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [difficulty, setDifficulty] = useState<RoutineDifficulty>(
    routine?.difficulty ?? "Moderado",
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    routine?.estimatedMinutes?.toString() ?? "",
  );
  const [category, setCategory] = useState<RoutineCategory>(
    routine?.category ?? "Mixta",
  );
  const [status, setStatus] = useState<NutritionPlanStatus>(
    routine?.status ?? "Draft",
  );
  const [targetMuscles, setTargetMuscles] = useState("");
  const [equipment, setEquipment] = useState("");
  const [warmupNotes, setWarmupNotes] = useState("");
  const [cooldownNotes, setCooldownNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseFormData[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(Boolean(routine));

  useEffect(() => {
    if (!routine) return;

    let cancelled = false;

    // El item del listado no trae ejercicios: traer el detalle completo
    getExerciseRoutine(routine.id)
      .then((full) => {
        if (cancelled) return;
        if (full) {
          setTargetMuscles(full.targetMuscles ?? "");
          setEquipment(full.equipment ?? "");
          setWarmupNotes(full.warmupNotes ?? "");
          setCooldownNotes(full.cooldownNotes ?? "");
          setExercises(
            full.exercises
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((e) => ({
                name: e.name,
                description: e.description ?? "",
                sets: e.sets?.toString() ?? "",
                repetitions: e.repetitions?.toString() ?? "",
                restSeconds: e.restSeconds?.toString() ?? "",
                durationSecs: e.durationSecs?.toString() ?? "",
                weightKg: e.weightKg?.toString() ?? "",
                targetMuscle: e.targetMuscle ?? "",
                equipment: e.equipment ?? "",
                tempo: e.tempo ?? "",
                rpe: e.rpe?.toString() ?? "",
                tips: e.tips ?? "",
                notes: "",
              })),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routine]);

  const addExercise = () => {
    setExercises((prev) => [...prev, { ...EMPTY_EXERCISE }]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (
    index: number,
    field: keyof ExerciseFormData,
    value: string,
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    setExercises((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const exercisesInput: RoutineExerciseInput[] = exercises
      .filter((ex) => ex.name.trim())
      .map((ex, idx) => ({
        name: ex.name.trim(),
        description: ex.description.trim() || null,
        sets: ex.sets ? parseInt(ex.sets, 10) : null,
        repetitions: ex.repetitions ? parseInt(ex.repetitions, 10) : null,
        restSeconds: ex.restSeconds ? parseInt(ex.restSeconds, 10) : null,
        durationSecs: ex.durationSecs ? parseInt(ex.durationSecs, 10) : null,
        weightKg: ex.weightKg ? parseFloat(ex.weightKg) : null,
        targetMuscle: ex.targetMuscle.trim() || null,
        equipment: ex.equipment.trim() || null,
        tempo: ex.tempo.trim() || null,
        rpe: ex.rpe ? parseInt(ex.rpe, 10) : null,
        tips: ex.tips.trim() || null,
        mediaId: null,
        sortOrder: idx,
      }));

    await onSubmit(
      {
        name: name.trim(),
        description: description.trim() || null,
        difficulty,
        estimatedMinutes: estimatedMinutes
          ? parseInt(estimatedMinutes, 10)
          : null,
        category,
        status,
        targetMuscles: targetMuscles.trim() || null,
        equipment: equipment.trim() || null,
        warmupNotes: warmupNotes.trim() || null,
        cooldownNotes: cooldownNotes.trim() || null,
        mediaId: null,
        exercises: exercisesInput.length > 0 ? exercisesInput : null,
      },
      routine?.id,
    );

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Editar rutina de ejercicio"
              : "Nueva rutina de ejercicio"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la rutina y sus ejercicios."
              : "Crea una nueva rutina con sus ejercicios."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4 py-2">
            {/* Datos básicos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-name">Nombre *</Label>
                <Input
                  id="routine-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Rutina cardio HIIT principiantes"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-desc">Descripción</Label>
                <Textarea
                  id="routine-desc"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Descripción de la rutina..."
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Categoría</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as RoutineCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Dificultad</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as RoutineDifficulty)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="routine-minutes">Duración estimada (min)</Label>
                <Input
                  id="routine-minutes"
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="Ej: 30"
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
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-target-muscles">Grupos musculares objetivo</Label>
                <Input
                  id="routine-target-muscles"
                  value={targetMuscles}
                  onChange={(e) => setTargetMuscles(e.target.value)}
                  placeholder="Ej: Piernas, Core, Tren superior"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-equipment">Equipamiento necesario</Label>
                <Input
                  id="routine-equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="Ej: Mancuernas, banda elástica, banca"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-warmup">Calentamiento</Label>
                <Textarea
                  id="routine-warmup"
                  value={warmupNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWarmupNotes(e.target.value)}
                  placeholder="Instrucciones del calentamiento..."
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-cooldown">Enfriamiento</Label>
                <Textarea
                  id="routine-cooldown"
                  value={cooldownNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCooldownNotes(e.target.value)}
                  placeholder="Instrucciones del enfriamiento..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Ejercicios */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Ejercicios ({exercises.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExercise}
                >
                  <Plus data-icon="inline-start" className="size-3" />
                  Agregar ejercicio
                </Button>
              </div>

              {exercises.length === 0 && !loadingDetail && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No hay ejercicios. Haz clic en &quot;Agregar ejercicio&quot;
                  para comenzar.
                </p>
              )}

              {loadingDetail && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Cargando ejercicios...
                </p>
              )}

              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Ejercicio {index + 1}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        disabled={index === 0}
                        onClick={() => moveExercise(index, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        disabled={index === exercises.length - 1}
                        onClick={() => moveExercise(index, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        onClick={() => removeExercise(index)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Nombre del ejercicio *"
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(index, "name", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Descripción"
                      value={exercise.description}
                      onChange={(e) =>
                        updateExercise(index, "description", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Series"
                      value={exercise.sets}
                      onChange={(e) =>
                        updateExercise(index, "sets", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Repeticiones"
                      value={exercise.repetitions}
                      onChange={(e) =>
                        updateExercise(index, "repetitions", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Descanso (seg)"
                      value={exercise.restSeconds}
                      onChange={(e) =>
                        updateExercise(index, "restSeconds", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Duración (seg)"
                      value={exercise.durationSecs}
                      onChange={(e) =>
                        updateExercise(index, "durationSecs", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Peso (kg)"
                      value={exercise.weightKg}
                      onChange={(e) =>
                        updateExercise(index, "weightKg", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Músculo objetivo"
                      value={exercise.targetMuscle}
                      onChange={(e) =>
                        updateExercise(index, "targetMuscle", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Equipamiento"
                      value={exercise.equipment}
                      onChange={(e) =>
                        updateExercise(index, "equipment", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Tempo (ej: 2-1-2)"
                      value={exercise.tempo}
                      onChange={(e) =>
                        updateExercise(index, "tempo", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      placeholder="RPE (1-10)"
                      value={exercise.rpe}
                      onChange={(e) =>
                        updateExercise(index, "rpe", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="Tips de forma"
                      value={exercise.tips}
                      onChange={(e) =>
                        updateExercise(index, "tips", e.target.value)
                      }
                      className="h-8 text-sm sm:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>
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
                : "Crear rutina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
