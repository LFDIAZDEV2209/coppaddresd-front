"use client";

import { useState, useEffect } from "react";
import { Pencil, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ProgramTemplate,
  WeeklyDayTask,
  WeeklyDayTaskInput,
} from "../types";
import {
  TEMPLATE_STATUS_LABELS,
  TASK_CODE_OPTIONS,
  WEEKDAY_LABELS,
} from "../services/program-templates-service";
import { useAuth } from "@/providers/auth-provider";

interface ProgramTemplateDetailDialogProps {
  templateId: string | null;
  onClose: () => void;
  getTemplate: (id: string) => Promise<ProgramTemplate | null>;
  saveWeekdayTasks: (id: string, tasks: WeeklyDayTaskInput[]) => Promise<void>;
}

export function ProgramTemplateDetailDialog({
  templateId,
  onClose,
  getTemplate,
  saveWeekdayTasks,
}: ProgramTemplateDetailDialogProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const [template, setTemplate] = useState<ProgramTemplate | null>(null);
  const [loading, setLoading] = useState(Boolean(templateId));
  const [editing, setEditing] = useState(false);
  const [editDays, setEditDays] = useState<WeeklyDayTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;

    let cancelled = false;

    getTemplate(templateId).then((data) => {
      if (!cancelled) {
        setTemplate(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [templateId, getTemplate]);

  const startEditing = () => {
    if (template) {
      setEditDays([...template.days]);
      setEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveError(null);
    if (template) setEditDays([...template.days]);
  };

  const persistWeekdayTasks = async () => {
    if (!template) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: WeeklyDayTaskInput[] = editDays.map((d) => ({
        weekday: d.weekday,
        taskCode: d.taskCode,
        points: d.points,
        sortOrder: d.sortOrder,
        mediaId: d.mediaId,
      }));
      await saveWeekdayTasks(template.id, payload);
      // Recargar datos frescos del servidor
      const refreshed = await getTemplate(template.id);
      if (refreshed) setTemplate(refreshed);
      setEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Error al guardar el horario. Intentá de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (
    index: number,
    field: keyof WeeklyDayTask,
    value: string | number,
  ) => {
    setEditDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    );
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success-soft text-success-foreground";
      case "Draft":
        return "bg-warning-soft text-warning";
      case "Archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Agrupar tareas por weekday
  const groupedByDay = (days: WeeklyDayTask[]) => {
    const groups: Record<number, WeeklyDayTask[]> = {};
    for (const d of days) {
      if (!groups[d.weekday]) groups[d.weekday] = [];
      groups[d.weekday].push(d);
    }
    return groups;
  };

  const open = Boolean(templateId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalle de plantilla</DialogTitle>
          <DialogDescription>
            Vista de la plantilla y su horario semanal de tareas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : template ? (
          <div className="flex flex-col gap-4">
            {/* Encabezado */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{template.name}</span>
                <Badge className={statusColor(template.status)}>
                  {TEMPLATE_STATUS_LABELS[template.status] ?? template.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Código: <span className="font-mono">{template.code}</span> ·{" "}
                {template.totalWeeks} {template.totalWeeks === 1 ? "semana" : "semanas"} ({template.totalWeeks * 7} días) · v{template.version}
              </p>
              {template.description && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>

            {/* Horario semanal */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Horario semanal</h3>
              {canEdit && template.status === "Draft" && !editing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil data-icon="inline-start" />
                  Editar horario
                </Button>
              )}
              {editing && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      <X data-icon="inline-start" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={persistWeekdayTasks}
                      disabled={saving}
                    >
                      <Save data-icon="inline-start" />
                      {saving ? "Guardando…" : "Guardar"}
                    </Button>
                  </div>
                  {saveError && (
                    <p className="text-xs text-destructive">{saveError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Día</TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead className="w-24 text-right">Puntos</TableHead>
                    <TableHead className="w-20 text-right">Orden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editing
                    ? editDays.map((day, idx) => (
                        <TableRow key={`${day.id}-${idx}`}>
                          <TableCell className="font-medium">
                            {WEEKDAY_LABELS[day.weekday] ?? `Día ${day.weekday}`}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={day.taskCode}
                              onValueChange={(v) =>
                                updateDay(idx, "taskCode", v ?? day.taskCode)
                              }
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TASK_CODE_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <input
                              type="number"
                              min={0}
                              className="h-8 w-16 rounded border border-input bg-background px-2 text-right text-sm"
                              value={day.points}
                              onChange={(e) =>
                                updateDay(
                                  idx,
                                  "points",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <input
                              type="number"
                              min={0}
                              className="h-8 w-14 rounded border border-input bg-background px-2 text-right text-sm"
                              value={day.sortOrder}
                              onChange={(e) =>
                                updateDay(
                                  idx,
                                  "sortOrder",
                                  Number(e.target.value),
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    : Object.entries(groupedByDay(template.days)).map(
                        ([weekday, days]) => (
                          <TableRow key={weekday}>
                            <TableCell className="font-medium">
                              {WEEKDAY_LABELS[Number(weekday)] ??
                                `Día ${weekday}`}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {days.map((d) => (
                                  <span key={d.id} className="text-sm">
                                    {TASK_CODE_OPTIONS.find(
                                      (o) => o.value === d.taskCode,
                                    )?.label ?? d.taskCode}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col gap-1 text-sm">
                                {days.map((d) => (
                                  <span key={d.id}>{d.points}</span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                {days.map((d) => (
                                  <span key={d.id}>{d.sortOrder}</span>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se pudo cargar la plantilla.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
