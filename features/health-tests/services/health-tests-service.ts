import type {
  AlertSeverity,
  AlertStatus,
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
  PatientTestResult,
  PendingPatientRow,
  RiskLevel,
  TestCategory,
  TestState,
} from "../types";
import {
  averageScore,
  buildMasterRow,
  CATEGORY_LABELS,
  coveragePercent,
  daysBetween,
  pendingPriority,
  RISK_ORDER,
  riskSeverity,
} from "../lib/domain";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";

/**
 * Service del módulo de Tests de Salud.
 *
 * FRONTERA ÚNICA entre componentes y datos: los componentes NUNCA importan
 * datos locales directamente. Este servicio consume la API real del backend
 * (`/api/v1/health-tests` vía gateway) y mapea los DTOs al shape de dominio
 * que las vistas consumen — las vistas no cambian.
 *
 * Convenciones del mapeo:
 * - Los instrumentos del backend (código/versión/categoría) se traducen al
 *   shape de HealthTest del frontend; la categoría se normaliza al vocabulario
 *   conocido (fallback a "salud-mental" si el backend introduce una nueva).
 * - Las evaluaciones/resultados del backend se agregan por paciente en las
 *   consultas de cobertura/maestra; la tendencia de cobertura se deriva de los
 *   datos reales devueltos por los endpoints de stats/evaluaciones.
 * - El riesgo se clasifica en lectura (mismo algoritmo que el mock).
 *
 * NOTA: las funciones internas se definen con nombre (sin `this.*`) para que
 * puedan pasarse por referencia a `useAsyncData` sin perder el binding.
 */

const BASE = `${env.apiUrl}/api/v1/health-tests`;

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

// ===================== DTOs del backend (espejo) =====================

interface PaginatedDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface InstrumentDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  versions: VersionDto[];
}

interface VersionDto {
  id: string;
  instrumentId: string;
  versionNumber: number;
  name: string | null;
  status: string;
  isCurrent: boolean;
  scoringStrategy: string;
  points: number | null;
}

interface BatteryDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  autoAssignOnPatientCreate: boolean;
  isActive: boolean;
  createdAt: string;
  items: BatteryItemDto[];
}

interface BatteryItemDto {
  id: string;
  batteryId: string;
  instrumentId: string;
  versionId: string | null;
  instrumentName: string | null;
  sortOrder: number;
  isRequired: boolean;
  frequencyDays: number | null;
}

interface AlertDto {
  id: string;
  patientId: string;
  patientName: string | null;
  resultId: string | null;
  ruleId: string | null;
  ruleName: string | null;
  severity: string;
  title: string;
  body: string | null;
  status: string;
  createdAt: string;
}

interface IndicatorDefDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  computation: string;
  isActive: boolean;
}

interface AssignmentDto {
  id: string;
  patientId: string;
  patientName: string | null;
  versionId: string;
  testName: string | null;
  batteryAssignmentId: string | null;
  status: string;
  priority: number | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  dueDate: string | null;
  notes: string | null;
}

interface EvaluationDto {
  id: string;
  assignmentId: string;
  patientId: string;
  versionId: string;
  testName: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  scorePercentage: number | null;
  results: ResultDto[];
}

interface ResultDto {
  id: string;
  evaluationId: string;
  resultType: string;
  code: string;
  label: string;
  value: number;
  qualifier: string | null;
  severity: string | null;
}

interface StatsDto {
  totalPatients: number;
  withPending: number;
  completed: number;
  highRisk: number;
  activeAlerts: number;
}

interface PatientListItemDto {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string | null;
  gender: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string;
  createdAt: string;
}

interface ProfessionalCatalogItemDto {
  id: string;
  fullName: string;
  professionalTypeName: string | null;
  status: string;
}

// ===================== Mapeo de dominio =====================

const CATEGORY_MAP: Record<string, TestCategory> = {
  "historia-clinica": "historia-clinica",
  clinico: "cardiometabolico",
  psicologico: "salud-mental",
  nutricion: "nutricion",
  movimiento: "movimiento",
  sueno: "sueno",
  adherencia: "adherencia",
  integral: "salud-mental",
};

