"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Search, Sparkles } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { ApiError } from "@/lib/api/http";
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
  ExerciseGeneratedPayload,
} from "../types";
import {
  DIFFICULTY_OPTIONS,
  CATEGORY_OPTIONS,
  getExerciseRoutine,
} from "../services/exercise-routines-service";
import {
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  fetchPatientsForPicker,
} from "../services/nutrition-plans-service";
import {
  generatePlan,
  mapExercisePayloadToForm,
} from "../services/generate-plan-service";

interface ExerciseRoutineFormDialogProps {
  open: boolean;
  routine?: ExerciseRoutineListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
    id?: string,
  ) => Promise<void>;
  /** Se invoca tras crear (no editar) una rutina vinculada a un paciente. */
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
  /** Se invoca tras crear (no editar) una rutina vinculada a un paciente. */
  onCreated?: (patientName: string) => void;
}

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
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

export function ExerciseRoutineFormFields({
  routine,
  saving,
  onCancel,
  onSubmit,
  onCreated,
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

  const handleSelectPatient = (p: PickerItem) => {
    setSelectedPatientId(p.id);
    setSelectedPatientLabel(p.label);
    setPatientSearch("");
    setPatientResults([]);
    setGenerateError("");
    // Una rutina vinculada a un paciente nace activa y como asignación
    // (mismo comportamiento que los planes personalizados).
    setStatus("Active");
  };

  const handleClearPatient = () => {
    setSelectedPatientId(null);
    setSelectedPatientLabel("");
    setGenerateError("");
  };

  // Genera la rutina con IA y pre-llena el form completo
  const handleGenerate = async () => {
    if (!selectedPatientId) return;

    setGenerating(true);
    setGenerateError("");
    try {
      const response = await generatePlan(selectedPatientId, "exercise");
      const values = mapExercisePayloadToForm(
        response.payload as unknown as ExerciseGeneratedPayload,
      );
      setName(values.name);
      setDescription(values.description);
      setDifficulty(values.difficulty);
      setEstimatedMinutes(values.estimatedMinutes);
      setCategory(values.category);
      setTargetMuscles(values.targetMuscles);
      setEquipment(values.equipment);
      setWarmupNotes(values.warmupNotes);
      setCooldownNotes(values.cooldownNotes);
      setExercises(values.exercises);
    } catch (err) {
      setGenerateError(
        err instanceof ApiError
          ? err.message
          : t("No se pudo generar la rutina. Intenta nuevamente."),
      );
    } finally {
      setGenerating(false);
    }
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
        patientId: selectedPatientId ?? undefined,
        exercises: exercisesInput.length > 0 ? exercisesInput : null,
      },
      routine?.id,
    );

    // Al crear con paciente, el backend crea la asignación en la misma
    // transacción: notificar para confirmar el vínculo.
    if (!routine && selectedPatientId) {
      onCreated?.(selectedPatientLabel);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div className="flex flex-col gap-4">
        {/* Paciente (opcional) + generación con IA — solo en creación.
            Al guardar con paciente, la rutina nace activa y se asigna
            automáticamente (creación atómica en el backend). */}
            {/* Paciente (opcional) + generación con IA — solo en creación.
                Al guardar con paciente, la rutina nace activa y se asigna
                automáticamente (creación atómica en el backend). */}
            {!isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("Paciente (opcional)")}</Label>
                {selectedPatientId && selectedPatientLabel ? (
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
                        ? t("Generando...")
                        : t("Generar rutina con IA")}
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
                        placeholder={t("Buscar paciente por nombre...")}
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
                        {t("Buscando...")}
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
                        {t("No se encontraron pacientes.")}
                      </p>
                      )}
                  </>
                )}
              </div>
            )}

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
                <Label>{t("Dificultad")}</Label>
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
              <div className="flex items-center justify-between">
                <Label>{t("Ejercicios ({count})", { count: String(exercises.length) })}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExercise}
                >
                  <Plus data-icon="inline-start" className="size-3" />
                  {t("Agregar ejercicio")}
                </Button>
              </div>

              {exercises.length === 0 && !loadingDetail && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t('No hay ejercicios. Haz clic en "Agregar ejercicio" para comenzar.')}
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
                  className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3"
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
                      placeholder={t("Nombre del ejercicio *")}
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(index, "name", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder={t("Descripción")}
                      value={exercise.description}
                      onChange={(e) =>
                        updateExercise(index, "description", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t("Series")}
                      value={exercise.sets}
                      onChange={(e) =>
                        updateExercise(index, "sets", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t("Repeticiones")}
                      value={exercise.repetitions}
                      onChange={(e) =>
                        updateExercise(index, "repetitions", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t("Descanso (seg)")}
                      value={exercise.restSeconds}
                      onChange={(e) =>
                        updateExercise(index, "restSeconds", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t("Duración (seg)")}
                      value={exercise.durationSecs}
                      onChange={(e) =>
                        updateExercise(index, "durationSecs", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={t("Peso (kg)")}
                      value={exercise.weightKg}
                      onChange={(e) =>
                        updateExercise(index, "weightKg", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder={t("Músculo objetivo")}
                      value={exercise.targetMuscle}
                      onChange={(e) =>
                        updateExercise(index, "targetMuscle", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder={t("Equipamiento")}
                      value={exercise.equipment}
                      onChange={(e) =>
                        updateExercise(index, "equipment", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder={t("Tempo (ej: 2-1-2)")}
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
                      placeholder={t("RPE (1-10)")}
                      value={exercise.rpe}
                      onChange={(e) =>
                        updateExercise(index, "rpe", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder={t("Tips de forma")}
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

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
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
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto">
          <ExerciseRoutineFormFields
            routine={routine}
            saving={saving}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
            onCreated={onCreated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
