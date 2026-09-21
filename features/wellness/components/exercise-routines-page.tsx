"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, RefreshCw, Trash2, Eye, Pencil } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
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
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
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

  // Feedback tras crear en /wellness/exercise-routines/new (query ?creado=1)
  useEffect(() => {
    if (!window.location.search.includes("creado=1")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feedback post-creación (flag de URL), intencional
    setCreatedMessage(t("Rutina creada correctamente."));
    window.history.replaceState(null, "", "/wellness/exercise-routines");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-ocultar la confirmación tras unos segundos
  useEffect(() => {
    if (!createdMessage) return;
    const timer = setTimeout(() => setCreatedMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [createdMessage]);

  const openCreate = () => {
    router.push("/wellness/exercise-routines/new");
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
        title={t("Rutinas de ejercicio")}
        description={t("Gestiona las rutinas de ejercicio para tus pacientes")}
        icon={Dumbbell}
        actions={
          can("Wellness.Manage") ? (
            <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              {t("Nueva rutina")}
            </Button>
          ) : undefined
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
        aria-label={t("Filtros de rutinas")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("Rutinas de ejercicio")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("Filtra por categoría, estado o busca por nombre.")}
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
            {t("Actualizar")}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder={t("Buscar por nombre...")}
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
              <SelectValue placeholder={t("Categoría")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todas")}</SelectItem>
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
              <SelectValue placeholder={t("Estado")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos")}</SelectItem>
              <SelectItem value="Draft">{t("Borrador")}</SelectItem>
              <SelectItem value="Active">{t("Activo")}</SelectItem>
              <SelectItem value="Completed">{t("Completado")}</SelectItem>
              <SelectItem value="Archived">{t("Archivado")}</SelectItem>
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
            title={t("{count} rutinas disponibles", { count: String(result.total) })}
            description={t("Vista de tabla")}
            icon={Dumbbell}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Nombre")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("Categoría")}
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("Dificultad")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {t("Duración")}
                  </TableHead>
                  <TableHead>{t("Estado")}</TableHead>
                  <TableHead className="text-right">{t("Acciones")}</TableHead>
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
                          title={t("Ver detalles")}
                          onClick={() => setDetails(routine)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {can("Wellness.Manage") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title={t("Editar")}
                            onClick={() => openEdit(routine)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {can("Wellness.Manage") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            title={t("Eliminar")}
                            onClick={() => setDeleting(routine)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
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
            {t("Página {page} de {total}", { page: String(result.page), total: String(result.totalPages) })}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={result.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={t("Rutinas por página")}
            >
              <option value={10}>{t("10 por página")}</option>
              <option value={20}>{t("20 por página")}</option>
              <option value={50}>{t("50 por página")}</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                {t("Anterior")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                {t("Siguiente")}
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
          setCreatedMessage(t("Rutina creada y asignada a {patientName}", { patientName }))
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
            <AlertDialogTitle>{t("¿Eliminar rutina?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Se eliminará la rutina "{name}" y todos sus ejercicios. Esta acción no se puede deshacer.', { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id);
                setDeleting(undefined);
              }}
            >
              {t("Eliminar")}
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
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        {t("No pudimos cargar las rutinas")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
      </Button>
    </div>
  );
}

function RoutinesEmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();
  const { can } = useAppContext();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Dumbbell className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">{t("No hay rutinas de ejercicio")}</p>
        <p className="text-xs text-muted-foreground">
          {t("Crea tu primera rutina para asignarla a tus pacientes.")}
        </p>
      </div>
      {can("Wellness.Manage") && (
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          {t("Nueva rutina")}
        </Button>
      )}
    </div>
  );
}
