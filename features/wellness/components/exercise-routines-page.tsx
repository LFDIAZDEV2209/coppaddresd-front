"use client";

import { useState, useEffect } from "react";
import { Dumbbell, Plus, RefreshCw, Trash2, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useExerciseRoutines } from "../hooks/use-exercise-routines";
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_COLORS,
  CATEGORY_COLORS,
} from "../services/exercise-routines-service";
import { PLAN_STATUS_LABELS } from "../services/nutrition-plans-service";
import { ExerciseRoutineFormDialog } from "./exercise-routine-form";
import { ExerciseRoutineDetailDialog } from "./exercise-routine-detail";
import type { ExerciseRoutineListItem } from "../types";

export function ExerciseRoutinesPage() {
  const {
    result,
    loading,
    actionLoading,
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    getRoutine,
    save,
    remove,
    retry,
  } = useExerciseRoutines();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseRoutineListItem | undefined>();
  const [details, setDetails] = useState<ExerciseRoutineListItem | undefined>();
  const [deleting, setDeleting] = useState<
    ExerciseRoutineListItem | undefined
  >();
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  // Auto-ocultar la confirmación tras unos segundos
  useEffect(() => {
    if (!createdMessage) return;
    const timer = setTimeout(() => setCreatedMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [createdMessage]);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (routine: ExerciseRoutineListItem) => {
    setEditing(routine);
    setFormOpen(true);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Rutinas de ejercicio"
        description="Gestiona las rutinas de ejercicio para tus pacientes"
        icon={Dumbbell}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Nueva rutina
          </Button>
        }
      />

      {/* Confirmación de creación asignada */}
      {createdMessage && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {createdMessage}
        </p>
      )}

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Filtros de rutinas"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Rutinas de ejercicio</h2>
            <p className="text-xs text-muted-foreground">
              Filtra por categoría, estado o busca por nombre.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={loading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar por nombre..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-9 w-full sm:max-w-xs"
          />
          <Select
            value={filters.category}
            onValueChange={(v) =>
              setFilters({ category: v as typeof filters.category })
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) =>
              setFilters({ status: v as typeof filters.status })
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Draft">Borrador</SelectItem>
              <SelectItem value="Active">Activo</SelectItem>
              <SelectItem value="Completed">Completado</SelectItem>
              <SelectItem value="Archived">Archivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <RoutinesSkeleton />
      ) : error ? (
        <RoutinesErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "rutina" : "rutinas"} disponibles`}
            description="Vista de tabla"
            icon={Dumbbell}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Categoría
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Dificultad
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Duración
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((routine) => (
                  <TableRow key={routine.id}>
                    <TableCell>
                      <div className="flex max-w-[280px] flex-col">
                        <span
                          className="truncate font-medium"
                          title={routine.name}
                        >
                          {routine.name}
                        </span>
                        {routine.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {routine.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        className={CATEGORY_COLORS[routine.category] ?? ""}
                      >
                        {routine.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        className={DIFFICULTY_COLORS[routine.difficulty] ?? ""}
                      >
                        {routine.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {routine.estimatedMinutes
                        ? `${routine.estimatedMinutes} min`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(routine.status)}>
                        {PLAN_STATUS_LABELS[routine.status] ?? routine.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Ver detalles"
                          onClick={() => setDetails(routine)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Editar"
                          onClick={() => openEdit(routine)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          title="Eliminar"
                          onClick={() => setDeleting(routine)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <RoutinesEmptyState onCreate={openCreate} />
      )}

      {/* Paginación */}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {result.page} de {result.totalPages}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={result.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rutinas por página"
            >
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ExerciseRoutineFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        routine={editing}
        saving={actionLoading}
        onOpenChange={setFormOpen}
        onSubmit={save}
        onCreated={(patientName) =>
          setCreatedMessage(`Rutina creada y asignada a ${patientName}`)
        }
      />

      <ExerciseRoutineDetailDialog
        key={details?.id ?? "closed"}
        routineId={details?.id ?? null}
        onClose={() => setDetails(undefined)}
        getRoutine={getRoutine}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la rutina &quot;{deleting?.name}&quot; y todos sus
              ejercicios. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id);
                setDeleting(undefined);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componentes ---

function RoutinesSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-5 w-20 md:block" />
          <Skeleton className="hidden h-5 w-20 md:block" />
          <Skeleton className="hidden h-4 w-16 lg:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="ml-auto flex gap-1">
            <Skeleton className="size-8 rounded" />
            <Skeleton className="size-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoutinesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las rutinas
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function RoutinesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Dumbbell className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">No hay rutinas de ejercicio</p>
        <p className="text-xs text-muted-foreground">
          Crea tu primera rutina para asignarla a tus pacientes.
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus data-icon="inline-start" />
        Nueva rutina
      </Button>
    </div>
  );
}
