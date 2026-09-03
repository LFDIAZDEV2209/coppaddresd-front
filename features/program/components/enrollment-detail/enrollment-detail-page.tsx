"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchEnrollmentById } from "../../services/program-enrollments-service";
import type { ProgramEnrollment } from "../../types";
import { EnrollmentTabsNav } from "./enrollment-tabs-nav";
import type { EnrollmentDetailTab } from "./enrollment-tabs-nav";
import { EnrollmentSummaryTab } from "./tabs/enrollment-summary-tab";
import { EnrollmentContentTab } from "./tabs/enrollment-content-tab";
import { EnrollmentScoresTab } from "./tabs/enrollment-scores-tab";
import { EnrollmentBaselineTab } from "./tabs/enrollment-baseline-tab";
import { EnrollmentXpLedgerTab } from "./tabs/enrollment-xp-ledger-tab";

interface Props {
  enrollmentId: string;
}

/**
 * Panel del paciente (TASK-08): shell con cabecera, barra de pestañas y
 * render condicional de las 5 secciones. Carga la inscripción una sola vez;
 * cada pestaña hace su propio fetch.
 */
export function EnrollmentDetailPage({ enrollmentId }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EnrollmentDetailTab>("summary");
  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    fetchEnrollmentById(enrollmentId)
      .then(setEnrollment)
      .catch(() => {
        setEnrollment(null);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Diferido un tick: evita setState síncrono dentro del efecto (regla
    // react-hooks/set-state-in-effect); load() marca loading=true al arrancar.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);

  if (loading) return <EnrollmentDetailSkeleton />;

  if (!enrollment) {
    return (
      <EnrollmentLoadState
        title={
          loadError
            ? "No se pudo cargar la inscripción"
            : "Inscripción no encontrada"
        }
        description={
          loadError
            ? "Ocurrió un error al consultar los datos del paciente."
            : "La inscripción no existe o no tienes acceso a ella."
        }
        actionLabel={loadError ? "Reintentar" : "Volver a inscripciones"}
        onAction={loadError ? load : () => router.push("/program/enrollments")}
      />
    );
  }

  const patientName =
    enrollment.patientFullName ??
    `Paciente (${enrollment.patientId.slice(0, 8)})`;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Botón volver */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/program/enrollments")}
        >
          <ArrowLeft className="size-4" />
          Volver a inscripciones
        </Button>
      </div>

      <PageHeader
        title={patientName}
        description={`${enrollment.templateName ?? "Programa"} · Semana ${enrollment.currentWeekNumber} de ${enrollment.totalWeeks}`}
        icon={Trophy}
      />

      <EnrollmentTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === "summary" && (
          <EnrollmentSummaryTab enrollment={enrollment} />
        )}
        {activeTab === "content" && (
          <EnrollmentContentTab enrollment={enrollment} />
        )}
        {activeTab === "scores" && (
          <EnrollmentScoresTab enrollment={enrollment} />
        )}
        {activeTab === "baseline" && (
          <EnrollmentBaselineTab enrollment={enrollment} />
        )}
        {activeTab === "xp-ledger" && (
          <EnrollmentXpLedgerTab enrollment={enrollment} />
        )}
      </div>
    </div>
  );
}

/** Esqueleto de carga del panel completo. */
function EnrollmentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-24 rounded-t-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Estado de carga fallida / inscripción inexistente con acción. */
function EnrollmentLoadState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 py-24 text-center sm:p-6">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" onClick={onAction}>
        {actionLabel === "Reintentar" && <RefreshCw className="size-3.5" />}
        {actionLabel}
      </Button>
    </div>
  );
}