"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import { useT } from "@/providers/i18n-provider";
import { getPatientMeasurements } from "@/features/patients/services/patients-service";
import type { ClinicalMeasurementDto } from "@/features/patients/types";
import { fetchPatientControls } from "../services/program-controls-service";
import type {
  PatientControlsDto,
  PatientOverviewClinicalMetricsDto,
} from "../types/erp";
import { ControlesAdherenceKpis } from "./controles-adherence-kpis";
import { ControlesHistory } from "./controles-history";
import { ControlesMeasurementsCharts } from "./controles-measurements-charts";
import { ControlesTimeline } from "./controles-timeline";

interface ProgramControlesTabProps {
  patientId: string;
  /** Serie clínica 12 semanas ya cargada por el Perfil 360 (opcional). */
  clinicalMetrics?: PatientOverviewClinicalMetricsDto | null;
}

/** Error de carga de controles; `notFound` es el 404 de "sin inscripción". */
interface ControlsError {
  message: string | null;
  notFound: boolean;
}

/**
 * Tab "Controles" del Perfil 360 (UC-004): orquesta la carga de controles de
 * hitos + mediciones del paciente y compone timeline, KPIs, historial y charts.
 */
export function ProgramControlesTab({
  patientId,
  clinicalMetrics = null,
}: ProgramControlesTabProps) {
  const t = useT();
  const [controls, setControls] = useState<PatientControlsDto | null>(null);
  const [measurements, setMeasurements] = useState<ClinicalMeasurementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ControlsError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Ajuste de estado durante el render (patrón recomendado por React): si el
  // componente sigue montado y cambia el paciente, se descarta la data previa
  // de inmediato para que los datos clínicos de un paciente nunca se muestren
  // bajo otro mientras llega la nueva carga.
  const [loadedPatientId, setLoadedPatientId] = useState(patientId);
  if (loadedPatientId !== patientId) {
    setLoadedPatientId(patientId);
    setLoading(true);
    setControls(null);
    setMeasurements([]);
    setError(null);
  }

  // Los setState ocurren solo después del await (nunca síncronos en el
  // efecto); reloadKey fuerza la recarga desde el botón "Reintentar".
  // allSettled: si fallan las mediciones, los controles igual se muestran.
  useEffect(() => {
    let active = true;
    (async () => {
      const [controlsResult, measurementsResult] = await Promise.allSettled([
        fetchPatientControls(patientId),
        getPatientMeasurements(patientId),
      ]);
      if (!active) return;

      if (controlsResult.status === "fulfilled") {
        setControls(controlsResult.value);
        setError(null);
      } else {
        setControls(null);
        const reason = controlsResult.reason;
        setError({
          message:
            reason instanceof Error && reason.message ? reason.message : null,
          notFound: reason instanceof ApiError && reason.code === "not-found",
        });
      }
      setMeasurements(
        measurementsResult.status === "fulfilled" ? measurementsResult.value : [],
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  if (loading) return <ControlesSkeleton />;

  const hasMilestones = (controls?.milestones.length ?? 0) > 0;
  // 404 = paciente sin inscripción activa: empty state neutral, no error rojo.
  const notFound = error?.notFound === true;

  return (
    <section aria-label={t("Controles")} className="flex flex-col gap-5">
      {controls && hasMilestones ? (
        <>
          <ControlesTimeline controls={controls} />
          <ControlesAdherenceKpis adherence={controls.adherence} />
          <ControlesHistory controls={controls} />
        </>
      ) : error && !notFound ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
          <p className="text-sm font-semibold text-destructive">
            {t("Error al cargar los controles")}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {error.message ?? t("No pudimos cargar los controles.")}
          </p>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="text-sm font-semibold">
            {t("Sin controles registrados.")}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {t("Este paciente no tiene controles de hitos generados todavía.")}
          </p>
        </div>
      )}

      {/* Las mediciones y la serie clínica son independientes de los
          controles: se muestran aunque la carga de controles falle. */}
      <ControlesMeasurementsCharts
        measurements={measurements}
        milestones={controls?.milestones ?? []}
        clinicalMetrics={clinicalMetrics}
      />
    </section>
  );
}

function ControlesSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
