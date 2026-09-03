"use client";

// Tab "Scores clínicos" del panel del paciente (UC-D1).
// El paciente ya está seleccionado (enrollment.patientId) — sin picker.
// Reutiliza los componentes de visualización extraídos de ProgramScoresPage.

import { useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useScores } from "../../../hooks/use-scores";
import {
  ScoresDisplay,
  ScoresSkeleton,
  ScoresErrorState,
} from "../../program-scores-display";
import type { ProgramEnrollment } from "../../../types";

interface Props {
  enrollment: ProgramEnrollment;
}

export function EnrollmentScoresTab({ enrollment }: Props) {
  const { hasPermission } = useAuth();
  const canRecalculate = hasPermission("Program.Edit");

  const { result, loading, error, calculate } = useScores();

  // Cargar/calcular los scores del paciente al montar el tab
  useEffect(() => {
    calculate(enrollment.patientId).catch(() => {
      // El error se refleja en el estado del hook (error)
    });
  }, [enrollment.patientId, calculate]);

  const handleRecalculate = useCallback(() => {
    calculate(enrollment.patientId).catch(() => {
      // El error se refleja en el estado del hook (error)
    });
  }, [enrollment.patientId, calculate]);

  return (
    <div className="flex flex-col gap-4">
      {canRecalculate && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Recalcular scores
          </Button>
        </div>
      )}

      {loading && <ScoresSkeleton />}
      {error && (
        <ScoresErrorState message={error} onRetry={handleRecalculate} />
      )}
      {!loading && !error && result && <ScoresDisplay data={result} />}
      {!loading && !error && !result && (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay scores calculados para este paciente.
          </p>
        </div>
      )}
    </div>
  );
}