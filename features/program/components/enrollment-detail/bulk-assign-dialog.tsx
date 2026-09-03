"use client";

// Diálogo de asignación en bloque: aplica el mismo plan nutricional y/o
// rutina de ejercicio a un rango de días de la inscripción (UC-C2).
// Llama a PUT /api/v1/program/enrollments/{id}/content/range.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  NutritionPlanListItem,
  ExerciseRoutineListItem,
} from "@/features/wellness/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totalWeeks: number;
  availablePlans: NutritionPlanListItem[];
  availableRoutines: ExerciseRoutineListItem[];
  onSubmit: (
    from: number,
    to: number,
    planId: string | null,
    routineId: string | null,
  ) => Promise<void>;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  totalWeeks,
  availablePlans,
  availableRoutines,
  onSubmit,
}: Props) {
  const [fromWeek, setFromWeek] = useState(1);
  const [toWeek, setToWeek] = useState(totalWeeks);
  const [planId, setPlanId] = useState<string | null>(null);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rango inválido (o sin selección) → no permitir guardar
  const rangeInvalid =
    fromWeek < 1 || toWeek > totalWeeks || fromWeek > toWeek;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(fromWeek, toWeek, planId, routineId);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo aplicar la asignación en bloque.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar contenido en bloque</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="bulk-from-week">Día desde</Label>
              <Input
                id="bulk-from-week"
                type="number"
                min={1}
                max={toWeek}
                value={fromWeek}
                onChange={(e) => setFromWeek(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="bulk-to-week">Día hasta</Label>
              <Input
                id="bulk-to-week"
                type="number"
                min={fromWeek}
                max={totalWeeks}
                value={toWeek}
                onChange={(e) => setToWeek(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bulk-plan">Plan nutricional</Label>
            <Select
              value={planId ?? "none"}
              onValueChange={(v) => setPlanId(v === "none" ? null : v)}
            >
              <SelectTrigger id="bulk-plan" className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {availablePlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bulk-routine">Rutina de ejercicio</Label>
            <Select
              value={routineId ?? "none"}
              onValueChange={(v) => setRoutineId(v === "none" ? null : v)}
            >
              <SelectTrigger id="bulk-routine" className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {availableRoutines.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || rangeInvalid}>
            {saving ? "Guardando..." : "Aplicar a rango"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}