"use client";

import { useState } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
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
import { useWeaknesses } from "../hooks/use-weaknesses";
import { useAuth } from "@/providers/auth-provider";
import type { Weakness, WeaknessTransitionStatus } from "../types/weaknesses";

const STATUS_OPTIONS: { value: WeaknessTransitionStatus; label: string }[] = [
  { value: "acknowledged", label: "Reconocida" },
  { value: "in_intervention", label: "En intervención" },
  { value: "resolved", label: "Resuelta" },
  { value: "dismissed", label: "Descartada" },
];

export function ProgramWeaknessesPage() {
  const { hasPermission } = useAuth();
  const canAdapt = hasPermission("Program.Adapt");

  const {
    result,
    loading,
    actionLoading,
    error,
    setPage,
    setPageSize,
    transition,
    retry,
  } = useWeaknesses();

  const [confirming, setConfirming] = useState<{
    weakness: Weakness;
    status: WeaknessTransitionStatus;
  } | null>(null);

  const handleTransition = async (status: WeaknessTransitionStatus) => {
    if (!confirming) return;
    await transition(confirming.weakness.id, status);
    setConfirming(null);
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive-soft text-destructive";
      case "medium":
        return "bg-warning-soft text-warning";
      case "low":
        return "bg-success-soft text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const severityLabel = (severity: string) => {
    switch (severity) {
      case "high":
        return "Alta";
      case "medium":
        return "Media";
      case "low":
        return "Baja";
      default:
        return severity;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Debilidades abiertas"
        description="Cola clínica de hallazgos que requieren decisión"
        icon={ShieldAlert}
      />

      {/* Sección de cola */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Cola de debilidades"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Cola clínica</h2>
            <p className="text-xs text-muted-foreground">
              Hallazgos abiertos del motor de detección que esperan decisión del
              clínico. Orden FIFO por fecha de detección.
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
        <WeaknessesSkeleton />
      ) : error ? (
        <WeaknessesErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "debilidad" : "debilidades"} abiertas`}
            description="Vista de tabla"
            icon={ShieldAlert}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead className="hidden md:table-cell">Paciente</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead className="hidden md:table-cell">Título</TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    Valor indicador
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Detectada
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((weakness) => (
                  <TableRow key={weakness.id}>
                    <TableCell>
                      <span className="text-sm font-mono">{weakness.code}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {weakness.patient_name ? (
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                            {weakness.patient_name
                              .split(/\s+/)
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                          <span
                            className="truncate text-sm font-medium"
                            title={weakness.patientId}
                          >
                            {weakness.patient_name}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-sm font-mono"
                          title={weakness.patientId}
                        >
                          {weakness.patientId.slice(0, 8)}…
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{weakness.category}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityBadge(weakness.severity)}>
                        {severityLabel(weakness.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm">{weakness.title}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      <span className="text-sm font-mono">
                        {weakness.indicatorValue !== null
                          ? weakness.indicatorValue.toFixed(1)
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(weakness.detectedAt).toLocaleDateString(
                        "es-CO",
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAdapt && weakness.status === "open" && (
                        <Select
                          onValueChange={(value) =>
                            setConfirming({
                              weakness,
                              status: value as WeaknessTransitionStatus,
                            })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[160px] text-xs"
                            aria-label={`Cambiar estado de ${weakness.code}`}
                          >
                            <SelectValue placeholder="Cambiar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <WeaknessesEmptyState />
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
              aria-label="Debilidades por página"
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

      {/* Confirmar transición */}
      <AlertDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-warning-soft text-warning">
            <ShieldAlert />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de estado</AlertDialogTitle>
            <AlertDialogDescription>
              Cambiar la debilidad{" "}
              <strong>{confirming?.weakness.code}</strong> (
              {confirming?.weakness.title}) a estado{" "}
              <strong>
                {
                  STATUS_OPTIONS.find((o) => o.value === confirming?.status)
                    ?.label
                }
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              disabled={actionLoading}
              onClick={() =>
                handleTransition(confirming?.status ?? "acknowledged")
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componentes ---

function WeaknessesSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-40 hidden md:block" />
          <div className="ml-auto">
            <Skeleton className="h-8 w-36 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WeaknessesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las debilidades
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function WeaknessesEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <ShieldAlert className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">
          No hay debilidades abiertas
        </p>
        <p className="text-xs text-muted-foreground">
          Los hallazgos del motor de detección que requieren decisión clínica
          aparecerán aquí.
        </p>
      </div>
    </div>
  );
}