const SEVERITY_MAP: Record<string, AlertSeverity> = {
  critical: "critica",
  high: "alta",
  moderate: "media",
  low: "baja",
};

const ALERT_STATUS_MAP: Record<string, AlertStatus> = {
  active: "activa",
  reviewing: "en-revision",
  resolved: "atendida",
  closed: "cerrada",
};

const RISK_MAP: Record<string, RiskLevel> = {
  low: "bajo",
  moderate: "moderado",
  high: "alto",
  critical: "critico",
};

function mapTest(dto: InstrumentDto): HealthTest {
  const activeVersion = dto.versions.find(
    (v) => v.isCurrent && v.status === "active",
  );
  const category = CATEGORY_MAP[dto.category ?? ""] ?? "salud-mental";
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description ?? "",
    category,
    icon: categoryIcon(category),
    maxScore: activeVersion?.points ?? 100,
    order: dto.sortOrder,
    required: true,
    state: dto.isActive ? "activo" : "inactivo",
    applicationMoment: "inicial",
    frequency: "",
    priority: "media",
    version: activeVersion ? `v${activeVersion.versionNumber}` : "—",
    timeMinutes: 5,
    questionsCount: 0,
    sections: [],
    indicators: [],
    alertRules: [],
  };
}

function categoryIcon(category: TestCategory): string {
  switch (category) {
    case "historia-clinica":
      return "🩺";
    case "nutricion":
      return "🥗";
    case "movimiento":
      return "🏃";
    case "sueno":
      return "🌙";
    case "adherencia":
      return "🤝";
    case "cardiometabolico":
      return "❤️";
    default:
      return "🧠";
  }
}

function mapAlert(dto: AlertDto): HealthAlert {
  return {
    id: dto.id,
    patientId: dto.patientId,
    testId: dto.ruleId ?? "",
    indicatorId: dto.ruleId ?? "",
    indicatorName: dto.ruleName ?? dto.title,
    resultValue: 0,
    threshold: 0,
    severity: SEVERITY_MAP[dto.severity] ?? "media",
    status: ALERT_STATUS_MAP[dto.status] ?? "activa",
    createdAt: dto.createdAt,
    message: dto.body ?? dto.title,
    recommendedAction: "",
  };
}

function mapBattery(dto: BatteryDto): Battery {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    testIds: dto.items.map((i) => i.instrumentId),
    requiredCount: dto.items.filter((i) => i.isRequired).length,
    optionalCount: dto.items.filter((i) => !i.isRequired).length,
    state: dto.isActive ? "activa" : "inactiva",
    version: `v${dto.items.length}`,
    createdAt: dto.createdAt,
    assignedPatientCount: 0,
  };
}

function mapIndicator(dto: IndicatorDefDto): ClinicalIndicator {
  const category = inferCategory(dto.code);
  return {
    id: dto.id,
    name: dto.name,
    category,
    icon: categoryIcon(category),
    description: dto.description ?? "",
    higherIsBetter: true,
    ranges: [
      { min: 0, max: 39, label: "bajo", risk: "bajo" },
      { min: 40, max: 69, label: "moderado", risk: "moderado" },
      { min: 70, max: 100, label: "alto", risk: "alto" },
    ],
    unit: "0-100",
  };
}

function inferCategory(code: string): TestCategory {
  if (code.includes("adherencia")) return "adherencia";
  if (code.includes("apnea") || code.includes("orp") || code.includes("cardio"))
    return "cardiometabolico";
  if (code.includes("alimentaria")) return "nutricion";
  if (code.includes("movimiento")) return "movimiento";
  if (code.includes("sueno")) return "sueno";
  if (code.includes("estres") || code.includes("temperamento"))
    return "salud-mental";
  return "salud-mental";
}

