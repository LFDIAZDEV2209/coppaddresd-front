"use client";

import { useState } from "react";
import {
  Activity,
  RefreshCw,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useInterventions } from "../hooks/use-interventions";
import { useAuth } from "@/providers/auth-provider";
import type { Intervention, InterventionStatus } from "../types/interventions";

// --- Configuración de estados ---

const STATUS_OPTIONS: { value: InterventionStatus; label: string }[] = [
  { value: "evaluated", label: "Evaluada" },
  { value: "recommended", label: "Recomendada" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completada" },
  { value: "reevaluation", label: "Reevaluación" },
];

const STATUS_COLOR: Record<string, string> = {
  detected: "bg-warning-soft text-warning",
  evaluated: "bg-info-soft text-info-foreground",
  recommended: "bg-primary-soft text-primary",
  accepted: "bg-primary-soft text-primary",
  in_progress: "bg-warning-soft text-warning",
  completed: "bg-success-soft text-success-foreground",
  reevaluation: "bg-warning-soft text-warning",
};

const STATUS_LABELS: Record<string, string> = {
  detected: "Detectada",
  evaluated: "Evaluada",
  recommended: "Recomendada",
  accepted: "Aceptada",
  in_progress: "En progreso",
  completed: "Completada",
  reevaluation: "Reevaluación",
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning-soft text-warning",
  high: "bg-warning-soft text-warning",
  critical: "bg-destructive-soft text-destructive",
};

/** Estados que requieren campo `result` al transicionar. */
const REQUIRES_RESULT: InterventionStatus[] = ["completed"];
/** Estados que muestran `assignedTo` como opcional. */
const SHOW_ASSIGNED_TO: InterventionStatus[] = [
  "in_progress",
  "completed",
];

// --- Componente principal ---

export function ProgramInterventionsPage() {
  const { hasPermission } = useAuth();
  const canAdapt = hasPermission("Program.Adapt");

  const {
    result,
    loading,
    actionLoading,
    error,
    setPage,
    setPageSize,
    updateStatus,
    retry,
  } = useInterventions();

  // Estado del dialog de transición
  const [transitioning, setTransitioning] = useState<{
    intervention: Intervention;
    newStatus: InterventionStatus;
  } | null>(null);
  const [transitionResult, setTransitionResult] = useState("");
  const [transitionAssignedTo, setTransitionAssignedTo] = useState("");

  const handleTransition = async () => {
    if (!transitioning) return;
    const { intervention, newStatus } = transitioning;
    const extra: { result?: string; assignedTo?: string } = {};
    if (transitionResult.trim()) extra.result = transitionResult.trim();
    if (transitionAssignedTo.trim()) extra.assignedTo = transitionAssignedTo.trim();
    await updateStatus(intervention.id, newStatus, Object.keys(extra).length ? extra : undefined);
    setTransitioning(null);
    setTransitionResult("");
    setTransitionAssignedTo("");
  };

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("es-CO") : "—";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Cola de intervenciones"
        description="Gestiona las intervenciones abiertas de los pacientes"
        icon={Activity}
      />

      {/* Barra de filtros / acciones */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Cola de intervenciones"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Intervenciones abiertas</h2>
            <p className="text-xs text-muted-foreground">
              Intervenciones con estado distinto de &quot;completada&quot; que
              esperan decisión clínica.
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
      </section>

      {/* Contenido */}
      {loading ? (
        <InterventionsSkeleton />
      ) : error ? (
        <InterventionsErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "intervención" : "intervenciones"} abiertas`}
            description="Vista de tabla"
            icon={Activity}
            variant="primary"
          />
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="min-w-[220px]">Título</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead className="hidden md:table-cell">Paciente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell whitespace-nowrap">Recomendada</TableHead>
                  <TableHead className="hidden lg:table-cell whitespace-nowrap">Completada</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">XP</TableHead>
                  <TableHead className="w-10 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((intervention) => (
                  <TableRow key={intervention.id}>
                    <TableCell>
                      <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        {intervention.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[300px] min-w-0 flex-col overflow-hidden lg:max-w-[320px]">
                        <span
                          className="truncate text-sm font-medium"
                          title={intervention.title}
                        >
                          {intervention.title}
                        </span>
                        {intervention.description && (
                          <span
                            className="truncate text-xs text-muted-foreground"
                            title={intervention.description}
                          >
                            {intervention.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          SEVERITY_COLOR[intervention.severity] ??
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {intervention.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {intervention.patient_name ? (
                          <>
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                              {intervention.patient_name
                                .split(/\s+/)
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </span>
                            <span
                              className="truncate text-sm font-medium"
                              title={intervention.patientId}
                            >
                              {intervention.patient_name}
                            </span>
                          </>
                        ) : (
                          <span
                            className="text-sm font-mono"
                            title={intervention.patientId}
                          >
                            {intervention.patientId.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_COLOR[intervention.status] ??
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {STATUS_LABELS[intervention.status] ?? intervention.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(intervention.recommendedAt)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(intervention.completedAt)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm font-medium">
                      {intervention.xpAwardedTotal}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAdapt && intervention.status !== "completed" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Cambiar estado">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="min-w-44">
                            {STATUS_OPTIONS.filter((opt) => opt.value !== intervention.status).map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => setTransitioning({ intervention, newStatus: opt.value })}
                              >
                                {opt.label}
                                <ChevronRight className="ml-auto size-3 opacity-60" />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <InterventionsEmptyState />
      )}

      {/* Paginación */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Página {result.page} de {result.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Filas por página:</span>
              <select
                className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={result.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Intervenciones por página"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
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

      {/* Dialog de transición de estado */}
      <TransitionDialog
        transitioning={transitioning}
        newStatus={transitioning?.newStatus ?? null}
        interventionTitle={transitioning?.intervention.title ?? null}
        result={transitionResult}
        assignedTo={transitionAssignedTo}
        actionLoading={actionLoading}
        onResultChange={setTransitionResult}
        onAssignedToChange={setTransitionAssignedTo}
        onConfirm={handleTransition}
        onCancel={() => {
          setTransitioning(null);
          setTransitionResult("");
          setTransitionAssignedTo("");
        }}
      />
    </div>
  );
}

// --- Sub-componentes ---

function InterventionsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="ml-auto flex gap-1">
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function InterventionsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las intervenciones
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function InterventionsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Activity className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">
          No hay intervenciones abiertas
        </p>
        <p className="text-xs text-muted-foreground">
          Las intervenciones derivadas de debilidades y registradas por
          profesionales aparecerán aquí para tu gestión.
        </p>
      </div>
    </div>
  );
}

// --- Dialog de transición de estado (componente aislado para tipado seguro) ---

function TransitionDialog({
  transitioning,
  newStatus,
  interventionTitle,
  result,
  assignedTo,
  actionLoading,
  onResultChange,
  onAssignedToChange,
  onConfirm,
  onCancel,
}: {
  transitioning: { intervention: Intervention; newStatus: InterventionStatus } | null;
  newStatus: InterventionStatus | null;
  interventionTitle: string | null;
  result: string;
  assignedTo: string;
  actionLoading: boolean;
  onResultChange: (v: string) => void;
  onAssignedToChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const requiresResult = newStatus !== null && REQUIRES_RESULT.includes(newStatus);
  const showAssignedTo = newStatus !== null && SHOW_ASSIGNED_TO.includes(newStatus);

  return (
    <Dialog
      open={Boolean(transitioning)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Cambiar estado a{" "}
            <span className="font-bold">
              {newStatus ? (STATUS_LABELS[newStatus] ?? newStatus) : ""}
            </span>
          </DialogTitle>
          <DialogDescription>
            Intervención &quot;{interventionTitle ?? ""}&quot;
            {requiresResult && (
              <>
                <br />
                <strong>El estado completado requiere un resultado.</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Campo resultado — requerido para completed */}
          {(requiresResult ||
            newStatus === "evaluated" ||
            newStatus === "reevaluation") && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="transition-result"
                className="text-sm font-medium"
              >
                Resultado / Nota clínica
                {requiresResult && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              <textarea
                id="transition-result"
                className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe el resultado o la evaluación clínica…"
                value={result}
                onChange={(e) => onResultChange(e.target.value)}
              />
            </div>
          )}

          {/* Campo assignedTo — opcional para in_progress / completed */}
          {showAssignedTo && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="transition-assigned"
                className="text-sm font-medium"
              >
                Asignar a (ID del profesional)
              </label>
              <input
                id="transition-assigned"
                type="text"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="ID del profesional (opcional)"
                value={assignedTo}
                onChange={(e) => onAssignedToChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            disabled={actionLoading || (requiresResult && !result.trim())}
            onClick={onConfirm}
          >
            {actionLoading ? "Guardando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
