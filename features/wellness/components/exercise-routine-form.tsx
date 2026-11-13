"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Library } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/components/ui/separator";
import type {
  ExerciseRoutineListItem,
  RoutineExerciseInput,
  RoutineDifficulty,
  RoutineCategory,
  NutritionPlanStatus,
  CreateExerciseRoutineInput,
  UpdateExerciseRoutineInput,
  RoutineExercise,
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
import { ExerciseMediaPicker } from "./exercise-media-picker";
import { RoutineExerciseCatalog } from "./routine-exercise-catalog";

interface ExerciseRoutineFormDialogProps {
  open: boolean;
  routine?: ExerciseRoutineListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
    id?: string,
  ) => Promise<void>;
  /** Compatibilidad con contenedores anteriores; este formulario ya no asigna pacientes. */
  onCreated?: (patientName: string) => void;
}

interface ExerciseRoutineFormFieldsProps {
  routine?: ExerciseRoutineListItem;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (
    input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
    id?: string,
  ) => Promise<void>;
  /** Compatibilidad con contenedores anteriores; este formulario ya no asigna pacientes. */
  onCreated?: (patientName: string) => void;
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
  mediaId: string;
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
  mediaId: "",
};

/** Copia editable: conserva los valores del ejercicio y su demostración, sin reutilizar su identidad. */
function exerciseToFormData(exercise: RoutineExercise): ExerciseFormData {
  return {
    name: exercise.name,
    description: exercise.description ?? "",
    sets: exercise.sets?.toString() ?? "",
    repetitions: exercise.repetitions?.toString() ?? "",
    restSeconds: exercise.restSeconds?.toString() ?? "",
    durationSecs: exercise.durationSecs?.toString() ?? "",
    weightKg: exercise.weightKg?.toString() ?? "",
    targetMuscle: exercise.targetMuscle ?? "",
    equipment: exercise.equipment ?? "",
    tempo: exercise.tempo ?? "",
    rpe: exercise.rpe?.toString() ?? "",
    tips: exercise.tips ?? "",
    notes: "",
    mediaId: exercise.mediaId ?? "",
  };
}