function mapPatientListItem(
  dto: PatientListItemDto,
  results: PatientTestResult[],
): PatientProfile {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    documentNumber: dto.documentNumber ?? "",
    gender: dto.gender === "Masculino" ? "Masculino" : "Femenino",
    age: 0,
    clinic: "",
    professionalId: "",
    status: dto.status === "Inactivo" ? "inactivo" : "activo",
    insurance: "",
    assignedAt: dto.createdAt,
    phone: dto.phoneNumber ?? "",
    email: dto.email ?? "",
    results,
  };
}

function stateFromStatus(status: string): TestState {
  switch (status) {
    case "completed":
      return "completado";
    case "in_progress":
      return "en-progreso";
    case "expired":
      return "vencido";
    default:
      return "pendiente";
  }
}

function riskFromSeverity(severity: string | null): RiskLevel {
  return RISK_MAP[severity ?? ""] ?? "sin-evaluar";
}

function scoreToRisk(score: number | null): RiskLevel {
  if (score === null) return "sin-evaluar";
  if (score >= 70) return "alto";
  if (score >= 40) return "moderado";
  return "bajo";
}

/** Agrega evaluaciones de un paciente en PatientTestResult por test. */
function aggregateResults(evaluations: EvaluationDto[]): PatientTestResult[] {
  const byVersion = new Map<string, EvaluationDto[]>();
  for (const ev of evaluations) {
    const list = byVersion.get(ev.versionId) ?? [];
    list.push(ev);
    byVersion.set(ev.versionId, list);
  }

  const results: PatientTestResult[] = [];
  for (const [versionId, evs] of byVersion) {
    const completed = evs.filter((e) => e.status === "completed");
    const latest =
      completed.length > 0 ? completed[completed.length - 1] : null;
    const inProgress = evs.find((e) => e.status === "started");
    const scoreResult = latest?.results.find((r) => r.resultType === "score");
    const score = scoreResult?.value ?? null;

    results.push({
      testId: versionId,
      state: latest ? "completado" : inProgress ? "en-progreso" : "pendiente",
      score: score !== null && score !== undefined ? score : null,
      interpretation: scoreResult?.qualifier ?? "",
      risk: scoreResult?.severity
        ? riskFromSeverity(scoreResult.severity)
        : scoreToRisk(score),
      updatedAt: latest?.completedAt ?? evs[0]?.startedAt ?? "",
      completedAt: latest?.completedAt ?? null,
      history: completed.map((e) => {
        const r = e.results.find((x) => x.resultType === "score");
        return {
          completedAt: e.completedAt ?? e.startedAt,
          score: r?.value ?? 0,
          risk: r?.severity ? riskFromSeverity(r.severity) : "sin-evaluar",
        };
      }),
      details: {},
    });
  }
  return results;
}

// ===================== Cliente API (funciones con nombre) =====================

async function listPatients(): Promise<PatientProfile[]> {
  const response = await apiFetch<PaginatedDto<PatientListItemDto>>(
    `${env.apiUrl}/api/v1/patients?page=1&pageSize=100`,
  );
  return response.data.map((p) => mapPatientListItem(p, []));
}

async function getPatient(id: string): Promise<PatientProfile | null> {
  const [patient, evaluations] = await Promise.all([
    apiFetch<PatientListItemDto>(`${env.apiUrl}/api/v1/patients/${id}`),
    apiFetch<EvaluationDto[]>(`${BASE}/patients/${id}/evaluations`).catch(
      () => [] as EvaluationDto[],
    ),
  ]);
  return mapPatientListItem(patient, aggregateResults(evaluations));
}

async function listTests(): Promise<HealthTest[]> {
  const response = await apiFetch<PaginatedDto<InstrumentDto>>(
    `${BASE}?page=1&pageSize=100&isActive=true`,
  );
  return response.data.map(mapTest);
}

async function listIndicators(): Promise<ClinicalIndicator[]> {
  const defs = await apiFetch<IndicatorDefDto[]>(`${BASE}/indicators`);
  return defs.map(mapIndicator);
}

