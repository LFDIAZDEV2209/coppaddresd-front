"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  RefreshCw,
  Pause,
  Play,
  UserMinus,
  UserPlus,
  Download,
  X,
  MoreHorizontal,
  ExternalLink,
  Flame,
} from "lucide-react";
import Link from "next/link";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgramEnrollments } from "../hooks/use-program-enrollments";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_OPTIONS,
  bulkEnrollPatients,
  exportEnrollmentsCsv,
} from "../services/program-enrollments-service";
import { useAuth } from "@/providers/auth-provider";
import { ProgramEnrollDialog } from "./program-enroll-dialog";
import { ProgramBulkEnrollDialog } from "./program-bulk-enroll-dialog";
import type { BulkEnrollResult } from "../types";

// --- Helpers de presentación ---

/** Clases de color por nivel de XP (espejo de XpLevels del backend). */
function levelColor(level: string): string {
  const map: Record<string, string> = {
    Explorador: "bg-slate-100 text-slate-700",
    Iniciado: "bg-blue-100 text-blue-700",
    Constante: "bg-cyan-100 text-cyan-700",
    Disciplinado: "bg-emerald-100 text-emerald-700",
    Transformación: "bg-amber-100 text-amber-700",
    Bienestar: "bg-purple-100 text-purple-700",
    Maestro: "bg-rose-100 text-rose-700",
  };
  return map[level] ?? "bg-gray-100 text-gray-700";
}

/** Iniciales del paciente para el avatar (p. ej. "María Pérez" → "MP"). */
function patientInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last =
    parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

