"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
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
import { fetchXpLedger } from "../../../services/program-enrollments-service";
import type { PaginatedXpLedger, ProgramEnrollment } from "../../../types";

// Etiquetas legibles por razón de XP (espejo del enum XpReason del backend).
const REASON_LABELS: Record<string, string> = {
  TaskCompletion: "Tarea completada",
  DayBonus: "Bonus día perfecto",
  StreakMilestone: "Hito de racha",
  ClinicalImprovement: "Mejora clínica",
  NutritionLog: "Log nutricional",
  Other: "Otro",
};

const PAGE_SIZE = 20;

interface Props {
  enrollment: ProgramEnrollment;
}

/**
 * Pestaña Historial XP (TASK-17): libro mayor paginado de la inscripción
 * (GET /enrollments/{id}/xp-ledger). Tabla append-only con razón, regla,
 * multiplicador y balance después; paginación anterior/siguiente.
 */
export function EnrollmentXpLedgerTab({ enrollment }: Props) {
  const [ledger, setLedger] = useState<PaginatedXpLedger | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Guarda contra respuestas obsoletas al navegar rápido entre páginas.
  const requestIdRef = useRef(0);

  const load = async (p: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const data = await fetchXpLedger(enrollment.id, p, PAGE_SIZE);
      if (requestIdRef.current !== requestId) return;
      setLedger(data);
      setPage(data.page);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setLedger(null);
      setError(true);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  useEffect(() => {
    // Diferido un tick: evita setState síncrono dentro del efecto (regla
    // react-hooks/set-state-in-effect); load() marca loading=true al arrancar.
    const timer = setTimeout(() => {
      void load(1);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollment.id]);

  const handlePage = (newPage: number) => {
    setPage(newPage);
    void load(newPage);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Historial de XP</h2>
        {ledger && (
          <Badge variant="secondary" className="ml-auto">
            {ledger.total} entradas
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el historial de XP.
          </p>
          <Button variant="outline" size="sm" onClick={() => handlePage(page)}>
            <RefreshCw className="size-3.5" />
            Reintentar
          </Button>
        </div>
      ) : !ledger || ledger.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay entradas de XP registradas.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Regla</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Multiplicador</TableHead>
                  <TableHead className="text-right">Balance después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {new Date(entry.awardedAt).toLocaleString("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {REASON_LABELS[entry.reason] ?? entry.reason}
                    </TableCell>
                    <TableCell>
                      {entry.ruleCode ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {entry.ruleCode}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      +{entry.amount}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {entry.multiplierUsed != null && entry.multiplierUsed !== 1
                        ? `×${entry.multiplierUsed}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {entry.balanceAfter.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {ledger.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Página {page} de {ledger.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= ledger.totalPages}
                  onClick={() => handlePage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}