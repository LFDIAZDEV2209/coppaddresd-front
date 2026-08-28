"use client";

import { useState } from "react";
import {
  Users,
  RefreshCw,
  Pause,
  Play,
  UserMinus,
} from "lucide-react";
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
import { useProgramEnrollments } from "../hooks/use-program-enrollments";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_OPTIONS,
} from "../services/program-enrollments-service";
import { useAuth } from "@/providers/auth-provider";

export function ProgramEnrollmentsPage() {
  const { hasPermission } = useAuth();
  const canEnroll = hasPermission("Program.Enroll");

  const {
    result,
    loading,
    actionLoading,
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    pause,
    resume,
    withdraw,
    retry,
  } = useProgramEnrollments();

  const [pausing, setPausing] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [withdrawing, setWithdrawing] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Paused":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Withdrawn":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Inscripciones del programa"
        description="Gestiona las inscripciones de pacientes al programa de gamificación"
        icon={Users}
      />

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Filtros de inscripciones"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Inscripciones</h2>
            <p className="text-xs text-muted-foreground">
              Filtra por estado o ID de paciente.
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
            placeholder="Buscar por patientId..."
            value={filters.patientId}
            onChange={(e) => setFilters({ patientId: e.target.value })}
            className="h-9 w-full sm:max-w-xs"
          />
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
              {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <EnrollmentsSkeleton />
      ) : error ? (
        <EnrollmentsErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "inscripción" : "inscripciones"} disponibles`}
            description="Vista de tabla"
            icon={Users}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Template
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Semana</TableHead>
                  <TableHead className="hidden lg:table-cell">Racha</TableHead>
                  <TableHead className="hidden lg:table-cell">XP</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Inicio
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <span className="text-sm font-mono" title={enrollment.patientId}>
                        {enrollment.patientId.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">
                      {enrollment.templateId.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(enrollment.status)}>
                        {ENROLLMENT_STATUS_LABELS[enrollment.status] ??
                          enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {enrollment.currentWeekNumber} / {enrollment.totalWeeks}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {enrollment.streakCurrent}
                      <span className="text-muted-foreground">
                        {" "}
                        / máx {enrollment.streakLongest}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">
                      {enrollment.xpBalance.toLocaleString()} XP
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(enrollment.startedAt).toLocaleDateString(
                        "es-CO",
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEnroll && enrollment.status === "Active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Pausar"
                            onClick={() =>
                              setPausing({
                                id: enrollment.id,
                                name: enrollment.patientId.slice(0, 8),
                              })
                            }
                          >
                            <Pause className="size-4" />
                          </Button>
                        )}
                        {canEnroll && enrollment.status === "Paused" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-green-600"
                            title="Reanudar"
                            onClick={() => resume(enrollment.id)}
                          >
                            <Play className="size-4" />
                          </Button>
                        )}
                        {canEnroll &&
                          (enrollment.status === "Active" ||
                            enrollment.status === "Paused") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              title="Retirar"
                              onClick={() =>
                                setWithdrawing({
                                  id: enrollment.id,
                                  name: enrollment.patientId.slice(0, 8),
                                })
                              }
                            >
                              <UserMinus className="size-4" />
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
        <EnrollmentsEmptyState />
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
              aria-label="Inscripciones por página"
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

      {/* Confirmar pausa */}
      <AlertDialog
        open={Boolean(pausing)}
        onOpenChange={(open) => !open && setPausing(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-yellow-50 text-yellow-600">
            <Pause />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pausar inscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se pausará la inscripción del paciente &quot;{pausing?.name}
              &quot;. Podrá reanudarla más adelante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={actionLoading}
              onClick={async () => {
                if (pausing) await pause(pausing.id);
                setPausing(null);
              }}
            >
              Pausar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar retiro */}
      <AlertDialog
        open={Boolean(withdrawing)}
        onOpenChange={(open) => !open && setWithdrawing(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <UserMinus />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar inscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se retirará al paciente &quot;{withdrawing?.name}&quot; del
              programa. Esta acción es terminal y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (withdrawing) await withdraw(withdrawing.id);
                setWithdrawing(null);
              }}
            >
              Retirar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componentes ---

function EnrollmentsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="hidden h-5 w-20 md:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <div className="ml-auto flex gap-1">
            <Skeleton className="size-8 rounded" />
            <Skeleton className="size-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EnrollmentsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las inscripciones
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function EnrollmentsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">No hay inscripciones</p>
        <p className="text-xs text-muted-foreground">
          Las inscripciones de pacientes al programa aparecerán aquí.
        </p>
      </div>
    </div>
  );
}
