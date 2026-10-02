"use client";

/**
 * Formulario de edición horaria semanal (design.md decisiones 2–4): filas
 * Día + hora inicio + hora fin, selector "Agregar día" que excluye los días
 * ya usados, quitar fila por row, validación client-side (endTime >
 * startTime, máx. 7 filas) y Guardar (PUT total-replace) / Cancelar
 * (restaura el estado previo). Escape cancela, Enter guarda.
 */

import { useT } from "@/providers/i18n-provider";
import { useMemo } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAX_SCHEDULE_ROWS,
  WEEKDAY_KEYS,
  type ScheduleFormRow,
} from "../../types/schedule";

/** Horas default de la plataforma (igual que el wizard). */
const DEFAULT_START = "08:00";
const DEFAULT_END = "17:00";

/** Franja válida: end estrictamente posterior a start (compara "HH:mm"). */
function isValidRange(start: string, end: string) {
  return Boolean(start && end) && start < end;
}

interface ScheduleEditFormProps {
  rows: ScheduleFormRow[];
  onChange: (rows: ScheduleFormRow[]) => void;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function ScheduleEditForm({
  rows,
  onChange,
  isSaving,
  onSave,
  onCancel,
}: ScheduleEditFormProps) {
  const t = useT();

  /** Weekdays ya ocupados por otras filas (excluidos del selector). */
  const usedWeekdays = useMemo(
    () => new Set(rows.map((row) => row.weekday)),
    [rows],
  );
  const available = useMemo(
    () =>
      Object.entries(WEEKDAY_KEYS).filter(
        ([weekday]) => !usedWeekdays.has(Number(weekday)),
      ),
    [usedWeekdays],
  );

  const hasInvalidRange = rows.some(
    (row) => !isValidRange(row.startTime, row.endTime),
  );
  // Vacío también se puede guardar (equivale a borrar todos los horarios).
  const canSave = !isSaving && !hasInvalidRange;
  const canAdd = rows.length < MAX_SCHEDULE_ROWS && available.length > 0;

  /** Agrega una franja nueva el día elegido (excluye días usados). */
  const addRow = (weekday: number) => {
    if (usedWeekdays.has(weekday)) return;
    onChange([
      ...rows,
      { weekday, startTime: DEFAULT_START, endTime: DEFAULT_END },
    ]);
  };

  const removeRow = (weekday: number) => {
    onChange(rows.filter((row) => row.weekday !== weekday));
  };

  const updateTime = (
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div
      role="form"
      aria-label={t("Edición de horarios")}
      onKeyDown={(event) => {
        // Solo capturamos teclas sobre los inputs de hora: Escape cierra
        // selects/popovers propios y Enter activa botones, no hay que
        // interceptar esos eventos a nivel del formulario.
        if (!(event.target instanceof HTMLInputElement)) return;
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        } else if (event.key === "Enter" && !event.shiftKey && canSave) {
          event.preventDefault();
          onSave();
        }
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-xs text-muted-foreground">
        {t(
          "Define la disponibilidad del profesional; al guardar se reemplaza el set completo",
        )}
      </p>

      <div className="flex flex-col gap-2">
        {[...rows]
          .sort((a, b) => a.weekday - b.weekday)
          .map((row) => {
            const index = rows.indexOf(row);
            const invalidRange = !isValidRange(row.startTime, row.endTime);
            return (
              <div key={row.weekday}>
                <div
                  className={`flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2 ${
                    invalidRange ? "border-destructive" : "border-border"
                  }`}
                >
                  <span className="w-16 text-[13px] font-semibold">
                    {t(WEEKDAY_KEYS[row.weekday] ?? String(row.weekday))}
                  </span>
                  <Input
                    type="time"
                    value={row.startTime}
                    onChange={(event) =>
                      updateTime(index, "startTime", event.target.value)
                    }
                    aria-label={t("Hora inicio")}
                    className="w-32"
                    disabled={isSaving}
                  />
                  <span
                    className="text-xs text-muted-foreground"
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <Input
                    type="time"
                    value={row.endTime}
                    onChange={(event) =>
                      updateTime(index, "endTime", event.target.value)
                    }
                    aria-invalid={invalidRange}
                    aria-label={t("Hora fin")}
                    className="w-32"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
                    onClick={() => removeRow(row.weekday)}
                    aria-label={t("Eliminar")}
                    disabled={isSaving}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {invalidRange && (
                  <p className="mt-1 text-[12px] text-destructive" role="alert">
                    {t("La hora de fin debe ser posterior a la de inicio")}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {canAdd ? (
          <Select
            value=""
            onValueChange={(value) => value && addRow(Number(value))}
          >
            <SelectTrigger
              aria-label={t("Agregar franja")}
              className="h-9 w-full sm:w-44"
            >
              <SelectValue placeholder={t("Agregar franja")}>
                <span className="flex items-center gap-1.5">
                  <Plus className="size-3.5" aria-hidden="true" />
                  {t("Agregar franja")}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {available.map(([weekday, label]) => (
                <SelectItem key={weekday} value={weekday}>
                  {t(label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">
            {rows.length >= MAX_SCHEDULE_ROWS
              ? t("Máximo 7 franjas (una por día de la semana)")
              : null}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            {t("Cancelar")}
          </Button>
          <Button size="sm" onClick={() => void onSave()} disabled={!canSave}>
            {isSaving && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            {isSaving ? t("Guardando...") : t("Guardar")}
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground" role="status">
          {t("El profesional se guardará sin horarios")}
        </p>
      )}
    </div>
  );
}
