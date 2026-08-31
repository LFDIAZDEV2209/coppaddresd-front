"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Battery,
  ClinicalIndicator,
  CoverageByCategory,
  CoverageByTest,
  CoverageTrendPoint,
  HealthAlert,
  HealthProfessional,
  HealthTest,
  IndicatorAggregate,
  PatientEvaluation,
  PatientMasterRow,
  PatientProfile,
  PendingPatientRow,
} from "../types";
import {
  healthTestsApi,
  healthTestMetrics,
  withAttempts,
  type HealthTestStats,
} from "../services/health-tests-service";
import { ApiError } from "@/lib/api/http";

/** Estado genérico de carga async (reutilizable por todos los hooks). */
export function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const load = useCallback(async () => {
    try {
      const result = await loaderRef.current();
      setData(result);
      setError(null);
      setErrorCode(null);
    } catch (e) {
      setError("Intenta de nuevo más tarde.");
      setErrorCode(e instanceof ApiError ? e.code : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, errorCode, reload: load };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  patients: PatientProfile[];
  tests: HealthTest[];
  alerts: HealthAlert[];
  professionals: HealthProfessional[];
  coverageTrend: CoverageTrendPoint[];
  stats: HealthTestStats;
}

export function useDashboard() {
  const patients = useAsyncData(healthTestsApi.listPatients);
  const tests = useAsyncData(healthTestsApi.listTests);
  const alerts = useAsyncData(healthTestsApi.listAlerts);
  const professionals = useAsyncData(healthTestsApi.listProfessionals);
  const trend = useAsyncData(healthTestsApi.getCoverageTrend);
  const stats = useAsyncData(healthTestsApi.getStats);

  const loading =
    patients.loading ||
    tests.loading ||
    alerts.loading ||
    professionals.loading ||
    trend.loading ||
    stats.loading;
  const error =
    patients.error ??
    tests.error ??
    alerts.error ??
    professionals.error ??
    trend.error ??
    stats.error;

  const reload = useCallback(() => {
    void patients.reload();
    void tests.reload();
    void alerts.reload();
    void professionals.reload();
    void trend.reload();
    void stats.reload();
  }, [patients, tests, alerts, professionals, trend, stats]);

  const data = useMemo<DashboardData | null>(() => {
    if (
      !patients.data ||
      !tests.data ||
      !alerts.data ||
      !professionals.data ||
      !trend.data ||
      !stats.data
    ) {
      return null;
    }
    return {
      patients: patients.data,
      tests: tests.data,
      alerts: alerts.data,
      professionals: professionals.data,
      coverageTrend: trend.data,
      stats: stats.data,
    };
  }, [
    patients.data,
    tests.data,
    alerts.data,
    professionals.data,
    trend.data,
    stats.data,
  ]);

  return { data, loading, error, reload, metrics: healthTestMetrics };
}

/* ------------------------------------------------------------------ */
/* Cobertura                                                           */
/* ------------------------------------------------------------------ */

export function useCoverage() {
  const byTest = useAsyncData(healthTestsApi.getCoverageByTest);
  const byCategory = useAsyncData(healthTestsApi.getCoverageByCategory);
  const trend = useAsyncData(healthTestsApi.getCoverageTrend);
  const patients = useAsyncData(healthTestsApi.listPatients);
  const professionals = useAsyncData(healthTestsApi.listProfessionals);

  const loading =
    byTest.loading ||
    byCategory.loading ||
    trend.loading ||
    patients.loading ||
    professionals.loading;
  const error =
    byTest.error ??
    byCategory.error ??
    trend.error ??
    patients.error ??
    professionals.error;

  const reload = useCallback(() => {
    void byTest.reload();
    void byCategory.reload();
    void trend.reload();
    void patients.reload();
    void professionals.reload();
  }, [byTest, byCategory, trend, patients, professionals]);

  const data = useMemo(() => {
    if (
      !byTest.data ||
      !byCategory.data ||
      !trend.data ||
      !patients.data ||
      !professionals.data
    ) {
      return null;
    }
    return {
      byTest: byTest.data as CoverageByTest[],
      byCategory: byCategory.data as CoverageByCategory[],
      trend: trend.data as CoverageTrendPoint[],
      totalPatients: patients.data.length,
      professionals: professionals.data,
    };
  }, [
    byTest.data,
    byCategory.data,
    trend.data,
    patients.data,
    professionals.data,
  ]);

  return { data, loading, error, reload };
}

/* ------------------------------------------------------------------ */
/* Seguimiento (pendientes + recordatorios)                            */
/* ------------------------------------------------------------------ */

export function usePendingPatients() {
  const rows = useAsyncData(healthTestsApi.getPendingPatients);
  const tests = useAsyncData(healthTestsApi.listTests);
  const [reminded, setReminded] = useState<Record<string, number>>({});

  const loading = rows.loading || tests.loading;
  const error = rows.error ?? tests.error;

  const reload = useCallback(() => {
    void rows.reload();
    void tests.reload();
  }, [rows, tests]);

  /** Mock: registra el recordatorio enviado (UX lista para API real). */
  const sendReminder = useCallback((patientId: string) => {
    setReminded((prev) => ({
      ...prev,
      [patientId]: (prev[patientId] ?? 0) + 1,
    }));
  }, []);

  const data = useMemo(() => {
    if (!rows.data || !tests.data) return null;
    return {
      rows: rows.data as PendingPatientRow[],
      tests: tests.data as HealthTest[],
      reminded,
    };
  }, [rows.data, tests.data, reminded]);

  return { data, loading, error, reload, sendReminder };
}

/* ------------------------------------------------------------------ */
/* Indicadores + DOFA                                                  */
/* ------------------------------------------------------------------ */

export function useIndicators() {
  const aggregates = useAsyncData(healthTestsApi.getIndicatorAggregates);
  const patients = useAsyncData(healthTestsApi.listPatients);
  const alerts = useAsyncData(healthTestsApi.listAlerts);

  const loading = aggregates.loading || patients.loading || alerts.loading;
  const error = aggregates.error ?? patients.error ?? alerts.error;

  const reload = useCallback(() => {
    void aggregates.reload();
    void patients.reload();
    void alerts.reload();
  }, [aggregates, patients, alerts]);

  const data = useMemo(() => {
    if (!aggregates.data || !patients.data || !alerts.data) return null;
    return {
      aggregates: aggregates.data as IndicatorAggregate[],
      patients: patients.data,
      alerts: alerts.data as HealthAlert[],
    };
  }, [aggregates.data, patients.data, alerts.data]);

  return { data, loading, error, reload };
}

/* ------------------------------------------------------------------ */
/* Alertas                                                             */
/* ------------------------------------------------------------------ */

export function useAlerts() {
  const alerts = useAsyncData(healthTestsApi.listAlerts);
  const patients = useAsyncData(healthTestsApi.listPatients);
  const tests = useAsyncData(healthTestsApi.listTests);
  const [statusChanges, setStatusChanges] = useState<
    Record<string, HealthAlert["status"]>
  >({});

  const loading = alerts.loading || patients.loading || tests.loading;
  const error = alerts.error ?? patients.error ?? tests.error;

  const reload = useCallback(() => {
    void alerts.reload();
    void patients.reload();
    void tests.reload();
  }, [alerts, patients, tests]);

  /** Mock: transición de estado local (mañana: PATCH al backend). */
  const changeStatus = useCallback(
    (alertId: string, status: HealthAlert["status"]) => {
      setStatusChanges((prev) => ({ ...prev, [alertId]: status }));
    },
    [],
  );

  const data = useMemo(() => {
    if (!alerts.data || !patients.data || !tests.data) return null;
    return {
      alerts: alerts.data.map((a) => ({
        ...a,
        status: statusChanges[a.id] ?? a.status,
      })),
      patients: patients.data,
      tests: tests.data,
    };
  }, [alerts.data, patients.data, tests.data, statusChanges]);

  return { data, loading, error, reload, changeStatus };
}

/* ------------------------------------------------------------------ */
/* Tabla maestra de pacientes                                          */
/* ------------------------------------------------------------------ */

export function useMasterPatients() {
  const rows = useAsyncData(healthTestsApi.getMasterRows);
  const tests = useAsyncData(healthTestsApi.listTests);
  const professionals = useAsyncData(healthTestsApi.listProfessionals);

  const loading = rows.loading || tests.loading || professionals.loading;
  const error = rows.error ?? tests.error ?? professionals.error;

  const reload = useCallback(() => {
    void rows.reload();
    void tests.reload();
    void professionals.reload();
  }, [rows, tests, professionals]);

  const data = useMemo(() => {
    if (!rows.data || !tests.data || !professionals.data) return null;
    return {
      rows: rows.data as PatientMasterRow[],
      tests: tests.data as HealthTest[],
      professionals: professionals.data as HealthProfessional[],
    };
  }, [rows.data, tests.data, professionals.data]);

  return { data, loading, error, reload };
}

/* ------------------------------------------------------------------ */
/* Detalle del paciente                                                */
/* ------------------------------------------------------------------ */

export interface PatientDetailData {
  patient: PatientProfile;
  alerts: HealthAlert[];
  /** Evaluaciones del paciente con número de intento (historial del hub). */
  evaluations: PatientEvaluation[];
}

export function usePatientDetail(patientId: string) {
  const patient = useAsyncData(() => healthTestsApi.getPatient(patientId));
  const evaluations = useAsyncData(() =>
    healthTestsApi.getPatientEvaluations(patientId).then(withAttempts),
  );
  const alerts = useAsyncData(healthTestsApi.listAlerts);

  const loading = patient.loading || evaluations.loading || alerts.loading;
  const error = patient.error ?? evaluations.error ?? alerts.error;

  const reload = useCallback(() => {
    void patient.reload();
    void evaluations.reload();
    void alerts.reload();
  }, [patient, evaluations, alerts]);

  const data = useMemo<PatientDetailData | null>(() => {
    if (!patient.data || !evaluations.data || !alerts.data) return null;
    return {
      patient: patient.data,
      alerts: alerts.data as HealthAlert[],
      evaluations: evaluations.data as PatientEvaluation[],
    };
  }, [patient.data, evaluations.data, alerts.data]);

  const notFound = patient.errorCode === "not-found" && !patient.data;

  return { data, loading, error, notFound, reload };
}

/* ------------------------------------------------------------------ */
/* Detalle de evaluación (resultado individual)                        */
/* ------------------------------------------------------------------ */

export function useEvaluationDetail(patientId: string, evaluationId: string) {
  const detail = useAsyncData(() =>
    healthTestsApi.getEvaluationDetail(patientId, evaluationId),
  );

  const notFound = detail.errorCode === "not-found" && detail.data === null;

  return {
    detail: detail.data,
    loading: detail.loading,
    error: detail.error,
    notFound,
    reload: detail.reload,
  };
}

/* ------------------------------------------------------------------ */
/* Catálogo + baterías                                                 */
/* ------------------------------------------------------------------ */

export function useCatalog() {
  const tests = useAsyncData(healthTestsApi.listTests);
  const batteries = useAsyncData(healthTestsApi.listBatteries);
  const indicators = useAsyncData(healthTestsApi.listIndicators);

  const loading = tests.loading || batteries.loading || indicators.loading;
  const error = tests.error ?? batteries.error ?? indicators.error;

  const reload = useCallback(() => {
    void tests.reload();
    void batteries.reload();
    void indicators.reload();
  }, [tests, batteries, indicators]);

  const data = useMemo(() => {
    if (!tests.data || !batteries.data || !indicators.data) return null;
    return {
      tests: tests.data as HealthTest[],
      batteries: batteries.data as Battery[],
      indicators: indicators.data as ClinicalIndicator[],
    };
  }, [tests.data, batteries.data, indicators.data]);

  return { data, loading, error, reload };
}
