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
  PatientMasterRow,
  PatientProfile,
  PendingPatientRow,
} from "../types";
import {
  activeAlertCount,
  averageScore,
  buildMasterRow,
  CATEGORY_LABELS,
  coveragePercent,
  daysBetween,
  patientRisk,
  pendingPriority,
  RISK_ORDER,
  riskSeverity,
} from "../lib/domain";
import {
  ALERTS,
  BATTERIES,
  COVERAGE_TREND,
  INDICATORS,
  PATIENTS,
  PROFESSIONALS,
  TESTS,
} from "../data/mock-data";

/**
 * Service del módulo de Tests de Salud.
 *
 * FRONTERA ÚNICA entre componentes y datos: los componentes NUNCA importan
 * mock-data directamente. Para conectar APIs reales, basta reemplazar estas
 * funciones por llamadas fetch (misma firma) — las vistas no cambian.
 *
 * Todas las métricas se DERIVAN de los datos (nada hardcodeado en la UI).
 */

export interface HealthTestsApi {
  listPatients(): Promise<PatientProfile[]>;
  getPatient(id: string): Promise<PatientProfile | null>;
  listTests(): Promise<HealthTest[]>;
  listIndicators(): Promise<ClinicalIndicator[]>;
  listProfessionals(): Promise<HealthProfessional[]>;
  listAlerts(): Promise<HealthAlert[]>;
  listBatteries(): Promise<Battery[]>;
  getCoverageTrend(): Promise<CoverageTrendPoint[]>;
  getMasterRows(): Promise<PatientMasterRow[]>;
  getPendingPatients(): Promise<PendingPatientRow[]>;
  getCoverageByTest(): Promise<CoverageByTest[]>;
  getCoverageByCategory(): Promise<CoverageByCategory[]>;
  getIndicatorAggregates(): Promise<IndicatorAggregate[]>;
}

