"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
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
import type {
  RoutineAssignment,
  CreateRoutineAssignmentInput,
  UpdateRoutineAssignmentInput,
  AssignmentFrequency,
  AssignmentStatus,
} from "../types";
import {
  FREQUENCY_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  fetchPatientsForPicker,
  fetchRoutinesForPicker,
  createNutritionPlanAssignment,
} from "../services/assignments-service";

interface AssignmentFormFieldsProps {
  assignment?: RoutineAssignment;
  saving?: boolean;
  onCancel: () => void;
  onSubmit?: (
    input: CreateRoutineAssignmentInput | UpdateRoutineAssignmentInput,
    id?: string,
  ) => Promise<void>;
  onCreated?: () => void;
}

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

export function AssignmentFormFields({
  assignment,
  saving: savingProp,
  onCancel,
  onSubmit,
  onCreated,
}: AssignmentFormFieldsProps) {
  const isEditing = Boolean(assignment);
  const t = useT();
  const [saving, setSaving] = useState(false);
  const isSaving = savingProp ?? saving;

  // Form state
  const [patientId, setPatientId] = useState<string | null>(
    assignment?.patientId ?? null,
  );
  const [patientLabel, setPatientLabel] = useState(
    assignment?.patientName ?? "",
  );
  const [routineId, setRoutineId] = useState<string | null>(
    assignment?.routineId ?? null,
  );
  const [routineLabel, setRoutineLabel] = useState(
    assignment?.routineName ?? "",
  );
  const [assignmentType, setAssignmentType] = useState<"routine" | "nutrition">(
    "routine",
  );
  const [startDate, setStartDate] = useState(
    assignment?.startDate?.split("T")[0] ??
      new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    assignment?.endDate?.split("T")[0] ?? "",
  );
  const [frequency, setFrequency] = useState<AssignmentFrequency>(
    assignment?.frequency ?? "Diaria",
  );
  const [status, setStatus] = useState<AssignmentStatus>(
    assignment?.status ?? "Active",
  );
  const [notes, setNotes] = useState(assignment?.notes ?? "");

  // Picker state
  const [patientSearch, setPatientSearch] = useState("");
  const [routineSearch, setRoutineSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PickerItem[]>([]);
  const [routineResults, setRoutineResults] = useState<PickerItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(false);

  // Debounced patient search
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

  // Debounced routine/nutrition plan search
  useEffect(() => {
    if (routineSearch.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLoadingRoutines(true);
      try {
        if (assignmentType === "routine") {
          const result = await fetchRoutinesForPicker(1, 10, routineSearch);
          setRoutineResults(
            result.data.map((r) => ({
              id: r.id,
              label: r.name,
              sublabel: `${r.category} · ${r.difficulty}`,
            })),
          );
        } else {
          const { fetchNutritionPlansForPicker } =
            await import("../services/assignments-service");
          const result = await fetchNutritionPlansForPicker(
            1,
            10,
            routineSearch,
          );
          setRoutineResults(
            result.data.map((p) => ({
              id: p.id,
              label: p.name,
              sublabel: `${p.durationDays} días · ${p.dailyCalorieTarget ? `${p.dailyCalorieTarget} kcal` : "Sin meta calórica"}`,
            })),
          );
        }
      } catch {
        setRoutineResults([]);
      } finally {
        setLoadingRoutines(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [routineSearch, assignmentType]);

  const handleSubmit = async () => {
    if (!patientId || !routineId || !startDate) return;

    setSaving(true);
    try {
      if (isEditing && assignment && onSubmit) {
        await onSubmit(
          {
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : null,
            frequency,
            status,
            notes: notes.trim() || null,
          },
          assignment.id,
        );
      } else {
        if (assignmentType === "routine" && onSubmit) {
          await onSubmit({
            patientId,
            routineId: routineId!,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : null,
            frequency,
            status,
            notes: notes.trim() || null,
          });
        } else {
          await createNutritionPlanAssignment({
            patientId,
            planId: routineId!,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : null,
            status,
            notes: notes.trim() || null,
          });
        }
        onCreated?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = patientId && routineId && startDate && !isSaving;

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div className="flex flex-col gap-4">
            {/* Picker de paciente */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("Paciente")} *</Label>
              {patientId && patientLabel ? (
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {patientLabel}
                  {!isEditing && (
                    <button
                      type="button"
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setPatientId(null);
                        setPatientLabel("");
                      }}
                    >
                      ×
                    </button>
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
                        setPatientId(null);
                        setPatientLabel("");
                        setPatientResults([]);
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  {loadingPatients && (
                    <p className="text-xs text-muted-foreground">{t("Buscando...")}</p>
                  )}
                  {patientResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted ${
                            patientId === p.id ? "bg-muted font-medium" : ""
                          }`}
                          onClick={() => {
                            setPatientId(p.id);
                            setPatientLabel(p.label);
                            setPatientSearch("");
                            setPatientResults([]);
                          }}
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

            {/* Tipo de asignación */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("Tipo de asignación")} *</Label>
              <Select
                value={assignmentType}
                onValueChange={(v: string | null) => {
                  if (!v) return;
                  setAssignmentType(v as "routine" | "nutrition");
                  // Limpiar selección al cambiar tipo
                  setRoutineId(null);
                  setRoutineLabel("");
                  setRoutineSearch("");
                  setRoutineResults([]);
                }}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">{t("Rutina de ejercicio")}</SelectItem>
                  <SelectItem value="nutrition">
                    {t("Plan de alimentación")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Picker de rutina o plan */}
            <div className="flex flex-col gap-1.5">
              <Label>
                {assignmentType === "routine"
                  ? t("Rutina de ejercicio *")
                  : t("Plan de alimentación *")}
              </Label>
              {routineId && routineLabel ? (
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {routineLabel}
                  {!isEditing && (
                    <button
                      type="button"
                      className="ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setRoutineId(null);
                        setRoutineLabel("");
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder={t("Buscar rutina por nombre...")}
                      value={routineSearch}
                      onChange={(e) => {
                        setRoutineSearch(e.target.value);
                        setRoutineId(null);
                        setRoutineLabel("");
                        setRoutineResults([]);
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  {loadingRoutines && (
                    <p className="text-xs text-muted-foreground">{t("Buscando...")}</p>
                  )}
                  {routineResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {routineResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted ${
                            routineId === r.id ? "bg-muted font-medium" : ""
                          }`}
                          onClick={() => {
                            setRoutineId(r.id);
                            setRoutineLabel(r.label);
                            setRoutineSearch("");
                            setRoutineResults([]);
                          }}
                        >
                          <span>{r.label}</span>
                          {r.sublabel && (
                            <span className="text-xs text-muted-foreground">
                              {r.sublabel}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {routineSearch.length >= 2 &&
                    !loadingRoutines &&
                    routineResults.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("No se encontraron rutinas activas.")}
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Fechas */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start-date">{t("Fecha de inicio")} *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end-date">{t("Fecha de fin")}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Frecuencia y estado */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t("Frecuencia")}</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as AssignmentFrequency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("Estado")}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as AssignmentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notas */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignment-notes">{t("Notas")}</Label>
              <Textarea
                id="assignment-notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNotes(e.target.value)
                }
                placeholder={t("Notas sobre la asignación...")}
                rows={2}
              />
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
          disabled={!canSubmit}
        >
          {saving
            ? t("Guardando...")
            : isEditing
              ? t("Guardar cambios")
              : t("Crear asignación")}
        </Button>
      </div>
    </div>
  );
}
