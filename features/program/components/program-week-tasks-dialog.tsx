"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  Salad,
  Dumbbell,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchEnrollmentWeek,
  replaceEnrollmentWeekTasks,
} from "../services/program-content-service";
import { fetchRoutinesForPicker } from "@/features/wellness/services/assignments-service";
import type {
  ProgramContentWeek,
  EnrollmentWeekResponse,
  EnrollmentWeekDay,
} from "../types";
import type { ExerciseRoutineListItem } from "@/features/wellness/types";

// --- Constantes de tareas ---

const AVAILABLE_TASK_CODES: Array<{ code: string; label: string; defaultPoints: number }> = [
  { code: "podcast", label: "Podcast educativo", defaultPoints: 80 },
  { code: "vitals", label: "Signos vitales", defaultPoints: 120 },
  { code: "nut", label: "Plan nutricional", defaultPoints: 150 },
  { code: "ejercicio", label: "Rutina de ejercicio", defaultPoints: 150 },
  { code: "nutribiotico", label: "Nutribiótico ADRED", defaultPoints: 80 },
  { code: "emocional", label: "Check-in emocional", defaultPoints: 120 },
];

function getTaskLabel(code: string): string {
  const found = AVAILABLE_TASK_CODES.find((t) => t.code === code);
  return found ? found.label : code;
}

