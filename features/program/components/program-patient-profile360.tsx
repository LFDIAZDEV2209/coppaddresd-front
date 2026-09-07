"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, X } from "lucide-react";
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
  PatientResumenHero,
  PatientResumenBody,
  PatientClinicaTop,
  PatientClinicaBottom,
  ClinicalEvolutionCard,
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
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
}

export function ProgramPatientProfile360({
  patientId,
  onBack: _onBack,
  onToggleSearch,
  isSearchOpen,
}: ProgramPatientProfile360Props) {
  void _onBack;
  const [activeTab, setActiveTab] = usePersistedTab(
    "perfil360:unified-v2",
    "resumen",
  );
  const { data, loading, error, retry } = usePatientOverview(patientId);
  const {
    data: biometriaData,
    loading: biometriaLoading,
    error: biometriaError,
  } = useBiometriaPatient(patientId);

  const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "clinica", label: "Clínica" },
    { key: "contenido", label: "Contenido" },
    { key: "xp-ledger", label: "Historial XP" },
  ];

  // Fallback when localStorage holds an old key (biometria/scores/baseline)
  const safeTab = tabs.some((t) => t.key === activeTab) ? activeTab : "resumen";

  const enrollmentId = data?.enrollment?.enrollment_id ?? null;

  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  useEffect(() => {
    if (!enrollmentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset enrollment state on id clear
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
            err instanceof Error
              ? err.message
              : "No se pudo cargar la inscripción.",
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
          err instanceof Error
            ? err.message
            : "No se pudo cargar la inscripción.",
        ),
      )
      .finally(() => setEnrollmentLoading(false));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hero azul — reemplaza al PageHeader "Perfil 360" cuando se ve un paciente específico */}
      {loading ? (
        <ResumenSkeleton />
      ) : error ? (
        <TabError message={error} onRetry={retry} />
      ) : data ? (
        <PatientResumenHero data={data} biometria={biometriaData ?? null} />
      ) : null}

      {/* Fila: tabs + lupa/actualizar en la misma línea */}
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="ml-auto flex items-center gap-2">
          {onToggleSearch && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onToggleSearch}
              aria-label={isSearchOpen ? "Ocultar buscador" : "Buscar paciente"}
              title={isSearchOpen ? "Ocultar buscador" : "Buscar paciente"}
            >
              {isSearchOpen ? (
                <X className="size-4" />
              ) : (
                <Search className="size-4" />
              )}
            </Button>
          )}
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

      {/* Tab content */}
      <div>
        {safeTab === "resumen" && (
          <section
            aria-label="Resumen del paciente"
            className="flex flex-col gap-5"
          >
            {/* Biometría: figura + zonas + mediciones exactas en el mismo box */}
            {biometriaLoading ? (
              <BiometriaPerfilSkeleton />
            ) : biometriaError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-5 text-center">
                <p className="text-sm font-semibold text-destructive">
                  Error al cargar biometría
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {biometriaError}
                </p>
              </div>
            ) : biometriaData ? (
              <BiometriaHeroSections
                data={biometriaData}
                tareasHoy={data ? data.tareas_hoy : undefined}
              />
            ) : null}

            {/* Resto del resumen sin hero (ya renderizado arriba) — Misiones ya va dentro del box de biometría para poblar el espacio en blanco */}
            {loading ? null : error ? null : data ? (
              <PatientResumenBody data={data} hideMisiones />
            ) : null}

            {/* Historial biometría: heatmap + tabla semanal */}
            {biometriaLoading ? null : biometriaData ? (
              <BiometriaHistorySections data={biometriaData} />
            ) : null}
          </section>
        )}

        {safeTab === "clinica" && (
          <section
            aria-label="Información clínica del paciente"
            className="flex flex-col gap-5"
          >
            {loading ? (
              <ResumenSkeleton />
            ) : error ? (
              <TabError message={error} onRetry={retry} />
            ) : data ? (
              <>
                <PatientClinicaTop data={data} />
                <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] items-start">
                  <div className="min-w-0">
                    <ClinicalEvolutionCard metrics={data.mediciones_clinicas} />
                  </div>
                  <div className="min-w-0">
                    <EnrollmentDetailTabWrapper
                      enrollmentId={enrollmentId}
                      enrollment={enrollment}
                      loading={enrollmentLoading || loading}
                      error={enrollmentError}
                      onRetry={handleRetryEnrollment}
                    >
                      {(enr) => <EnrollmentBaselineTab enrollment={enr} />}
                    </EnrollmentDetailTabWrapper>
                  </div>
                </div>
                <PatientClinicaBottom data={data} />
              </>
            ) : null}
          </section>
        )}

        {safeTab === "contenido" && (
          <section aria-label="Contenido">
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
          Este paciente no tiene una inscripción activa al programa. Inscríbelo
          desde el módulo de pacientes para ver el contenido y historial.
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
          style={{
            background:
              "radial-gradient(600px 200px at 85% -20%, rgba(212,175,55,0.18), transparent 60%)",
          }}
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
      <p className="text-sm font-semibold text-destructive">
        Error al cargar el perfil
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
