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
  masterRows: PatientMasterRow[];
  tests: HealthTest[];
  alerts: HealthAlert[];
  professionals: HealthProfessional[];
  coverageTrend: CoverageTrendPoint[];
  stats: HealthTestStats;
}

export function useDashboard() {
  const masterRows = useAsyncData(healthTestsApi.getMasterRows);
  const tests = useAsyncData(healthTestsApi.listTests);
  const alerts = useAsyncData(healthTestsApi.listAlerts);
  const trend = useAsyncData(healthTestsApi.getCoverageTrend);
  const stats = useAsyncData(healthTestsApi.getStats);

  const loading =
    masterRows.loading ||
    tests.loading ||
    alerts.loading ||
    trend.loading ||
    stats.loading;
  const error =
    masterRows.error ??
    tests.error ??
    alerts.error ??
    trend.error ??
    stats.error;

  const reload = useCallback(() => {
    void masterRows.reload();
    void tests.reload();
    void alerts.reload();
    void trend.reload();
    void stats.reload();
  }, [masterRows, tests, alerts, trend, stats]);

  const data = useMemo<DashboardData | null>(() => {
    if (
      !masterRows.data ||
      !tests.data ||
      !alerts.data ||
      !trend.data ||
      !stats.data
    ) {
      return null;
    }
    return {
      patients: (masterRows.data as PatientMasterRow[]).map((r) => r.patient),
      masterRows: masterRows.data as PatientMasterRow[],
      tests: tests.data,
      alerts: alerts.data,
      professionals: [] as HealthProfessional[],
      coverageTrend: trend.data,
      stats: stats.data,
    };
  }, [masterRows.data, tests.data, alerts.data, trend.data, stats.data]);

  return { data, loading, error, reload, metrics: healthTestMetrics };
}

/* ------------------------------------------------------------------ */
/* Cobertura                                                           */
/* ------------------------------------------------------------------ */

export function useCoverage() {
  const byTest = useAsyncData(healthTestsApi.getCoverageByTest);
  // byCategory se deriva de byTest en memoria (sin segundo fetch)
  const byCategory = useMemo(() => {
    if (!byTest.data) return null;
    const cats = [
      ...new Set((byTest.data as CoverageByTest[]).map((c) => c.test.category)),
    ];
    return cats.map((category) => {
      const tests = (byTest.data as CoverageByTest[]).filter(
        (c) => c.test.category === category,
      );
      const completed = tests.reduce((acc, c) => acc + c.completed, 0);
      const total = tests.reduce((acc, c) => acc + c.total, 0);
      return {
        category,
        categoryName: tests[0]?.test.category ?? category,
        completed,
        total,
        coverage: total === 0 ? 0 : Math.round((completed / total) * 100),
      } as CoverageByCategory;
    });
  }, [byTest.data]);
  const trend = useAsyncData(healthTestsApi.getCoverageTrend);
  const batteries = useAsyncData(healthTestsApi.listBatteries);

  const loading = byTest.loading || trend.loading || batteries.loading;
  const error = byTest.error ?? trend.error ?? batteries.error;

  const reload = useCallback(() => {
    void byTest.reload();
    void trend.reload();
    void batteries.reload();
  }, [byTest, trend, batteries]);

  const data = useMemo(() => {
    if (!byTest.data || !trend.data || !batteries.data || !byCategory) {
      return null;
    }
    return {
      byTest: byTest.data as CoverageByTest[],
      byCategory,
      trend: trend.data as CoverageTrendPoint[],
      totalPatients: (byTest.data as CoverageByTest[])[0]?.total ?? 0,
      batteries: batteries.data as Battery[],
    };
  }, [byTest.data, byCategory, trend.data, batteries.data]);

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

  const loading = aggregates.loading;
  const error = aggregates.error;

  const reload = useCallback(() => {
    void aggregates.reload();
  }, [aggregates]);

  const data = useMemo(() => {
    if (!aggregates.data) return null;
    return {
      aggregates: aggregates.data as IndicatorAggregate[],
      patients: [] as PatientProfile[],
      alerts: [] as HealthAlert[],
    };
  }, [aggregates.data]);

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
  const batteries = useAsyncData(healthTestsApi.listBatteries);

  const loading =
    rows.loading || tests.loading || professionals.loading || batteries.loading;
  const error =
    rows.error ?? tests.error ?? professionals.error ?? batteries.error;

  const reload = useCallback(() => {
    void rows.reload();
    void tests.reload();
    void professionals.reload();
    void batteries.reload();
  }, [rows, tests, professionals, batteries]);

  const data = useMemo(() => {
    if (!rows.data || !tests.data || !professionals.data || !batteries.data)
      return null;
    return {
      rows: rows.data as PatientMasterRow[],
      tests: tests.data as HealthTest[],
      professionals: professionals.data as HealthProfessional[],
      batteries: batteries.data as Battery[],
    };
  }, [rows.data, tests.data, professionals.data, batteries.data]);

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
  const alerts = useAsyncData(() => healthTestsApi.listAlerts(patientId));

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

  const notFound =
    !data &&
    (patient.errorCode === "not-found" ||
      patient.errorCode === "bad-request" ||
      evaluations.errorCode === "not-found" ||
      alerts.errorCode === "not-found" ||
      alerts.errorCode === "bad-request");

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
