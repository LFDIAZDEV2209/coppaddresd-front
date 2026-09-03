"use client";

import { useState, useEffect } from "react";
import { RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientOverview } from "../hooks/use-patient-overview";
import { usePersistedTab } from "./chart-tabs";
import {
  BiometriaHeroSections,
  BiometriaHistorySections,
  useBiometriaPatient,
  BiometriaPerfilSkeleton,
} from "./biometria-perfil-360-detail";
import {
  PatientResumenSections,
  PatientClinicaSections,
} from "./program-patient-overview-page";
import { EnrollmentContentTab } from "./enrollment-detail/tabs/enrollment-content-tab";
import { EnrollmentBaselineTab } from "./enrollment-detail/tabs/enrollment-baseline-tab";
import { EnrollmentXpLedgerTab } from "./enrollment-detail/tabs/enrollment-xp-ledger-tab";
import { fetchEnrollmentById } from "../services/program-enrollments-service";
import type { ProgramEnrollment } from "../types";
import { cn } from "@/lib/utils";

interface ProgramPatientProfile360Props {
  patientId: string;
  onBack?: () => void;
}

export function ProgramPatientProfile360({
  patientId,
  onBack,
}: ProgramPatientProfile360Props) {
  const [activeTab, setActiveTab] = usePersistedTab("perfil360:unified-v2", "resumen");
  const { data, loading, error, retry } = usePatientOverview(patientId);
  const {
    data: biometriaData,
    loading: biometriaLoading,
    error: biometriaError,
  } = useBiometriaPatient(patientId);

  const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "clinica", label: "Clínica" },
    { key: "contenido", label: "Contenido semanal" },
    { key: "xp-ledger", label: "Historial XP" },
  ];

  // Fallback when localStorage holds an old key (biometria/scores/baseline)
  const safeTab = tabs.some((t) => t.key === activeTab) ? activeTab : "resumen";

  const headerName = data?.patient_name || patientId.slice(0, 8);
  const enrollmentId = data?.enrollment?.enrollment_id ?? null;

  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  useEffect(() => {
    if (!enrollmentId) {
      setEnrollment(null);
      setEnrollmentError(null);
      setEnrollmentLoading(false);
      return;
    }
    let cancelled = false;
    setEnrollmentLoading(true);
    setEnrollmentError(null);
    fetchEnrollmentById(enrollmentId)
      .then((enr) => {
        if (!cancelled) setEnrollment(enr);
      })
      .catch((err) => {
        if (!cancelled)
          setEnrollmentError(
            err instanceof Error ? err.message : "No se pudo cargar la inscripción.",
          );
      })
      .finally(() => {
        if (!cancelled) setEnrollmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentId]);

  const handleRetryEnrollment = () => {
    if (!enrollmentId) return;
    setEnrollmentLoading(true);
    setEnrollmentError(null);
    fetchEnrollmentById(enrollmentId)
      .then(setEnrollment)
      .catch((err) =>
        setEnrollmentError(
          err instanceof Error ? err.message : "No se pudo cargar la inscripción.",
        ),
      )
      .finally(() => setEnrollmentLoading(false));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Volver">
            ←
          </Button>
        )}
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{headerName}</p>
            <p className="truncate text-xs text-muted-foreground">{patientId.slice(0, 8)}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Segmented tabs */}
      <div
        role="tablist"
        aria-label="Vistas del perfil 360"
        className="inline-flex w-fit flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm"
      >
        {tabs.map((tab) => {
          const isActive = safeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {safeTab === "resumen" && (
          <section aria-label="Resumen del paciente" className="flex flex-col gap-5">
            {/* Biometría hero: figura + zonas + mediciones exactas */}
            {biometriaLoading ? (
              <BiometriaPerfilSkeleton />
            ) : biometriaError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-5 text-center">
                <p className="text-sm font-semibold text-destructive">Error al cargar biometría</p>
                <p className="mt-1 text-xs text-muted-foreground">{biometriaError}</p>
              </div>
            ) : biometriaData ? (
              <BiometriaHeroSections data={biometriaData} />
            ) : null}

            {/* Programa: misiones, radar, evolución 12w, scores */}
            {loading ? (
              <ResumenSkeleton />
            ) : error ? (
              <TabError message={error} onRetry={retry} />
            ) : data ? (
              <PatientResumenSections data={data} />
            ) : null}

            {/* Historial biometría: heatmap + tabla semanal (no duplica ChartTabs 12w) */}
            {biometriaLoading ? null : biometriaData ? (
              <BiometriaHistorySections data={biometriaData} />
            ) : null}
          </section>
        )}

        {safeTab === "clinica" && (
          <section aria-label="Información clínica del paciente" className="flex flex-col gap-5">
            {loading ? (
              <ResumenSkeleton />
            ) : error ? (
              <TabError message={error} onRetry={retry} />
            ) : data ? (
              <>
                <PatientClinicaSections data={data} />
                {/* Línea base anexada a Clínica */}
                <EnrollmentDetailTabWrapper
                  enrollmentId={enrollmentId}
                  enrollment={enrollment}
                  loading={enrollmentLoading || loading}
                  error={enrollmentError}
                  onRetry={handleRetryEnrollment}
                >
                  {(enr) => <EnrollmentBaselineTab enrollment={enr} />}
                </EnrollmentDetailTabWrapper>
              </>
            ) : null}
          </section>
        )}

        {safeTab === "contenido" && (
          <section aria-label="Contenido semanal">
            <EnrollmentDetailTabWrapper
              enrollmentId={enrollmentId}
              enrollment={enrollment}
              loading={enrollmentLoading || loading}
              error={enrollmentError}
              onRetry={handleRetryEnrollment}
            >
              {(enr) => <EnrollmentContentTab enrollment={enr} />}
            </EnrollmentDetailTabWrapper>
          </section>
        )}

        {safeTab === "xp-ledger" && (
          <section aria-label="Historial XP">
            <EnrollmentDetailTabWrapper
              enrollmentId={enrollmentId}
              enrollment={enrollment}
              loading={enrollmentLoading || loading}
              error={enrollmentError}
              onRetry={handleRetryEnrollment}
            >
              {(enr) => <EnrollmentXpLedgerTab enrollment={enr} />}
            </EnrollmentDetailTabWrapper>
          </section>
        )}
      </div>
    </div>
  );
}

function EnrollmentDetailTabWrapper({
  enrollmentId,
  enrollment,
  loading,
  error,
  onRetry,
  children,
}: {
  enrollmentId: string | null;
  enrollment: ProgramEnrollment | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: (enrollment: ProgramEnrollment) => React.ReactNode;
}) {
  if (!enrollmentId) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
        <p className="text-sm font-semibold">Sin inscripción activa</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Este paciente no tiene una inscripción activa al programa. Inscríbelo desde el módulo de pacientes para ver el contenido y historial.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (error) {
    return <TabError message={error} onRetry={onRetry} />;
  }
  if (!enrollment) return null;
  return <>{children(enrollment)}</>;
}

function ResumenSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B2B4A] p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(600px 200px at 85% -20%, rgba(212,175,55,0.18), transparent 60%)" }}
        />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="mt-2 h-4 w-64 bg-white/10" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function TabError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">Error al cargar el perfil</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