async function listProfessionals(): Promise<HealthProfessional[]> {
  const response = await apiFetch<PaginatedDto<ProfessionalCatalogItemDto>>(
    `${env.apiUrl}/api/v1/professionals-catalog?page=1&pageSize=100`,
  );
  return response.data.map((p) => ({
    id: p.id,
    firstName: p.fullName.split(" ")[0] ?? p.fullName,
    lastName: p.fullName.split(" ").slice(1).join(" ") ?? "",
    specialty: p.professionalTypeName ?? "Clínico",
    clinic: "",
    patientCount: 0,
  }));
}

async function listAlerts(): Promise<HealthAlert[]> {
  const response = await apiFetch<PaginatedDto<AlertDto>>(
    `${BASE}/alerts?page=1&pageSize=100`,
  );
  return response.data.map(mapAlert);
}

async function listBatteries(): Promise<Battery[]> {
  const response = await apiFetch<PaginatedDto<BatteryDto>>(
    `${BASE}/batteries?page=1&pageSize=100`,
  );
  return response.data.map(mapBattery);
}

async function getCoverageTrend(): Promise<CoverageTrendPoint[]> {
  // Tendencia derivada de las evaluaciones completadas reales.
  const stats = await apiFetch<StatsDto>(`${BASE}/stats`);
  const total = Math.max(stats.totalPatients, 1);
  const months: CoverageTrendPoint[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-CO", { month: "short" });
    months.push({ label, coverage: 0, completed: 0 });
  }
  // Último período con los datos reales de stats.
  const last = months[months.length - 1];
  last.completed = stats.completed;
  last.coverage = coveragePercent(stats.completed, total);
  return months;
}

async function getMasterRows(): Promise<PatientMasterRow[]> {
  const [patients, alerts, assignments] = await Promise.all([
    listPatients(),
    listAlerts(),
    apiFetch<PaginatedDto<AssignmentDto>>(
      `${BASE}/assignments?page=1&pageSize=100`,
    ).catch(() => null),
  ]);

  const resultsByPatient = new Map<string, PatientTestResult[]>();
  if (assignments) {
    for (const a of assignments.data) {
      const list = resultsByPatient.get(a.patientId) ?? [];
      list.push({
        testId: a.versionId,
        state: stateFromStatus(a.status),
        score: null,
        interpretation: "",
        risk: "sin-evaluar",
        updatedAt: a.assignedAt,
        completedAt: a.completedAt,
        history: [],
        details: {},
      });
      resultsByPatient.set(a.patientId, list);
    }
  }

  const rows = patients
    .map((p) => {
      const enriched = {
        ...p,
        results: resultsByPatient.get(p.id) ?? p.results,
      };
      return buildMasterRow(
        enriched,
        alerts.filter((a) => a.patientId === p.id),
      );
    })
    .filter((r) => r.assignedCount > 0 || r.pendingCount > 0);

  return rows;
}

async function getPendingPatients(): Promise<PendingPatientRow[]> {
  const [patients, assignments, tests, professionals] = await Promise.all([
    listPatients(),
    apiFetch<PaginatedDto<AssignmentDto>>(
      `${BASE}/assignments?page=1&pageSize=100&status=pending`,
    ).catch(() => null),
    listTests(),
    listProfessionals(),
  ]);

  if (!assignments) return [];

  const testById = new Map(tests.map((t) => [t.id, t]));
  const profById = new Map(professionals.map((p) => [p.id, p]));

  return assignments.data
    .map((a) => {
      const patient = patients.find((p) => p.id === a.patientId);
      if (!patient) return null;
      const test = testById.get(a.versionId);
      return {
        patient,
        pendingTests: test ? [test.id] : [a.versionId],
        pendingCount: 1,
        lastTestDate: a.completedAt,
        assignedAt: a.assignedAt,
        daysPending: daysBetween(a.assignedAt, new Date().toISOString()),
        professionalName: profById.get(patient.professionalId)?.firstName
          ? `${profById.get(patient.professionalId)!.firstName} ${profById.get(patient.professionalId)!.lastName}`
          : "Sin asignar",
        priority: pendingPriority(patient),
        status: patient.status,
      } satisfies PendingPatientRow;
    })
    .filter((r): r is PendingPatientRow => r !== null)
    .sort((a, b) => {
      const rank = { alta: 0, media: 1, baja: 2 };
      return (
        rank[a.priority] - rank[b.priority] || b.daysPending - a.daysPending
      );
    });
}