export function ExerciseRoutineFormFields({
  routine,
  saving,
  onCancel,
  onSubmit,
}: ExerciseRoutineFormFieldsProps) {
  const isEditing = Boolean(routine);
  const t = useT();

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
  const [detailError, setDetailError] = useState(false);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [routineMediaId, setRoutineMediaId] = useState<string | null>(null);
  const [mediaUploads, setMediaUploads] = useState(0);

  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    if (!routine) return;

    let cancelled = false;

    // El item del listado no trae ejercicios: traer el detalle completo
    getExerciseRoutine(routine.id)
      .then((full) => {
        if (cancelled) return;
        if (full) {
          setName(full.name);
          setDescription(full.description ?? "");
          setDifficulty(full.difficulty);
          setEstimatedMinutes(full.estimatedMinutes?.toString() ?? "");
          setCategory(full.category);
          setStatus(full.status);
          setRoutineMediaId(full.mediaId);
          setDetailError(false);
          setTargetMuscles(full.targetMuscles ?? "");
          setEquipment(full.equipment ?? "");
          setWarmupNotes(full.warmupNotes ?? "");
          setCooldownNotes(full.cooldownNotes ?? "");
          setExercises(
            full.exercises
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(exerciseToFormData),
          );
        } else setDetailError(true);
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routine, detailAttempt]);

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
    if (!name.trim() || loadingDetail || detailError || mediaUploads > 0)
      return;

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
        mediaId: ex.mediaId || null,
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
        mediaId: routineMediaId,
        exercises: exercisesInput.length > 0 ? exercisesInput : null,
      },
      routine?.id,
    );
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 sm:px-6">
      <div className="rounded-xl border border-border bg-primary-soft px-4 py-4">
        <p className="text-sm font-semibold text-foreground">
          {t("Una rutina clara, ejercicio por ejercicio")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Define la técnica, la intensidad y una demostración visual para que el paciente sepa cómo moverse.",
          )}
        </p>
      </div>
      {detailError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-destructive p-4"
                      >
          <p className="text-sm text-destructive">
            {t(
              "No se pudo cargar la rutina. Vuelve a intentarlo antes de guardar.",
            )}
          </p>
                    <Button
                      type="button"
                      variant="outline"
            onClick={() => {
              setLoadingDetail(true);
              setDetailAttempt((value) => value + 1);
            }}
                    >
            {t("Reintentar")}
                    </Button>
                      </div>
                    )}
      <div className="flex flex-col gap-4">
            {/* Datos básicos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-name">{t("Nombre")} *</Label>
                <Input
                  id="routine-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Ej: Rutina cardio HIIT principiantes")}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-desc">{t("Descripción")}</Label>
                <Textarea
                  id="routine-desc"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder={t("Descripción de la rutina...")}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("Categoría")}</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as RoutineCategory)}
                >
                  <SelectTrigger aria-label={t("Categoría")}>
                    <SelectValue>{t(CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("Dificultad")}</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as RoutineDifficulty)}
                >
                  <SelectTrigger aria-label={t("Dificultad")}>
                    <SelectValue>{t(DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label ?? difficulty)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="routine-minutes">{t("Duración estimada (min)")}</Label>
                <Input
                  id="routine-minutes"
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder={t("Ej: 30")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("Estado")}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as NutritionPlanStatus)}
                >
                  <SelectTrigger aria-label={t("Estado")}>
                    <SelectValue>{t(PLAN_STATUS_LABELS[status])}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(PLAN_STATUS_LABELS[s])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-target-muscles">{t("Grupos musculares objetivo")}</Label>
                <Input
                  id="routine-target-muscles"
                  value={targetMuscles}
                  onChange={(e) => setTargetMuscles(e.target.value)}
                  placeholder={t("Ej: Piernas, Core, Tren superior")}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-equipment">{t("Equipamiento necesario")}</Label>
                <Input
                  id="routine-equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder={t("Ej: Mancuernas, banda elástica, banca")}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-warmup">{t("Calentamiento")}</Label>
                <Textarea
                  id="routine-warmup"
                  value={warmupNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWarmupNotes(e.target.value)}
                  placeholder={t("Instrucciones del calentamiento...")}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="routine-cooldown">{t("Enfriamiento")}</Label>
                <Textarea
                  id="routine-cooldown"
                  value={cooldownNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCooldownNotes(e.target.value)}
                  placeholder={t("Instrucciones del enfriamiento...")}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Ejercicios */}
            <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {t("Ejercicios ({count})", { count: String(exercises.length) })}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={
                  saving || loadingDetail || detailError || mediaUploads > 0
                }
                onClick={() => setCatalogOpen(true)}
              >
                <Library data-icon="inline-start" />
                {t("Elegir de la biblioteca")}
              </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExercise}
                className="min-h-11"
                disabled={
                  saving || loadingDetail || detailError || mediaUploads > 0
                }
                >
                  <Plus data-icon="inline-start" className="size-3" />
                  {t("Agregar ejercicio")}
                </Button>
              </div>
          </div>

              {exercises.length === 0 && !loadingDetail && (
                <p className="text-xs text-muted-foreground text-center py-4">
              {t(
                'No hay ejercicios. Haz clic en "Agregar ejercicio" para comenzar.',
              )}
                </p>
              )}

              {loadingDetail && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("Cargando ejercicios...")}
                </p>
              )}

              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("Ejercicio {index}", { index: String(index + 1) })}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        aria-label={t("Mover ejercicio arriba")}
                        disabled={index === 0 || mediaUploads > 0}
                        onClick={() => moveExercise(index, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        aria-label={t("Mover ejercicio abajo")}
                        disabled={index === exercises.length - 1 || mediaUploads > 0}
                        onClick={() => moveExercise(index, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 text-destructive"
                        aria-label={t("Eliminar ejercicio")}
                        disabled={mediaUploads > 0}
                        onClick={() => removeExercise(index)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      aria-label={t("Nombre del ejercicio *")} placeholder={t("Nombre del ejercicio *")}
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(index, "name", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      aria-label={t("Descripción")} placeholder={t("Descripción")}
                      value={exercise.description}
                      onChange={(e) =>
                        updateExercise(index, "description", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      type="number"
                      aria-label={t("Series")} placeholder={t("Series")}
                      value={exercise.sets}
                      onChange={(e) =>
                        updateExercise(index, "sets", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      type="number"
                      aria-label={t("Repeticiones")} placeholder={t("Repeticiones")}
                      value={exercise.repetitions}
                      onChange={(e) =>
                        updateExercise(index, "repetitions", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      type="number"
                      aria-label={t("Descanso (seg)")} placeholder={t("Descanso (seg)")}
                      value={exercise.restSeconds}
                      onChange={(e) =>
                        updateExercise(index, "restSeconds", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      type="number"
                      aria-label={t("Duración (seg)")} placeholder={t("Duración (seg)")}
                      value={exercise.durationSecs}
                      onChange={(e) =>
                        updateExercise(index, "durationSecs", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      aria-label={t("Peso (kg)")} placeholder={t("Peso (kg)")}
                      value={exercise.weightKg}
                      onChange={(e) =>
                        updateExercise(index, "weightKg", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      aria-label={t("Músculo objetivo")} placeholder={t("Músculo objetivo")}
                      value={exercise.targetMuscle}
                      onChange={(e) =>
                        updateExercise(index, "targetMuscle", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      aria-label={t("Equipamiento")} placeholder={t("Equipamiento")}
                      value={exercise.equipment}
                      onChange={(e) =>
                        updateExercise(index, "equipment", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      aria-label={t("Tempo (ej: 2-1-2)")} placeholder={t("Tempo (ej: 2-1-2)")}
                      value={exercise.tempo}
                      onChange={(e) =>
                        updateExercise(index, "tempo", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      aria-label={t("RPE (1-10)")} placeholder={t("RPE (1-10)")}
                      value={exercise.rpe}
                      onChange={(e) =>
                        updateExercise(index, "rpe", e.target.value)
                      }
                      className="min-h-11 text-sm"
                    />
                    <Input
                      aria-label={t("Tips de forma")} placeholder={t("Tips de forma")}
                      value={exercise.tips}
                      onChange={(e) =>
                        updateExercise(index, "tips", e.target.value)
                      }
                      className="min-h-11 text-sm sm:col-span-2"
                    />
                   </div>
              <ExerciseMediaPicker
                value={exercise.mediaId}
                exerciseName={exercise.name}
                disabled={saving}
                     onChange={(id) => updateExercise(index, "mediaId", id)}
                onBusyChange={(busy) =>
                  setMediaUploads((count) =>
                    Math.max(0, count + (busy ? 1 : -1)),
                  )
                }
              />
                 </div>
               ))}
            </div>
      </div>

      <RoutineExerciseCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onSelect={(exercise) => {
          setExercises((current) => [...current, exerciseToFormData(exercise)]);
          setCatalogOpen(false);
        }}
      />
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving || mediaUploads > 0}
        >
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={
            saving ||
            !name.trim() ||
            loadingDetail ||
            detailError ||
            mediaUploads > 0
          }
        >
          {saving
            ? t("Guardando...")
            : isEditing
              ? t("Guardar cambios")
              : t("Crear rutina")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Modal de EDICIÓN de rutinas de ejercicio. La creación vive en la página
 * dedicada /wellness/exercise-routines/new; el cuerpo es compartido
 * (ExerciseRoutineFormFields).
 */
export function ExerciseRoutineFormDialog({
  open,
  routine,
  saving,
  onOpenChange,
  onSubmit,
  onCreated,
}: ExerciseRoutineFormDialogProps) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="overflow-hidden p-0">
        <DialogHeader className="px-6 pb-1 pt-5">
          <DialogTitle>
            {routine
              ? t("Editar rutina de ejercicio")
              : t("Nueva rutina de ejercicio")}
          </DialogTitle>
          <DialogDescription>
            {routine
              ? t("Modifica los datos de la rutina y sus ejercicios.")
              : t("Crea una nueva rutina con sus ejercicios.")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ExerciseRoutineFormFields
            routine={routine}
            saving={saving}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (input, id) => {
              await onSubmit(input, id);
              onOpenChange(false);
            }}
            onCreated={onCreated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
