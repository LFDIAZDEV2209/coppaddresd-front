"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientOverview } from "../hooks/use-patient-overview";
import { useEnrollmentSnapshot } from "../hooks/use-enrollment-snapshot";
import { useT } from "@/providers/i18n-provider";
import { ProgramGamificacionTab } from "./program-gamificacion-tab";
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
import { ProgramControlesTab } from "./program-controles-tab";
import { fetchEnrollmentById } from "../services/program-enrollments-service";
import type { ProgramEnrollment } from "../types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NutritionPatientSummary } from "@/features/nutrition/components/nutrition-patient-summary";

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
  const t = useT();
  const [activeTab, setActiveTab] = usePersistedTab(
    "perfil360:unified-v3",
    "resumen",
  );
  const { data, loading, error, retry } = usePatientOverview(patientId);
  const {
    data: biometriaData,
    loading: biometriaLoading,
    error: biometriaError,
  } = useBiometriaPatient(patientId);

  const tabs = [
    { key: "resumen", label: t("Resumen") },
    { key: "plan-semanal", label: t("Plan semanal") },
    { key: "nutricion", label: t("Nutrición") },
    { key: "seguimiento", label: t("Seguimiento") },
    { key: "progreso", label: t("Progreso") },
  ];

  // Conservar la selección de sesiones anteriores al reorganizar las pestañas.
  const legacyTabs: Record<string, string> = {
    contenido: "plan-semanal",
    clinica: "seguimiento",
    controles: "seguimiento",
    gamificacion: "progreso",
    "xp-ledger": "progreso",
  };
  const migratedTab = legacyTabs[activeTab] ?? activeTab;
  const safeTab = tabs.some((tab) => tab.key === migratedTab)
    ? migratedTab
    : "resumen";

  const enrollmentId = data?.enrollment?.enrollment_id ?? null;
  const {
    data: snapshot,
    loading: snapshotLoading,
    error: snapshotError,
    retry: retrySnapshot,
  } = useEnrollmentSnapshot(enrollmentId);

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
    fetchEnrollmentById(enrollmentId)
      .then((enr) => {
        if (!cancelled) {
          setEnrollment(enr);
          setEnrollmentError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEnrollmentError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la inscripción.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setEnrollmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentId]);

  const activeEnrollment = enrollmentId ? enrollment : null;
  const activeEnrollmentLoading = enrollmentId ? enrollmentLoading : false;
  const activeEnrollmentError = enrollmentId ? enrollmentError : null;

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

  if (!loading && !data) {
    return (
      <TabError
        message={t(
          "Este paciente no está disponible o no tienes acceso a su perfil.",
        )}
        onRetry={retry}
      />
    );
  }

  return (
    <Tabs
      value={safeTab}
      onValueChange={(value) => setActiveTab(String(value))}
      className="min-w-0 gap-5"
    >
      <Link
        href="/patients"
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("Pacientes")}
      </Link>
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
        <TabsList
          aria-label={t("Vistas del perfil 360")}
          className="h-auto flex-wrap justify-start"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="min-h-11 px-4 text-muted-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          {onToggleSearch && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onToggleSearch}
              aria-label={
                isSearchOpen ? t("Ocultar buscador") : t("Buscar paciente")
              }
              title={
                isSearchOpen ? t("Ocultar buscador") : t("Buscar paciente")
              }
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
            {t("Actualizar")}
          </Button>
        </div>
      </div>

      <TabsContent value="resumen" className="flex flex-col gap-5">
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

        {/* Historial biometría: tabla semanal (el heatmap vive en Gamificación) */}
        {biometriaLoading ? null : biometriaData ? (
          <BiometriaHistorySections data={biometriaData} />
        ) : null}
      </TabsContent>
      <TabsContent value="plan-semanal" className="flex flex-col gap-5">
        <EnrollmentDetailTabWrapper
          enrollmentId={enrollmentId}
          enrollment={activeEnrollment}
          loading={activeEnrollmentLoading || loading}
          error={activeEnrollmentError}
          onRetry={handleRetryEnrollment}
        >
          {(enr) => <EnrollmentContentTab enrollment={enr} />}
        </EnrollmentDetailTabWrapper>
      </TabsContent>
      <TabsContent value="nutricion" className="flex flex-col gap-5">
        <NutritionPatientSummary patientId={patientId} cycle={data?.currentCycle} />
      </TabsContent>
      <TabsContent value="seguimiento" className="flex flex-col gap-5">
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
                  enrollment={activeEnrollment}
                  loading={activeEnrollmentLoading || loading}
                  error={activeEnrollmentError}
                  onRetry={handleRetryEnrollment}
                >
                  {(enr) => <EnrollmentBaselineTab enrollment={enr} />}
                </EnrollmentDetailTabWrapper>
              </div>
            </div>
            <PatientClinicaBottom data={data} />
          </>
        ) : null}

        <ProgramControlesTab
          patientId={patientId}
          clinicalMetrics={data?.mediciones_clinicas ?? null}
        />
      </TabsContent>
      <TabsContent value="progreso" className="flex flex-col gap-5">
        <ProgramGamificacionTab
          overview={data ?? null}
          overviewLoading={loading}
          snapshot={snapshot}
          snapshotLoading={snapshotLoading}
          snapshotError={snapshotError}
          onRetrySnapshot={retrySnapshot}
          heatmap={biometriaData?.adherence_heatmap ?? null}
          heatmapLoading={biometriaLoading}
        />

        <EnrollmentDetailTabWrapper
          enrollmentId={enrollmentId}
          enrollment={activeEnrollment}
          loading={activeEnrollmentLoading || loading}
          error={activeEnrollmentError}
          onRetry={handleRetryEnrollment}
        >
          {(enr) => <EnrollmentXpLedgerTab enrollment={enr} />}
        </EnrollmentDetailTabWrapper>
      </TabsContent>
    </Tabs>
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
  const t = useT();
  if (!enrollmentId) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
        <p className="text-sm font-semibold">{t("Sin inscripción activa")}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {t(
            "Este paciente no tiene una inscripción activa al programa. Inscríbelo desde el módulo de pacientes para ver el contenido y historial.",
          )}
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
  const t = useT();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center"
    >
      <p className="text-sm font-semibold text-destructive">
        {t("Error al cargar el perfil")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("Reintentar")}
      </Button>
    </div>
  );
}