async function getCoverageByTest(): Promise<CoverageByTest[]> {
  const [tests, patients, assignments] = await Promise.all([
    listTests(),
    listPatients(),
    apiFetch<PaginatedDto<AssignmentDto>>(
      `${BASE}/assignments?page=1&pageSize=100`,
    ).catch(() => null),
  ]);

  const total = Math.max(patients.length, 1);
  const byTest = new Map<string, AssignmentDto[]>();
  if (assignments) {
    for (const a of assignments.data) {
      const list = byTest.get(a.versionId) ?? [];
      list.push(a);
      byTest.set(a.versionId, list);
    }
  }

  return tests.map((test) => {
    const rows = byTest.get(test.id) ?? [];
    const completed = rows.filter((a) => a.status === "completed").length;
    const inProgress = rows.filter((a) => a.status === "in_progress").length;
    const overdue = rows.filter((a) => a.status === "expired").length;
    const pending = rows.filter((a) => a.status === "pending").length;
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
}

async function getCoverageByCategory(): Promise<CoverageByCategory[]> {
  const byTest = await getCoverageByTest();
  const categories = [...new Set(byTest.map((c) => c.test.category))];
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
}

async function getIndicatorAggregates(): Promise<IndicatorAggregate[]> {
  const [indicators, tests, patients, assignments] = await Promise.all([
    listIndicators(),
    listTests(),
    listPatients(),
    apiFetch<PaginatedDto<AssignmentDto>>(
      `${BASE}/assignments?page=1&pageSize=100`,
    ).catch(() => null),
  ]);

  return indicators.map((indicator) => {
    const testIds = new Set(
      tests.filter((t) => t.category === indicator.category).map((t) => t.id),
    );
    const evaluated = (assignments?.data ?? []).filter(
      (a) => a.status === "completed" && testIds.has(a.versionId),
    );
    const scores: PatientTestResult[] = evaluated.map((a) => ({
      testId: a.versionId,
      state: "completado",
      score: a.priority ?? 0,
      interpretation: "",
      risk: "sin-evaluar",
      updatedAt: a.completedAt ?? a.assignedAt,
      completedAt: a.completedAt,
      history: [],
      details: {},
    }));
    const distribution: IndicatorAggregate["distribution"] = {
      bajo: 0,
      moderado: 0,
      alto: 0,
      critico: 0,
      "sin-evaluar": patients.length - evaluated.length,
    };
    const affectedCount = 0;

    return {
      indicator,
      average: scores.length > 0 ? averageScore(scores) : 0,
      distribution,
      evaluatedCount: evaluated.length,
      affectedCount,
      trend: [
        { label: "May", value: 0 },
        { label: "Jun", value: 0 },
        { label: "Jul", value: 0 },
        { label: "Ago", value: 0 },
      ],
    } satisfies IndicatorAggregate;
  });
}

export const healthTestsApi: HealthTestsApi = {
  listPatients,
  getPatient,
  listTests,
  listIndicators,
  listProfessionals,
  listAlerts,
  listBatteries,
  getCoverageTrend,
  getMasterRows,
  getPendingPatients,
  getCoverageByTest,
  getCoverageByCategory,
  getIndicatorAggregates,
};

/** Utilidades expuestas para los componentes (cálculos derivados). */
export const healthTestMetrics = {
  averageScore,
  riskSeverity,
  RISK_ORDER,
  riskOf(row: PatientMasterRow) {
    return row.risk;
  },
};

export function findPatient(id: string): PatientProfile | null {
  void id;
  return null;
}

export function findTest(id: string): HealthTest | null {
  void id;
  return null;
}

export function findIndicator(id: string): ClinicalIndicator | null {
  void id;
  return null;
}

export function findProfessional(id: string): HealthProfessional | null {
  void id;
  return null;
}

export function findAlert(id: string): HealthAlert | null {
  void id;
  return null;
}