/** Extrae "24 ago" de un date string "2026-08-24" (sin timezone drift) */
function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${d} ${months[m - 1]}`;
}

const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

// --- Interfaces de edición ---

interface EditableTaskItem {
  weekday: number;
  taskCode: string;
  points: number;
  sortOrder: number;
  routineId?: string | null;
}

// --- Sub-componente: celda de día en el Panorama Semanal (Modo Lectura) ---

function DayColumnRead({ day }: { day: EnrollmentWeekDay }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2.5">
      {/* Header del día */}
      <div className="flex flex-col border-b border-border/60 pb-1.5">
        <span className="text-xs font-bold text-foreground">
          {day.dayLabel}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {shortDate(day.localDate)}
        </span>
      </div>

      {/* Lista de tareas */}
      {day.tasks.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic py-2">Sin tareas</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {day.tasks.map((task) => {
            const isCompleted = task.status === "completed";
            const displayName = task.contentName || task.taskLabel;
            return (
              <li
                key={task.taskCode}
                className="flex flex-col gap-0.5 rounded-lg bg-card p-2 shadow-2xs border border-border/60 text-xs"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {isCompleted ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="size-3.5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className="font-semibold text-foreground truncate" title={displayName}>
                      {displayName}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[11px] tabular-nums ${isCompleted ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}
                  >
                    {isCompleted
                      ? `${task.points} XP`
                      : `${task.scheduledPoints} XP`}
                  </span>
                </div>
                {task.detailText && (
                  <span className="text-[10px] text-muted-foreground pl-5 truncate" title={task.detailText}>
                    {task.detailText}
                  </span>
                )}
                {task.contentName && (
                  <span className="text-[9px] text-primary/80 font-medium pl-5 uppercase tracking-wider">
                    {task.taskLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer: total del día + badges */}
      {day.tasks.length > 0 && (
        <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-1.5">
          <span className="text-[10px] font-semibold text-foreground">
            Total: {day.totalPoints}/{day.maxPoints} XP
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {day.bonusAwarded > 0 && (
              <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0">
                +{day.bonusAwarded} bonus
              </Badge>
            )}
            {day.isPerfectDay && (
              <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1 py-0">
                Día perfecto
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Componente principal del dialog ---

interface WeekTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: ProgramContentWeek;
  enrollmentId: string;
}

export function WeekTasksDialog({
  open,
  onOpenChange,
  week,
  enrollmentId,
}: WeekTasksDialogProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const [data, setData] = useState<EnrollmentWeekResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("1");

  const [availableRoutines, setAvailableRoutines] = useState<ExerciseRoutineListItem[]>([]);
  const [editableTasks, setEditableTasks] = useState<EditableTaskItem[]>([]);
  const initializedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEnrollmentWeek(enrollmentId, week.weekNumber);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las tareas",
      );
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, week.weekNumber]);

  // Cargar datos al abrir
  useEffect(() => {
    if (open && (!initializedRef.current || data === null)) {
      initializedRef.current = true;
      fetchData();
    }
  }, [open, data, fetchData]);

  // Cargar catálogo de rutinas para el modo edición
  useEffect(() => {
    if (!open) return;
    fetchRoutinesForPicker(1, 100, "")
      .then((res) => setAvailableRoutines(res.data))
      .catch(() => {});
  }, [open]);

  // Asegurar que la rutina general asignada a la semana esté en la lista
  const allRoutines = [...availableRoutines];
  if (week.exerciseRoutine && !allRoutines.some((r) => r.id === week.exerciseRoutine!.id)) {
    allRoutines.unshift({
      id: week.exerciseRoutine.id,
      name: week.exerciseRoutine.name,
      category: "Asignada",
      difficulty: "",
    } as ExerciseRoutineListItem);
  }

  // Reiniciar estado al cerrar
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setEditing(false);
        setActiveTab("1");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  // Iniciar modo edición
  const handleStartEdit = useCallback(() => {
    if (!data) return;
    const initial: EditableTaskItem[] = [];
    data.days.forEach((day) => {
      day.tasks.forEach((t, idx) => {
        initial.push({
          weekday: day.weekday,
          taskCode: t.taskCode,
          points: t.scheduledPoints,
          sortOrder: idx + 1,
          routineId: t.routineId ?? t.contentRefId ?? null,
        });
      });
    });
    setEditableTasks(initial);
    setEditing(true);
  }, [data]);

  // Handlers de edición por día
  const handleAddTask = useCallback((weekday: number, taskCode: string) => {
    const meta = AVAILABLE_TASK_CODES.find((t) => t.code === taskCode);
    const defaultPoints = meta ? meta.defaultPoints : 100;
    setEditableTasks((prev) => {
      const dayTasks = prev.filter((t) => t.weekday === weekday);
      return [
        ...prev,
        {
          weekday,
          taskCode,
          points: defaultPoints,
          sortOrder: dayTasks.length + 1,
          routineId: null,
        },
      ];
    });
  }, []);

  const handleRemoveTask = useCallback((weekday: number, taskCode: string) => {
    setEditableTasks((prev) =>
      prev.filter((t) => !(t.weekday === weekday && t.taskCode === taskCode)),
    );
  }, []);

  const handleUpdatePoints = useCallback(
    (weekday: number, taskCode: string, points: number) => {
      setEditableTasks((prev) =>
        prev.map((t) =>
          t.weekday === weekday && t.taskCode === taskCode
            ? { ...t, points }
            : t,
        ),
      );
    },
    [],
  );

  const handleUpdateRoutine = useCallback(
    (weekday: number, taskCode: string, routineId: string | null) => {
      setEditableTasks((prev) =>
        prev.map((t) =>
          t.weekday === weekday && t.taskCode === taskCode
            ? { ...t, routineId }
            : t,
        ),
      );
    },
    [],
  );

  // --- Atajos de copia rápida en Modo Edición ---

  const handleCopyDayToAllWeek = useCallback((sourceWeekday: number) => {
    setEditableTasks((prev) => {
      const sourceTasks = prev.filter((t) => t.weekday === sourceWeekday);
      const newTasks: EditableTaskItem[] = [];
      for (let day = 1; day <= 7; day++) {
        sourceTasks.forEach((st, idx) => {
          newTasks.push({
            weekday: day,
            taskCode: st.taskCode,
            points: st.points,
            sortOrder: idx + 1,
            routineId: st.routineId ?? null,
          });
        });
      }
      return newTasks;
    });
  }, []);

  const handleCopyDayToWeekdays = useCallback((sourceWeekday: number) => {
    setEditableTasks((prev) => {
      const sourceTasks = prev.filter((t) => t.weekday === sourceWeekday);
      const weekendTasks = prev.filter((t) => t.weekday > 5);
      const newTasks: EditableTaskItem[] = [...weekendTasks];

      for (let day = 1; day <= 5; day++) {
        sourceTasks.forEach((st, idx) => {
          newTasks.push({
            weekday: day,
            taskCode: st.taskCode,
            points: st.points,
            sortOrder: idx + 1,
            routineId: st.routineId ?? null,
          });
        });
      }
      return newTasks;
    });
  }, []);

  // Guardar tareas editadas
  const handleSaveTasks = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = editableTasks.map((t) => ({
        weekday: t.weekday,
        taskCode: t.taskCode,
        points: t.points,
        sortOrder: t.sortOrder,
        routineId: t.routineId ?? null,
      }));
      const result = await replaceEnrollmentWeekTasks(
        enrollmentId,
        week.weekNumber,
        payload,
      );
      setData(result);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar las tareas",
      );
    } finally {
      setSaving(false);
    }
  }, [enrollmentId, week.weekNumber, editableTasks]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                Semana {week.weekNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Ventana local: {week.weekStartDateLocal} — {week.weekEndDateLocal}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && !editing && !loading && data && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleStartEdit}
                  className="gap-1.5 shadow-xs"
                >
                  <Edit2 className="size-3.5" />
                  Editar tareas de la semana
                </Button>
              )}
            </div>
          </div>

          {/* Badges superiores de plan y rutina general */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border/40">
            {week.nutritionPlan ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Salad className="mr-1 size-3" />
                Plan: {week.nutritionPlan.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-dashed text-xs">
                Sin plan nutricional asignado
              </Badge>
            )}

            {week.exerciseRoutine ? (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                <Dumbbell className="mr-1 size-3" />
                Rutina general: {week.exerciseRoutine.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-dashed text-xs">
                Sin rutina general asignada
              </Badge>
            )}

            {editing && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                Modo edición activo (Vista por pestañas)
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Cuerpo del Dialog */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col gap-3 py-6">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="grid grid-cols-7 gap-2 mt-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-12 text-center my-4">
              <p className="text-sm font-semibold text-destructive">
                No pudimos cargar el horario de tareas
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Reintentar
              </Button>
            </div>
          ) : !editing ? (
            /* --- MODO SOLO LECTURA: PANORAMA SEMANAL COMPLETO (7 DÍAS SIMULTÁNEOS) --- */
            data && data.days.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Panorama Semanal Completo (7 Días)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Vista panorámica completa en solo lectura
                  </span>
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 min-w-[760px]">
                    {data.days.map((day) => (
                      <DayColumnRead key={day.localDate} day={day} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Sin tareas configuradas para esta semana
                </p>
              </div>
            )
          ) : (
            /* --- MODO EDICIÓN: VISTA ENFOCADA POR PESTAÑAS (TABS) --- */
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full flex flex-col gap-4"
            >
              {/* Barra de pestañas para los 7 días */}
              <TabsList className="w-full justify-start overflow-x-auto bg-muted/60 p-1 rounded-xl">
                {[1, 2, 3, 4, 5, 6, 7].map((wDay) => {
                  const count = editableTasks.filter((t) => t.weekday === wDay).length;

                  return (
                    <TabsTrigger
                      key={wDay}
                      value={String(wDay)}
                      className="px-3 py-1.5 text-xs font-semibold data-active:bg-card data-active:shadow-xs rounded-lg"
                    >
                      <span>{DAY_LABELS[wDay]}</span>
                      <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-bold">
                        {count}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Panel por cada día */}
              {[1, 2, 3, 4, 5, 6, 7].map((wDay) => {
                const dayData = data?.days.find((d) => d.weekday === wDay);
                const dayTasks = editableTasks.filter((t) => t.weekday === wDay);

                const dayDateStr = dayData ? shortDate(dayData.localDate) : "";
                const existingCodes = new Set(dayTasks.map((t) => t.taskCode));
                const availableToAdd = AVAILABLE_TASK_CODES.filter(
                  (t) => !existingCodes.has(t.code),
                );

                return (
                  <TabsContent
                    key={wDay}
                    value={String(wDay)}
                    className="flex flex-col gap-4"
                  >
                    {/* Encabezado del Día */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          {DAY_LABELS[wDay]}
                          {dayDateStr && (
                            <span className="text-xs font-normal text-muted-foreground">
                              ({dayDateStr})
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {dayTasks.length} misiones programadas para este día
                        </p>
                      </div>

                      {/* Botones de acción rápida de copia */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyDayToWeekdays(wDay)}
                          className="h-7 text-xs gap-1 border-dashed"
                          title="Copiar las misiones de este día a Lunes-Viernes"
                        >
                          <Copy className="size-3" />
                          Copiar a Lun-Vie
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyDayToAllWeek(wDay)}
                          className="h-7 text-xs gap-1 border-dashed"
                          title="Copiar las misiones de este día a todos los 7 días de la semana"
                        >
                          <Copy className="size-3" />
                          Copiar a toda la semana
                        </Button>
                      </div>
                    </div>

                    {/* Lista amplia de tareas en tarjetas */}
                    {dayTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center bg-muted/10">
                        <p className="text-sm font-medium text-muted-foreground">
                          Sin misiones configuradas para el {DAY_LABELS[wDay]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Usa el selector desplegable de abajo para agregar una nueva misión.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dayTasks.map((editTask) => {
                          const taskCode = editTask.taskCode;
                          const label = getTaskLabel(taskCode);

                          return (
                            <div
                              key={taskCode}
                              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-colors"
                            >
                              {/* Título de la tarea + Eliminar */}
                              <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
                                <span className="font-bold text-sm text-foreground">
                                  {label}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveTask(wDay, taskCode)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted"
                                  title="Eliminar misión"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>

                              {/* Detalle y configuración en Modo Edición */}
                              <div className="flex flex-col gap-3 text-xs pt-1">
                                {/* Si la tarea es Ejercicio: Selector de rutina específica */}
                                {taskCode === "ejercicio" && (() => {
                                  const editTaskRoutineName = editTask.routineId
                                    ? (allRoutines.find((r) => r.id === editTask.routineId)?.name ?? "Rutina seleccionada")
                                    : (week.exerciseRoutine ? `Usar rutina general (${week.exerciseRoutine.name})` : "Usar rutina general de la semana");

                                  return (
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-xs font-semibold text-foreground">
                                        Rutina de ejercicio específica para {DAY_LABELS[wDay]}:
                                      </label>
                                      <Select
                                        value={editTask.routineId ?? "default"}
                                        onValueChange={(val) =>
                                          handleUpdateRoutine(
                                            wDay,
                                            taskCode,
                                            val === "default" ? null : val,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-full text-xs h-9 bg-muted/40">
                                          <SelectValue placeholder="Usar rutina general">
                                            {editTaskRoutineName}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value="default"
                                            textValue={week.exerciseRoutine ? `Rutina general (${week.exerciseRoutine.name})` : "Usar rutina general de la semana"}
                                            className="text-xs text-muted-foreground italic"
                                          >
                                            {week.exerciseRoutine
                                              ? `Usar rutina general de la semana (${week.exerciseRoutine.name})`
                                              : "Usar rutina general de la semana"}
                                          </SelectItem>
                                          {allRoutines.map((r) => (
                                            <SelectItem
                                              key={r.id}
                                              value={r.id}
                                              textValue={r.name}
                                              className="text-xs font-medium"
                                            >
                                              <span className="font-semibold">{r.name}</span>
                                              {r.category && (
                                                <span className="text-[10px] text-muted-foreground ml-1.5">
                                                  · {r.category}
                                                </span>
                                              )}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })()}

                                {/* Configuración de Puntos XP */}
                                <div className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                                  <span className="font-medium text-muted-foreground">Puntos XP a otorgar:</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={1000}
                                    value={editTask.points}
                                    onChange={(e) =>
                                      handleUpdatePoints(
                                        wDay,
                                        taskCode,
                                        Math.max(0, parseInt(e.target.value) || 0),
                                      )
                                    }
                                    className="h-7 w-20 px-2 text-right text-xs font-bold bg-card"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Agregar tarea al día en Modo Edición */}
                    {availableToAdd.length > 0 && (
                      <div className="mt-2">
                        <Select
                          value=""
                          onValueChange={(val) => {
                            if (val) handleAddTask(wDay, val);
                          }}
                        >
                          <SelectTrigger className="w-full h-9 text-xs bg-card border-dashed">
                            <Plus className="mr-1.5 size-4 text-primary" />
                            <span>Agregar nueva misión para el {DAY_LABELS[wDay]}...</span>
                          </SelectTrigger>
                          <SelectContent>
                            {availableToAdd.map((t) => (
                              <SelectItem key={t.code} value={t.code} textValue={t.label} className="text-xs">
                                {t.label} ({t.defaultPoints} XP)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>

        {/* Footer del Dialog */}
        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border pt-3 mt-2">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                <X className="mr-1 size-3.5" />
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={saving}
                onClick={handleSaveTasks}
                className="gap-1.5 px-4 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Guardar tareas de la semana
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
