"use client";

import { useEffect, useState } from "react";
import { Dna, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";
import { fetchBaselines } from "../../../services/program-enrollments-service";
import type { ClinicalBaseline, ProgramEnrollment } from "../../../types";
import { CreateBaselineDialog } from "./create-baseline-dialog";

interface Props {
  enrollment: ProgramEnrollment;
}

/**
 * Pestaña Línea base (TASK-15): lista las líneas base clínicas del paciente
 * (GET /enrollments/{id}/baselines) y permite crear nuevas solo con permiso
 * Program.Edit. La creación ocurre en `CreateBaselineDialog`.
 */
export function EnrollmentBaselineTab({ enrollment }: Props) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const [baselines, setBaselines] = useState<ClinicalBaseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchBaselines(enrollment.id)
      .then(setBaselines)
      .catch(() => {
        setBaselines([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Diferido un tick: evita setState síncrono dentro del efecto (regla
    // react-hooks/set-state-in-effect); load() marca loading=true al arrancar.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollment.id]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Dna className="size-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">Líneas base clínicas</h2>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0 gap-1">
            <Plus className="size-3.5" />
            Nueva línea base
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-10 text-center">
          <p className="text-sm text-muted-foreground">No se pudieron cargar las líneas base.</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-3.5" />
            Reintentar
          </Button>
        </div>
      ) : baselines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-8 text-center">
          <p className="text-sm text-muted-foreground">No hay líneas base registradas para este paciente.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0B2B4A] hover:bg-[#0B2B4A]">
                  <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-white">Métrica</TableHead>
                  <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-white">Valor base</TableHead>
                  <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-white">Objetivo</TableHead>
                  <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-white">Dirección</TableHead>
                  <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-white">Medido el</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baselines.map((b) => (
                  <TableRow key={b.id} className="h-11">
                    <TableCell className="max-w-[110px] truncate font-mono text-xs font-medium" title={b.metricCode}>
                      {b.metricCode}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {b.value} <span className="text-muted-foreground">{b.unitSymbol}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {b.targetValue ? (
                        <>
                          {b.targetValue} <span className="text-muted-foreground">{b.unitSymbol}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap text-[10px] font-medium leading-none">
                        {b.favorableDirection === "Higher" ? "↑ Mayor es mejor" : "↓ Menor es mejor"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{b.measuredAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {canEdit && (
        <CreateBaselineDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          enrollmentId={enrollment.id}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}