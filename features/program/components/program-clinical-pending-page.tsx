"use client";

import { useState } from "react";
import { Stethoscope, RefreshCw, Check, X } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicalReviews } from "../hooks/use-clinical-reviews";
import { useAuth } from "@/providers/auth-provider";
import type { ClinicalReview } from "../types";

export function ProgramClinicalPendingPage() {
  const { hasPermission } = useAuth();
  const canAdapt = hasPermission("Program.Adapt");

  const {
    result,
    loading,
    actionLoading,
    error,
    setPage,
    setPageSize,
    decide,
    retry,
  } = useClinicalReviews();

  const [confirming, setConfirming] = useState<{
    review: ClinicalReview;
    approve: boolean;
  } | null>(null);

  const handleDecide = async (approve: boolean) => {
    if (!confirming) return;
    await decide(confirming.review.id, approve);
    setConfirming(null);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "approved":
        return "Aprobada";
      case "rejected":
        return "Rechazada";
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Revisiones clínicas pendientes"
        description="Decide las mejorías significativas detectadas por el motor de XP"
        icon={Stethoscope}
      />

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Cola de revisiones"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Cola de revisiones</h2>
            <p className="text-xs text-muted-foreground">
              Revisiones clínicas de XP que requieren decisión. Aprobadas
              otorgan CLINICAL_SIGNIFICANT.
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
        <ClinicalPendingSkeleton />
      ) : error ? (
        <ClinicalPendingErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "revisión" : "revisiones"} pendientes`}
            description="Vista de tabla"
            icon={Stethoscope}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    Δ%
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Regla
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Período
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <span className="text-sm font-mono" title={review.patientId}>
                        {review.patientId.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {review.metricName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {review.metricCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      <span
                        className={`text-sm font-medium ${
                          review.deltaPct !== null && review.deltaPct > 0
                            ? "text-green-600"
                            : review.deltaPct !== null && review.deltaPct < 0
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {review.deltaPct !== null
                          ? `${review.deltaPct > 0 ? "+" : ""}${review.deltaPct.toFixed(1)}%`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">
                      {review.ruleCode}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(review.status)}>
                        {statusLabel(review.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(
                        review.healthScorePeriodStart,
                      ).toLocaleDateString("es-CO")}{" "}
                      –{" "}
                      {new Date(
                        review.healthScorePeriodEnd,
                      ).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAdapt && review.status === "pending" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-green-600"
                            title="Aprobar"
                            onClick={() =>
                              setConfirming({ review, approve: true })
                            }
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            title="Rechazar"
                            onClick={() =>
                              setConfirming({ review, approve: false })
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <ClinicalPendingEmptyState />
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
              aria-label="Revisiones por página"
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

      {/* Confirmar decisión */}
      <AlertDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia
            className={
              confirming?.approve
                ? "bg-green-50 text-green-600"
                : "bg-destructive-soft text-destructive"
            }
          >
            {confirming?.approve ? <Check /> : <X />}
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming?.approve
                ? "¿Aprobar revisión clínica?"
                : "¿Rechazar revisión clínica?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.approve
                ? `Se otorgará CLINICAL_SIGNIFICANT al paciente. La métrica "${confirming?.review.metricName}" con Δ${confirming?.review.deltaPct !== null ? `${confirming.review.deltaPct > 0 ? "+" : ""}${confirming.review.deltaPct.toFixed(1)}%` : ""} será validada.`
                : `Se rechazará la revisión de "${confirming?.review.metricName}". No se otorgará XP.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirming?.approve
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-destructive hover:bg-destructive/90"
              }
              disabled={actionLoading}
              onClick={() => handleDecide(confirming?.approve ?? false)}
            >
              {confirming?.approve ? "Aprobar" : "Rechazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componentes ---

function ClinicalPendingSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
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

function ClinicalPendingErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las revisiones
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function ClinicalPendingEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Stethoscope className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">
          No hay revisiones clínicas pendientes
        </p>
        <p className="text-xs text-muted-foreground">
          Las mejorías significativas detectadas por el motor aparecerán aquí
          para tu decisión.
        </p>
      </div>
    </div>
  );
}
