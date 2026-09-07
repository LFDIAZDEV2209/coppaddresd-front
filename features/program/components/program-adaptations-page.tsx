"use client";

import { useState } from "react";
import { GitBranch, RefreshCw, MoreHorizontal } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAdaptations } from "../hooks/use-adaptations";
import { useAuth } from "@/providers/auth-provider";
import type {
  Adaptation,
  AdaptationKind,
  AdaptationStatus,
} from "../types/adaptations";

const STATUS_FILTERS: { value: AdaptationStatus | "all"; label: string }[] = [
  { value: "Pending", label: "Pendientes" },
  { value: "Approved", label: "Aprobadas" },
  { value: "Rejected", label: "Rechazadas" },
  { value: "Applied", label: "Aplicadas" },
  { value: "all", label: "Todas" },
];

const KIND_LABELS: Record<AdaptationKind, string> = {
  DifficultyChange: "Cambio de dificultad",
  LevelChange: "Cambio de nivel",
  TemplateSwap: "Cambio de plantilla",
  RoutineContentRefresh: "Actualización de rutina",
  NutritionPlanRefresh: "Actualización de plan nutricional",
  MediaRotation: "Rotación de medios",
};

const STATUS_BADGE: Record<AdaptationStatus, string> = {
  Pending: "bg-warning-soft text-warning",
  Approved: "bg-info-soft text-info-foreground",
  Rejected: "bg-destructive-soft text-destructive",
  Applied: "bg-success-soft text-success-foreground",
  Superseded: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<AdaptationStatus, string> = {
  Pending: "Pendiente",
  Approved: "Aprobada",
  Rejected: "Rechazada",
  Applied: "Aplicada",
  Superseded: "Superada",
};

export function ProgramAdaptationsPage() {
  const { hasPermission } = useAuth();
  const canAdapt = hasPermission("Program.Adapt");

  const {
    result,
    loading,
    actionLoading,
    error,
    statusFilter,
    setStatusFilter,
    setPage,
    setPageSize,
    decide,
    retry,
  } = useAdaptations();

  const [approving, setApproving] = useState<Adaptation | null>(null);
  const [rejecting, setRejecting] = useState<Adaptation | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const handleApprove = async () => {
    if (!approving) return;
    await decide(approving.id, "Approve");
    setApproving(null);
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const note = rejectNote.trim();
    if (!note) return;
    await decide(rejecting.id, "Reject", note);
    setRejecting(null);
    setRejectNote("");
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Adaptaciones"
        description="Recomendaciones de ajuste del programa que requieren decisión clínica"
        icon={GitBranch}
      />

      {/* Filtros */}
      <section
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Filtros de adaptaciones"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Cola de adaptaciones</h2>
            <p className="text-xs text-muted-foreground">
              Cambios de dificultad y contenido propuestos por el motor de
              adaptación. Los cambios de dificultad requieren aprobación.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter ?? "all"}
              onValueChange={(v) =>
                setStatusFilter(v as AdaptationStatus | "all")
              }
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      </section>

      {/* Contenido */}
      {loading ? (
        <AdaptationsSkeleton />
      ) : error ? (
        <AdaptationsErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "recomendación" : "recomendaciones"}`}
            description="Vista de tabla"
            icon={GitBranch}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Razón</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Aprobación
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((adaptation) => {
                  const rawName =
                    (adaptation.patient_name ??
                      adaptation.patientName ??
                      adaptation.PatientName ??
                      "") as string;
                  const patientName = rawName.trim() || null;
                  const initials = patientName
                    ? patientName
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "";
                  return (
                  <TableRow key={adaptation.id}>
                    <TableCell>
                      {patientName ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary" aria-hidden>
                            {initials}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={patientName}>
                            {patientName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground" title={adaptation.enrollmentId}>
                          Paciente — {adaptation.enrollmentId.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {KIND_LABELS[adaptation.kind] ?? adaptation.kind}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[adaptation.status]}>
                        {STATUS_LABELS[adaptation.status] ?? adaptation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm">{adaptation.reason}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {adaptation.requiresApproval
                          ? "Requiere aprobación"
                          : "Auto-aplicada"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(adaptation.createdAt).toLocaleDateString(
                        "es-CO",
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAdapt && adaptation.status === "Pending" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="size-8" aria-label="Acciones">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setApproving(adaptation)}>
                              Aprobar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRejecting(adaptation)}
                            >
                              Rechazar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <AdaptationsEmptyState />
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
                aria-label="Adaptaciones por página"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
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
      )}

      {/* Confirmar aprobación */}
      <AlertDialog
        open={Boolean(approving)}
        onOpenChange={(open) => !open && setApproving(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-info-soft text-info">
            <GitBranch />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              Aprobar la recomendación{" "}
              <strong>
                {approving
                  ? (KIND_LABELS[approving.kind] ?? approving.kind)
                  : ""}
              </strong>
              . La aplicación del cambio depende del tipo de adaptación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              disabled={actionLoading}
              onClick={handleApprove}
            >
              Aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rechazo con nota obligatoria */}
      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar recomendación</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {rejecting ? (KIND_LABELS[rejecting.kind] ?? rejecting.kind) : ""}{" "}
              — {rejecting?.reason}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reject-note">Motivo del rechazo</Label>
              <Input
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explica por qué se rechaza la recomendación"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejecting(null)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading || !rejectNote.trim()}
              onClick={handleReject}
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-componentes ---

function AdaptationsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-40 hidden md:block" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdaptationsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las adaptaciones
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function AdaptationsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <GitBranch className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">
          No hay recomendaciones de adaptación
        </p>
        <p className="text-xs text-muted-foreground">
          Las propuestas del motor de adaptación aparecerán aquí cuando se
          detecten patrones en el programa del paciente.
        </p>
      </div>
    </div>
  );
}
