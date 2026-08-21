"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type {
  RoutineAssignment,
  CreateRoutineAssignmentInput,
  UpdateRoutineAssignmentInput,
  CreateNutritionPlanAssignmentInput,
  AssignmentFrequency,
  AssignmentStatus,
} from "../types";
import {
  FREQUENCY_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  fetchPatientsForPicker,
  fetchRoutinesForPicker,
  fetchNutritionPlansForPicker,
  createNutritionPlanAssignment,
} from "../services/assignments-service";

interface AssignmentFormDialogProps {
  open: boolean;
  assignment?: RoutineAssignment;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AssignmentFormDialog({
  open,
  assignment,
  saving: savingProp,
  onOpenChange,
  onSubmit,
  onCreated,
}: AssignmentFormDialogProps) {
  const isEditing = Boolean(assignment);
  const [saving, setSaving] = useState(false);
  const isSaving = savingProp ?? saving;

  // Form state
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [routineLabel, setRoutineLabel] = useState("");
  const [assignmentType, setAssignmentType] = useState<"routine" | "nutrition">("routine");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<AssignmentFrequency>("Diaria");
  const [status, setStatus] = useState<AssignmentStatus>("Active");
  const [notes, setNotes] = useState("");

  // Picker state
  const [patientSearch, setPatientSearch] = useState("");
  const [routineSearch, setRoutineSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PickerItem[]>([]);
  const [routineResults, setRoutineResults] = useState<PickerItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(false);

  // Initialize form
  useEffect(() => {
    if (assignment) {
      setPatientId(assignment.patientId);
      setPatientLabel(assignment.patientName ?? "");
      setRoutineId(assignment.routineId);
      setRoutineLabel(assignment.routineName ?? "");
      setStartDate(assignment.startDate.split("T")[0]);
      setEndDate(assignment.endDate?.split("T")[0] ?? "");
      setFrequency(assignment.frequency);
      setStatus(assignment.status);
      setNotes(assignment.notes ?? "");
    } else {
      setPatientId(null);
      setPatientLabel("");
      setRoutineId(null);
      setRoutineLabel("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setFrequency("Diaria");
      setStatus("Active");
      setNotes("");
      setPatientSearch("");
      setRoutineSearch("");
      setPatientResults([]);
      setRoutineResults([]);
    }
  }, [assignment, open]);

  // Debounced patient search
  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientResults([]);
      return;
    }

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
    if (routineSearch.trim().length < 2) {
      setRoutineResults([]);
      return;
    }

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
          const { fetchNutritionPlansForPicker } = await import(
            "../services/assignments-service"
          );
          const result = await fetchNutritionPlansForPicker(1, 10, routineSearch);
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

    onOpenChange(false);
  };

  const canSubmit = patientId && routineId && startDate && !isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar asignación" : "Nueva asignación"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la asignación."
              : "Asigna una rutina de ejercicio a un paciente."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4 py-2">
            {/* Picker de paciente */}
            <div className="flex flex-col gap-1.5">
              <Label>Paciente *</Label>
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
                      placeholder="Buscar paciente por nombre..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setPatientId(null);
                        setPatientLabel("");
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  {loadingPatients && (
                    <p className="text-xs text-muted-foreground">Buscando...</p>
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
                        No se encontraron pacientes.
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Tipo de asignación */}
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de asignación *</Label>
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
                  <SelectItem value="routine">Rutina de ejercicio</SelectItem>
                  <SelectItem value="nutrition">Plan de alimentación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Picker de rutina o plan */}
            <div className="flex flex-col gap-1.5">
              <Label>
                {assignmentType === "routine"
                  ? "Rutina de ejercicio *"
                  : "Plan de alimentación *"}
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
                      placeholder="Buscar rutina por nombre..."
                      value={routineSearch}
                      onChange={(e) => {
                        setRoutineSearch(e.target.value);
                        setRoutineId(null);
                        setRoutineLabel("");
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  {loadingRoutines && (
                    <p className="text-xs text-muted-foreground">Buscando...</p>
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
                        No se encontraron rutinas activas.
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Fechas */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start-date">Fecha de inicio *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end-date">Fecha de fin</Label>
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
                <Label>Frecuencia</Label>
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
                <Label>Estado</Label>
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
              <Label htmlFor="assignment-notes">Notas</Label>
              <Textarea
                id="assignment-notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Notas sobre la asignación..."
                rows={2}
              />
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
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear asignación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