/** Progreso semanal en porcentaje (0-100, acotado). */
function weekProgress(currentWeek: number, totalWeeks: number): number {
  if (totalWeeks <= 0) return 0;
  const pct = (currentWeek / totalWeeks) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function ProgramEnrollmentsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canEnroll = hasPermission("Program.Enroll");
  const canExport = hasPermission("Program.Export");

  const {
    result,
    loading,
    actionLoading,
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    enroll,
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
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [patientIdInput, setPatientIdInput] = useState(filters.patientId);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [bulkSummary, setBulkSummary] = useState<BulkEnrollResult | null>(
    null,
  );

  const handleBulkSubmit = async (input: Parameters<
    typeof bulkEnrollPatients
  >[0]) => {
    setBulkSaving(true);
    try {
      const result = await bulkEnrollPatients(input);
      setBulkSummary(result);
      if (result.created > 0) {
        retry();
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportEnrollmentsCsv({});
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "No pudimos exportar las inscripciones.",
      );
    } finally {
      setExporting(false);
    }
  };

  // Debounce del filtro de patientId: evita un request por tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientIdInput !== filters.patientId) {
        setFilters({ patientId: patientIdInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientIdInput, filters.patientId, setFilters]);

  const statusColor = (status: string) => {    switch (status) {
      case "Active":
        return "bg-success-soft text-success-foreground";
      case "Paused":
        return "bg-warning-soft text-warning";
      case "Completed":
        return "bg-info-soft text-info-foreground";
      case "Withdrawn":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
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
              Filtra por nombre/documento, estado o ID de paciente.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEnroll && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setEnrollOpen(true)}
                >
                  <UserPlus data-icon="inline-start" />
                  Inscribir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOpen(true)}
                >
                  <Users data-icon="inline-start" />
                  Inscripción masiva
                </Button>
              </>
            )}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download
                  data-icon="inline-start"
                  className={exporting ? "animate-pulse" : undefined}
                />
                {exporting ? "Exportando..." : "Exportar CSV"}
              </Button>
            )}
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
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar por nombre o documento..."
            value={filters.search ?? ""}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-9 w-full sm:max-w-xs"
          />
          <Input
            placeholder="Buscar por patientId..."
            value={patientIdInput}
            onChange={(e) => setPatientIdInput(e.target.value)}
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
                    Programa
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Semana</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Nivel / XP
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Racha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((enrollment) => {
                  const displayName =
                    enrollment.patientFullName ??
                    enrollment.patientName ??
                    enrollment.patient_name ??
                    null;
                  return (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                            {displayName
                              ? displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                              : patientInitials(enrollment.patientFullName ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          {displayName && enrollment.patientId ? (
                            <Link
                              href={`/program/gestion?view=perfil-360&patient=${enrollment.patientId}`}
                              className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                              title={enrollment.patientId}
                            >
                              {displayName}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-medium">
                              {displayName ?? enrollment.patientFullName ?? "Paciente"}
                            </span>
                          )}
                          <span className="truncate text-xs text-muted-foreground">
                            {enrollment.patientDocumentNumber ??
                              enrollment.patientId?.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {enrollment.templateName ? (
                        <Badge variant="outline" className="max-w-[160px] truncate text-xs font-medium">
                          {enrollment.templateName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex w-40 flex-col gap-1">
                        <span className="text-xs font-medium">
                          Semana {enrollment.currentWeekNumber} /{" "}
                          {enrollment.totalWeeks}
                        </span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${weekProgress(
                                enrollment.currentWeekNumber,
                                enrollment.totalWeeks,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col items-start gap-1">
                        <Badge
                          className={levelColor(enrollment.currentLevel ?? "")}
                        >
                          {enrollment.currentLevel ?? "—"}
                        </Badge>
                        <span className="text-xs font-medium">
                          {enrollment.xpBalance.toLocaleString()} XP
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <Flame className="size-3.5 text-orange-500" />
                        {enrollment.streakCurrent}
                        <span className="text-muted-foreground">
                          / máx {enrollment.streakLongest}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(enrollment.status)}>
                        {ENROLLMENT_STATUS_LABELS[enrollment.status] ??
                          enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/program/enrollments/${enrollment.id}`,
                            )
                          }
                        >
                          <ExternalLink className="size-3.5 mr-1" />
                          Ver detalle
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label="Acciones"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-48">
                            {displayName && enrollment.patientId && (
                              <DropdownMenuItem
                                onClick={() =>
                                  (window.location.href = `/program/gestion?view=perfil-360&patient=${enrollment.patientId}`)
                                }
                              >
                                Ver paciente
                              </DropdownMenuItem>
                            )}
                            {canEnroll && enrollment.status === "Active" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setPausing({
                                    id: enrollment.id,
                                    name: displayName ?? enrollment.patientFullName ?? enrollment.patientId.slice(0, 8),
                                  })
                                }
                              >
                                <Pause className="size-4" /> Pausar inscripción
                              </DropdownMenuItem>
                            )}
                            {canEnroll && enrollment.status === "Paused" && (
                              <DropdownMenuItem
                                onClick={() => resume(enrollment.id)}
                              >
                                <Play className="size-4" /> Reanudar
                              </DropdownMenuItem>
                            )}
                            {canEnroll &&
                              (enrollment.status === "Active" ||
                                enrollment.status === "Paused") && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setWithdrawing({
                                      id: enrollment.id,
                                      name: displayName ?? enrollment.patientFullName ?? enrollment.patientId.slice(0, 8),
                                    })
                                  }
                                >
                                  <UserMinus className="size-4" /> Retirar
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EnrollmentsEmptyState />
      )}

      {/* Paginación */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
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
              <option value={5}>5 por página</option>
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
          <AlertDialogMedia className="bg-warning-soft text-warning">
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
              className="bg-warning hover:bg-warning/90"
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

      {/* Inscribir paciente */}
      <ProgramEnrollDialog
        open={enrollOpen}
        saving={actionLoading}
        onOpenChange={setEnrollOpen}
        onSubmit={enroll}
      />

      {/* Inscripción masiva */}
      <ProgramBulkEnrollDialog
        open={bulkOpen}
        saving={bulkSaving}
        onOpenChange={setBulkOpen}
        onSubmit={handleBulkSubmit}
      />

      {/* Resumen del lote */}
      {bulkSummary && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
          role="status"
        >
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">
              Inscripción masiva: {bulkSummary.created}{" "}
              {bulkSummary.created === 1 ? "creada" : "creadas"}
              {bulkSummary.failed > 0 &&
                `, ${bulkSummary.failed} ${
                  bulkSummary.failed === 1 ? "fallo" : "fallos"
                }`}
              .
            </p>
            {bulkSummary.failed > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {bulkSummary.results
                  .filter((r) => r.error)
                  .slice(0, 5)
                  .map((r) => (
                    <li key={r.patientId} className="truncate">
                      {r.patientId.slice(0, 8)}…: {r.error}
                    </li>
                  ))}
                {bulkSummary.results.filter((r) => r.error).length > 5 && (
                  <li>… y más fallos.</li>
                )}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setBulkSummary(null)}
            aria-label="Cerrar resumen"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Error del exporte */}
      {exportError && (
        <div
          className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-4 text-sm text-destructive"
          role="alert"
        >
          <span className="min-w-0 flex-1">{exportError}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setExportError(null)}
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
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