/** Mock con latencia simulada para sentir la UX real de carga. */
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export const healthTestsApi: HealthTestsApi = {
  async listPatients() {
    await delay();
    return [...PATIENTS];
  },

  async getPatient(id: string) {
    await delay(200);
    return PATIENTS.find((p) => p.id === id) ?? null;
  },

  async listTests() {
    await delay();
    return [...TESTS];
  },

  async listIndicators() {
    await delay();
    return [...INDICATORS];
  },

  async listProfessionals() {
    await delay();
    return [...PROFESSIONALS];
  },

  async listAlerts() {
    await delay();
    return [...ALERTS];
  },

  async listBatteries() {
    await delay();
    return [...BATTERIES];
  },

  async getCoverageTrend() {
    await delay();
    return [...COVERAGE_TREND];
  },

  async getMasterRows() {
    await delay();
    return PATIENTS.map((p) => buildMasterRow(p, ALERTS));
  },

  async getPendingPatients() {
    await delay();
    return PATIENTS.filter(
      (p) =>
        p.status === "activo" &&
        p.results.some((r) => r.state === "pendiente" || r.state === "vencido"),
    )
      .map((p) => {
        const pending = p.results.filter(
          (r) => r.state === "pendiente" || r.state === "vencido",
        );
        const completedDates = p.results
          .map((r) => r.completedAt)
          .filter((d): d is string => Boolean(d))
          .sort();
        const professional = PROFESSIONALS.find(
          (pr) => pr.id === p.professionalId,
        );
        return {
          patient: p,
          pendingTests: pending.map((r) => r.testId),
          pendingCount: pending.length,
          lastTestDate:
            completedDates.length > 0
              ? completedDates[completedDates.length - 1]
              : null,
          assignedAt: p.assignedAt,
          daysPending: daysBetween(p.assignedAt, new Date().toISOString()),
          professionalName: professional
            ? `${professional.firstName} ${professional.lastName}`
            : "Sin asignar",
          priority: pendingPriority(p),
          status: p.status,
        } satisfies PendingPatientRow;
      })
      .sort((a, b) => {
        const rank = { alta: 0, media: 1, baja: 2 };
        return (
          rank[a.priority] - rank[b.priority] || b.daysPending - a.daysPending
        );
      });
  },

  async getCoverageByTest() {
    await delay();
    return TESTS.map((test) => {
      let completed = 0;
      let inProgress = 0;
      let pending = 0;
      let overdue = 0;
      for (const p of PATIENTS) {
        const r = p.results.find((x) => x.testId === test.id);
        if (!r) {
          pending += 1;
          continue;
        }
        if (r.state === "completado") completed += 1;
        else if (r.state === "en-progreso") inProgress += 1;
        else if (r.state === "vencido") overdue += 1;
        else pending += 1;
      }
      const total = PATIENTS.length;
      return {
        test,
        completed,
        inProgress,
        pending,
        overdue,
        coverage: coveragePercent(completed, total),
        total,
      } satisfies CoverageByTest;
    });
  },

  async getCoverageByCategory() {
    await delay();
    const byTest = await this.getCoverageByTest();
    const categories = [...new Set(TESTS.map((t) => t.category))];
    return categories.map((category) => {
      const tests = byTest.filter((c) => c.test.category === category);
      const completed = tests.reduce((acc, c) => acc + c.completed, 0);
      const total = tests.reduce((acc, c) => acc + c.total, 0);
      return {
        category,
        categoryName: CATEGORY_LABELS[category],
        completed,
        total,
        coverage: coveragePercent(completed, total),
      } satisfies CoverageByCategory;
    });
  },

  async getIndicatorAggregates() {
    await delay();
    return INDICATORS.map((indicator) => {
      const testIds = new Set(
        TESTS.filter((t) => t.indicators.includes(indicator.id)).map(
          (t) => t.id,
        ),
      );
      const evaluated = PATIENTS.filter((p) =>
        p.results.some(
          (r) =>
            testIds.has(r.testId) &&
            r.state === "completado" &&
            r.score !== null,
        ),
      );

      const scores: number[] = [];
      const distribution: Record<string, number> = {
        bajo: 0,
        moderado: 0,
        alto: 0,
        critico: 0,
        "sin-evaluar": 0,
      };
      let affectedCount = 0;

      for (const p of evaluated) {
        const r = p.results.find(
          (x) => testIds.has(x.testId) && x.state === "completado",
        );
        if (!r || r.score === null) continue;
        scores.push(r.score);
        distribution[r.risk] = (distribution[r.risk] ?? 0) + 1;
        const worstRange = indicator.ranges[indicator.ranges.length - 1];
        if (r.risk === "alto" || r.risk === "critico") affectedCount += 1;
        void worstRange;
      }

      const average = averageScore(
        evaluated.flatMap((p) =>
          p.results.filter((r) => testIds.has(r.testId)),
        ),
      );

      const trend = buildTrend(indicator.id);

      return {
        indicator,
        average,
        distribution: distribution as IndicatorAggregate["distribution"],
        evaluatedCount: evaluated.length,
        affectedCount,
        trend,
      } satisfies IndicatorAggregate;
    });
  },
};

/** Serie de evolución del promedio por indicador (4 períodos). */
function buildTrend(indicatorId: string): IndicatorAggregate["trend"] {
  const base: Record<string, number> = {
    adherencia: 56,
    "riesgo-cardiometabolico": 48,
    "calidad-alimentaria": 55,
    "nivel-movimiento": 58,
    "calidad-sueno": 52,
    "riesgo-apnea": 30,
    "estres-relacional": 46,
    temperamento: 60,
  };
  const current = base[indicatorId] ?? 50;
  const drift = [current - 6, current - 3, current - 1, current];
  const labels = ["May", "Jun", "Jul", "Ago"];
  return labels.map((label, i) => ({
    label,
    value: Math.max(5, Math.min(95, Math.round(drift[i]))),
  }));
}

/** Utilidades expuestas para los componentes (cálculos derivados). */
export const healthTestMetrics = {
  averageScore,
  patientRisk,
  activeAlertCount,
  riskSeverity,
  RISK_ORDER,
  riskOf(row: PatientMasterRow) {
    return row.risk;
  },
};

export function findPatient(id: string): PatientProfile | undefined {
  return PATIENTS.find((p) => p.id === id);
}

export function findTest(id: string): HealthTest | undefined {
  return TESTS.find((t) => t.id === id);
}

export function findIndicator(id: string): ClinicalIndicator | undefined {
  return INDICATORS.find((i) => i.id === id);
}

export function findProfessional(id: string): HealthProfessional | undefined {
  return PROFESSIONALS.find((p) => p.id === id);
}

export function findAlert(id: string): HealthAlert | undefined {
  return ALERTS.find((a) => a.id === id);
}
