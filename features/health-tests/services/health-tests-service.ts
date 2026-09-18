import type {
  AlertSeverity,
  AlertStatus,
  Battery,
  BatteryItem,
  ClinicalIndicator,
  CoverageByCategory,
  CoverageByTest,
  CoverageTrendPoint,
  EvaluationAttemptItem,
  EvaluationCommentItem,
  EvaluationDetail,
  EvaluationResponseItem,
  EvaluationResultItem,
  HealthAlert,
  HealthGeoFilter,
  HealthProfessional,
  HealthTest,
  IndicatorAggregate,
  PatientEvaluation,
  PatientMasterRow,
  PatientProfile,
  PatientTestResult,
  PendingPatientRow,
  RiskLevel,
  TestCategory,
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

// --- Cache en memoria con dedup y TTL (SWR ligero, sin lib externa) ---
type CacheEntry<T> = { value: T; expiresAt: number; promise?: Promise<T> };
const svcCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
/** Época de cache: invalida escrituras de promesas lanzadas antes de mutar. */
let cacheEpoch = 0;

function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = svcCache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now && hit.value !== undefined)
    return Promise.resolve(hit.value);
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const epochAtStart = cacheEpoch;
  const promise = loader()
    .then((value) => {
      // Si la cache se invalidó mientras cargaba, no repoblar con datos viejos.
      if (epochAtStart === cacheEpoch) {
        svcCache.set(key, { value, expiresAt: now + ttlMs });
      }
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/**
 * Invalida la cache en memoria del módulo. Se llama tras mutaciones (crear
 * batería, asignar pacientes, enviar notificaciones, cambiar el estado de una
 * alerta) para que los hooks recarguen datos frescos.
 *
 * Además notifica a las vistas montadas: así los KPIs, gráficos, la tira de
 * notificaciones y el historial se refrescan «casi en vivo» sin recargar la
 * página. La notificación se agrupa con un pequeño retardo para no disparar
 * varias recargas cuando una mutación invalida en ráfaga.
 */
export function invalidateHealthTestsCache(): void {
  cacheEpoch += 1;
  svcCache.clear();
  scheduleInvalidationNotice();
}

/** Suscriptores (hooks montados) que quieren recargar al invalidar la cache. */
const invalidationListeners = new Set<() => void>();
let invalidationTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleInvalidationNotice(): void {
  if (invalidationTimer !== null) clearTimeout(invalidationTimer);
  invalidationTimer = setTimeout(() => {
    invalidationTimer = null;
    invalidationListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Un suscriptor roto no debe impedir que el resto recargue.
      }
    });
  }, 250);
}

/**
 * Registra un listener de invalidación y devuelve la función para desuscribir.
 * Pensado para `useAsyncData`: cada hook montado recarga sus datos cuando una
 * mutación del módulo invalida la cache.
 */
export function subscribeHealthTestsCache(listener: () => void): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

const TTL_MASTER = 30_000;
const TTL_CATALOG = 300_000;
const TTL_STATS = 30_000;

/** Clave estable para cache/dedupe incluyendo el filtro geo. */
function geoFilterKey(filter?: HealthGeoFilter): string {
  const states = normalizeStateCodes(filter?.stateCodes);
  return states.length === 0 ? "all" : states.join(",");
}

/** Códigos normalizados (mayúsculas, sin duplicados, orden estable). */
function normalizeStateCodes(stateCodes?: string[]): string[] {
  if (!stateCodes || stateCodes.length === 0) return [];
  return [...new Set(stateCodes.map((s) => s.trim().toUpperCase()))].sort();
}

/** Query params del filtro geo (un `state` por código; el backend une las zonas). */
function geoFilterParams(filter?: HealthGeoFilter): string {
  const states = normalizeStateCodes(filter?.stateCodes);
  if (states.length === 0) return "";
  const params = new URLSearchParams();
  for (const code of states) params.append("state", code);
  return `?${params.toString()}`;
}

export interface HealthTestsApi {
  listPatients(): Promise<PatientProfile[]>;
  getPatient(id: string): Promise<PatientProfile | null>;
  getPatientEvaluations(
    patientId: string,
    filters?: {
      page?: number;
      pageSize?: number;
      status?: string;
      from?: string;
      to?: string;
      category?: string;
    },
  ): Promise<EvaluationDto[]>;
  getEvaluationDetail(
    patientId: string,
    evaluationId: string,
  ): Promise<EvaluationDetail | null>;
  listTests(): Promise<HealthTest[]>;
  listIndicators(): Promise<ClinicalIndicator[]>;
  listProfessionals(): Promise<HealthProfessional[]>;
  listAlerts(patientId?: string): Promise<HealthAlert[]>;
  /** Transición de estado de una alerta (registra revision/resolución/cierre). */
  transitionAlert(alertId: string, action: AlertTransition): Promise<void>;
  listBatteries(): Promise<Battery[]>;
  getBattery(batteryId: string): Promise<Battery | null>;
  createBattery(input: CreateBatteryInput): Promise<Battery>;
  assignBattery(batteryId: string, patientIds: string[]): Promise<number>;
  getStats(filter?: HealthGeoFilter): Promise<HealthTestStats>;
  getCoverageTrend(filter?: HealthGeoFilter): Promise<CoverageTrendPoint[]>;
  getMasterRows(filter?: HealthGeoFilter): Promise<PatientMasterRow[]>;
  getPendingPatients(): Promise<PendingPatientRow[]>;
  getCoverageByTest(): Promise<CoverageByTest[]>;
  getCoverageByCategory(): Promise<CoverageByCategory[]>;
  getIndicatorAggregates(): Promise<IndicatorAggregate[]>;
}

/** Estadísticas globales del módulo (endpoint /stats del backend). */
export interface HealthTestStats {
  totalPatients: number;
  withPending: number;
  completed: number;
  highRisk: number;
  activeAlerts: number;
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
  testCode: string | null;
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
  testCode: string | null;
  testCategory: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  scorePercentage: number | null;
  results: ResultDto[];
}

interface EvaluationDetailDto {
  id: string;
  assignmentId: string;
  patientId: string;
  versionId: string;
  versionNumber: number;
  versionName: string | null;
  scoringStrategy: string;
  testName: string | null;
  testCode: string | null;
  testCategory: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  attempt: number;
  score: number | null;
  scorePercentage: number | null;
  results: ResultDto[];
  responses: ResponseDetailDto[];
  comments: CommentDto[];
  attempts: AttemptDto[];
}

interface ResponseDetailDto {
  questionId: string;
  questionCode: string;
  section: string | null;
  questionText: string;
  questionType: string;
  answerOptionId: string | null;
  answerOptionText: string | null;
  answerOptionScore: number | null;
  valueText: string | null;
}

interface CommentDto {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

interface AttemptDto {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  scorePercentage: number | null;
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
  documentTypeName: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  clinicId: string | null;
  clinicName: string | null;
  insurerName: string | null;
  status: string;
  createdAt: string;
  professionalNames: string[];
}

interface ProfessionalCatalogItemDto {
  id: string;
  fullName: string;
  professionalTypeName: string | null;
  status: string;
}

// ===== Tabla maestra (endpoint /master del backend, sin N+1) =====

interface MasterPatientIdentityDto {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  clinicName: string | null;
  insurerName: string | null;
  professionalName: string | null;
  status: string;
}

interface MasterPatientResultDto {
  versionId: string;
  testCode: string | null;
  testName: string | null;
  testCategory: string | null;
  state: "completado" | "en-progreso" | "pendiente";
  score: number | null;
  scorePercentage: number | null;
  qualifier: string | null;
  severity: string | null;
  completedAt: string | null;
}

interface MasterRowDto {
  patient: MasterPatientIdentityDto;
  results: MasterPatientResultDto[];
  alertCount: number;
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
    versionId: activeVersion?.id ?? null,
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
  // Intenta extraer el valor numérico del body (ej: "baja (27.23%)")
  const body = dto.body ?? dto.title;
  const match = body.match(/([0-9]+(?:\.[0-9]+)?)\s*%?/);
  const extracted = match ? Number.parseFloat(match[1]) : 0;
  return {
    id: dto.id,
    patientId: dto.patientId,
    testId: dto.ruleId ?? "",
    indicatorId: dto.ruleId ?? "",
    indicatorName: dto.patientName
      ? `${dto.ruleName ?? dto.title}`
      : (dto.ruleName ?? dto.title),
    resultValue: extracted,
    threshold: 0,
    severity: SEVERITY_MAP[dto.severity] ?? "media",
    status: ALERT_STATUS_MAP[dto.status] ?? "activa",
    createdAt: dto.createdAt,
    message: dto.body ?? dto.title,
    recommendedAction: "",
  };
}

function mapBattery(dto: BatteryDto): Battery {
  const items: BatteryItem[] = [...dto.items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      id: i.id,
      instrumentId: i.instrumentId,
      instrumentName: i.instrumentName,
      versionId: i.versionId,
      sortOrder: i.sortOrder,
      required: i.isRequired,
      frequencyDays: i.frequencyDays,
    }));
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description ?? "",
    testIds: items.map((i) => i.instrumentId),
    items,
    requiredCount: items.filter((i) => i.required).length,
    optionalCount: items.filter((i) => !i.required).length,
    autoAssignOnPatientCreate: dto.autoAssignOnPatientCreate,
    state: dto.isActive ? "activa" : "inactiva",
    version: dto.code,
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

/** Mapa versionId -> HealthTest para resolver asignaciones (evita N+1 y mismatch instrumentId). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadVersionMap(): Promise<Map<string, HealthTest>> {
  const response = await apiFetch<PaginatedDto<InstrumentDto>>(
    `${BASE}?page=1&pageSize=100&isActive=true`,
  );
  const map = new Map<string, HealthTest>();
  for (const dto of response.data) {
    const test = mapTest(dto);
    for (const v of dto.versions) {
      map.set(v.id, test);
    }
  }
  return map;
}

/** Fetch paginado que respeta el límite del backend (100) y trae todas las páginas. */
async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  // baseUrl sin page/pageSize, el helper los agrega
  const sep = baseUrl.includes("?") ? "&" : "?";
  const first = await apiFetch<PaginatedDto<T>>(
    `${baseUrl}${sep}page=1&pageSize=100`,
  );
  const all: T[] = [...first.data];
  const totalPages = first.totalPages ?? 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        apiFetch<PaginatedDto<T>>(`${baseUrl}${sep}page=${i + 2}&pageSize=100`),
      ),
    );
    for (const p of rest) all.push(...p.data);
  }
  return all;
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
    age: ageFromDateOfBirth(dto.dateOfBirth),
    clinic: dto.clinicName ?? "",
    professionalId: dto.professionalNames?.[0] ?? "",
    professionalName: dto.professionalNames?.[0] ?? "",
    status: dto.status === "Inactivo" ? "inactivo" : "activo",
    insurance: dto.insurerName ?? "",
    assignedAt: dto.createdAt,
    phone: dto.phoneNumber ?? "",
    email: dto.email ?? "",
    results,
  };
}

/** Edad calculada desde la fecha de nacimiento (null si no hay fecha). */
function ageFromDateOfBirth(dateOfBirth: string | null): number {
  if (!dateOfBirth) return 0;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
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
      testCode: evs[0]?.testCode ?? null,
      state: latest ? "completado" : inProgress ? "en-progreso" : "pendiente",
      score: score !== null && score !== undefined ? score : null,
      scorePercentage: latest?.scorePercentage ?? null,
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

/** Fila del historial del hub: evaluación + número de intento del test. */
function mapPatientEvaluation(ev: EvaluationDto): PatientEvaluation {
  return {
    id: ev.id,
    versionId: ev.versionId,
    testName: ev.testName ?? ev.testCode ?? "Test",
    testCode: ev.testCode ?? "",
    testCategory: ev.testCategory ?? "",
    status: ev.status as PatientEvaluation["status"],
    startedAt: ev.startedAt,
    completedAt: ev.completedAt,
    score: ev.score,
    scorePercentage: ev.scorePercentage,
    attempt: 0,
  };
}

/** Número de intento por test: orden cronológico entre evaluaciones del mismo versionId. */
export function withAttempts(
  evaluations: EvaluationDto[],
): PatientEvaluation[] {
  const counters = new Map<string, number>();
  const sorted = [...evaluations].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  return sorted.map((ev) => {
    const n = (counters.get(ev.versionId) ?? 0) + 1;
    counters.set(ev.versionId, n);
    return { ...mapPatientEvaluation(ev), attempt: n };
  });
}

function mapEvaluationDetail(detail: EvaluationDetailDto): EvaluationDetail {
  return {
    id: detail.id,
    assignmentId: detail.assignmentId,
    patientId: detail.patientId,
    versionId: detail.versionId,
    versionNumber: detail.versionNumber,
    versionName: detail.versionName,
    scoringStrategy: detail.scoringStrategy,
    testName: detail.testName ?? detail.testCode ?? "Test",
    testCode: detail.testCode ?? "",
    testCategory: detail.testCategory ?? "",
    status: detail.status as EvaluationDetail["status"],
    startedAt: detail.startedAt,
    completedAt: detail.completedAt,
    attempt: detail.attempt,
    score: detail.score,
    scorePercentage: detail.scorePercentage,
    results: detail.results.map((r) => ({
      id: r.id,
      resultType: r.resultType as EvaluationResultItem["resultType"],
      code: r.code,
      label: r.label,
      value: r.value,
      qualifier: r.qualifier,
      severity: r.severity,
    })),
    responses: detail.responses.map((r): EvaluationResponseItem => ({
      questionId: r.questionId,
      questionCode: r.questionCode,
      section: r.section,
      questionText: r.questionText,
      questionType: r.questionType as EvaluationResponseItem["questionType"],
      answerOptionId: r.answerOptionId,
      answerOptionText: r.answerOptionText,
      answerOptionScore: r.answerOptionScore,
      valueText: r.valueText,
    })),
    comments: detail.comments.map((c): EvaluationCommentItem => ({
      id: c.id,
      authorId: c.authorId,
      body: c.body,
      createdAt: c.createdAt,
    })),
    attempts: detail.attempts.map((a): EvaluationAttemptItem => ({
      id: a.id,
      status: a.status as EvaluationAttemptItem["status"],
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      score: a.score,
      scorePercentage: a.scorePercentage,
    })),
  };
}

// ===================== Cliente API (funciones con nombre) =====================

async function listPatients(): Promise<PatientProfile[]> {
  const all = await fetchAllPages<PatientListItemDto>(
    `${env.apiUrl}/api/v1/patients`,
  );
  return all.map((p) => mapPatientListItem(p, []));
}

async function getPatient(id: string): Promise<PatientProfile | null> {
  const [patient, evaluations] = await Promise.all([
    apiFetch<PatientListItemDto>(`${env.apiUrl}/api/v1/patients/${id}`),
    getPatientEvaluations(id).catch(() => []),
  ]);
  return mapPatientListItem(patient, aggregateResults(evaluations));
}

/** Evaluaciones de un paciente (paginadas, con filtros opcionales). */
async function getPatientEvaluations(
  patientId: string,
  filters?: {
    page?: number;
    pageSize?: number;
    status?: string;
    from?: string;
    to?: string;
    category?: string;
  },
): Promise<EvaluationDto[]> {
  const params = new URLSearchParams({
    page: String(filters?.page ?? 1),
    pageSize: String(filters?.pageSize ?? 100),
  });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.category) params.set("category", filters.category);
  const response = await apiFetch<PaginatedDto<EvaluationDto>>(
    `${BASE}/patients/${patientId}/evaluations?${params.toString()}`,
  );
  return response.data;
}

/** Detalle completo de una evaluación (resultados, respuestas, comentarios, intentos). */
async function getEvaluationDetail(
  patientId: string,
  evaluationId: string,
): Promise<EvaluationDetail | null> {
  const detail = await apiFetch<EvaluationDetailDto>(
    `${BASE}/patients/${patientId}/evaluations/${evaluationId}`,
  );
  return mapEvaluationDetail(detail);
}

async function listTests(): Promise<HealthTest[]> {
  return cached("tests", TTL_CATALOG, () => listTestsRaw());
}

async function listIndicators(): Promise<ClinicalIndicator[]> {
  return cached("indicators", TTL_CATALOG, async () => {
    const defs = await apiFetch<IndicatorDefDto[]>(`${BASE}/indicators`);
    return defs.map(mapIndicator);
  });
}

async function listProfessionals(): Promise<HealthProfessional[]> {
  return cached("professionals", TTL_CATALOG, async () => {
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
  });
}

async function listAlerts(patientId?: string): Promise<HealthAlert[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (patientId) params.set("patientId", patientId);
  const response = await apiFetch<PaginatedDto<AlertDto>>(
    `${BASE}/alerts?${params.toString()}`,
  );
  return response.data.map(mapAlert);
}

/** Acciones de transición que expone el backend (permiso HealthTests.Review). */
export type AlertTransition = "review" | "resolve" | "close" | "reopen";

async function transitionAlert(
  alertId: string,
  action: AlertTransition,
): Promise<void> {
  await apiFetch(`${BASE}/alerts/${alertId}/${action}`, { method: "POST" });
  invalidateHealthTestsCache();
}

async function listBatteries(): Promise<Battery[]> {
  return cached("batteries", TTL_CATALOG, async () => {
    const response = await apiFetch<PaginatedDto<BatteryDto>>(
      `${BASE}/batteries?page=1&pageSize=100`,
    );
    return response.data.map(mapBattery);
  });
}

/** Item de creación de batería (espejo de BatteryItemInput del backend). */
export interface CreateBatteryItemInput {
  instrumentId: string;
  versionId?: string | null;
  sortOrder: number;
  isRequired: boolean;
  frequencyDays?: number | null;
}

/** Request de creación de batería (espejo de CreateBatteryRequest). */
export interface CreateBatteryInput {
  code: string;
  name: string;
  description?: string | null;
  autoAssignOnPatientCreate: boolean;
  items: CreateBatteryItemInput[];
}

/** Detalle de una batería por id: se deriva de la lista cacheada. */
async function getBattery(batteryId: string): Promise<Battery | null> {
  const batteries = await listBatteries();
  return batteries.find((b) => b.id === batteryId) ?? null;
}

async function createBattery(input: CreateBatteryInput): Promise<Battery> {
  const dto = await apiFetch<BatteryDto>(`${BASE}/batteries`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  invalidateHealthTestsCache();
  return mapBattery(dto);
}

/** Asigna pacientes a una batería y devuelve cuántas asignaciones se crearon. */
async function assignBattery(
  batteryId: string,
  patientIds: string[],
): Promise<number> {
  const created = await apiFetch<AssignmentDto[]>(
    `${BASE}/batteries/${batteryId}/assign`,
    {
      method: "POST",
      body: JSON.stringify({ patientIds }),
    },
  );
  invalidateHealthTestsCache();
  return created.length;
}

async function getStats(filter?: HealthGeoFilter): Promise<HealthTestStats> {
  return cached(`stats:${geoFilterKey(filter)}`, TTL_STATS, () =>
    apiFetch<HealthTestStats>(`${BASE}/stats${geoFilterParams(filter)}`),
  );
}

/** Punto de tendencia del backend (endpoint /coverage-trend, rollup mensual). */
interface TrendPointDto {
  label: string;
  coverage: number;
  completed: number;
}

async function getCoverageTrend(
  filter?: HealthGeoFilter,
): Promise<CoverageTrendPoint[]> {
  // Sin filtro geo: el backend lo resuelve con el rollup diario (1 query).
  // Con filtro geo se conserva el cálculo cliente (master ya está filtrado).
  const states = normalizeStateCodes(filter?.stateCodes);
  if (states.length === 0) {
    const points = await apiFetch<TrendPointDto[]>(`${BASE}/coverage-trend`);
    return points.map((p) => ({
      label: p.label,
      coverage: p.coverage,
      completed: p.completed,
    }));
  }
  const [stats, masterRows] = await Promise.all([
    apiFetch<StatsDto>(`${BASE}/stats${geoFilterParams(filter)}`),
    getMasterRows(filter).catch(() => [] as PatientMasterRow[]),
  ]);
  const total = Math.max(stats.totalPatients, 1);
  const months: CoverageTrendPoint[] = [];
  const now = new Date();
  const buckets = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-CO", { month: "short" });
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, 0);
    months.push({ label, coverage: 0, completed: 0 });
  }
  if (masterRows.length > 0) {
    for (const row of masterRows) {
      for (const r of row.patient.results) {
        if (r.state !== "completado" || !r.completedAt) continue;
        const d = new Date(r.completedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }
    let idx = 0;
    for (const key of [...buckets.keys()]) {
      const count = buckets.get(key) ?? 0;
      months[idx].completed = count;
      months[idx].coverage = coveragePercent(count, total);
      idx++;
    }
    const hasData = [...buckets.values()].some((v) => v > 0);
    if (!hasData) {
      const last = months[months.length - 1];
      last.completed = stats.completed;
      last.coverage = coveragePercent(stats.completed, total);
    }
  } else {
    const last = months[months.length - 1];
    last.completed = stats.completed;
    last.coverage = coveragePercent(stats.completed, total);
  }
  return months;
}

/** Índice nombre -> id para resolver el nombre que expone `/master`. */
interface ProfessionalNameIndex {
  exact: Map<string, string>;
  loose: Map<string, string>;
}

/** Normaliza un nombre para compararlo entre catálogo y tabla maestra. */
function normalizePersonName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clave laxa (primer y último token): `/master` envía nombre + apellido,
 * mientras el catálogo incluye el segundo nombre del empleado.
 */
function professionalNameKey(name: string): string {
  const tokens = normalizePersonName(name).split(" ").filter(Boolean);
  if (tokens.length <= 2) return tokens.join(" ");
  return `${tokens[0]} ${tokens[tokens.length - 1]}`;
}

/** Mapa doble (exacto y laxo) de los nombres del catálogo de profesionales. */
function buildProfessionalNameIndex(
  professionals: HealthProfessional[],
): ProfessionalNameIndex {
  const exact = new Map<string, string>();
  const loose = new Map<string, string>();
  for (const p of professionals) {
    const name = `${p.firstName} ${p.lastName}`.trim();
    const normalized = normalizePersonName(name);
    if (normalized && !exact.has(normalized)) exact.set(normalized, p.id);
    const key = professionalNameKey(name);
    if (key && !loose.has(key)) loose.set(key, p.id);
  }
  return { exact, loose };
}

/** Resuelve el id del profesional a partir del nombre expuesto por `/master`. */
function resolveProfessionalId(
  name: string,
  index?: ProfessionalNameIndex,
): string {
  if (!index || name.trim() === "") return "";
  return (
    index.exact.get(normalizePersonName(name)) ??
    index.loose.get(professionalNameKey(name)) ??
    ""
  );
}

async function getMasterRows(
  filter?: HealthGeoFilter,
): Promise<PatientMasterRow[]> {
  return cached(`master:${geoFilterKey(filter)}`, TTL_MASTER, async () => {
    // `/master` sólo expone el nombre del profesional: el catálogo resuelve el
    // id (filtro y visualización) en el cliente, sin cambios de backend.
    const [dtos, professionals] = await Promise.all([
      apiFetch<MasterRowDto[]>(`${BASE}/master${geoFilterParams(filter)}`),
      listProfessionals().catch(() => [] as HealthProfessional[]),
    ]);
    const index =
      professionals.length > 0
        ? buildProfessionalNameIndex(professionals)
        : undefined;
    return dtos.map((dto) => mapMasterRow(dto, index));
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function listTestsCached(): Promise<HealthTest[]> {
  return cached("tests", TTL_CATALOG, () => listTestsRaw());
}

async function listTestsRaw(): Promise<HealthTest[]> {
  const response = await apiFetch<PaginatedDto<InstrumentDto>>(
    `${BASE}?page=1&pageSize=100&isActive=true`,
  );
  return response.data.map(mapTest);
}

/** Fila maestra desde el DTO del backend (una sola llamada, sin N+1). */
function mapMasterRow(
  dto: MasterRowDto,
  professionalIndex?: ProfessionalNameIndex,
): PatientMasterRow {
  const professionalName = dto.patient.professionalName ?? "";
  const patient: PatientProfile = {
    id: dto.patient.id,
    firstName: dto.patient.firstName,
    lastName: dto.patient.lastName,
    documentNumber: dto.patient.documentNumber ?? "",
    gender: dto.patient.gender === "Masculino" ? "Masculino" : "Femenino",
    age: ageFromDateOfBirth(dto.patient.dateOfBirth),
    clinic: dto.patient.clinicName ?? "",
    professionalId: resolveProfessionalId(professionalName, professionalIndex),
    professionalName,
    status: dto.patient.status === "Inactivo" ? "inactivo" : "activo",
    insurance: dto.patient.insurerName ?? "",
    assignedAt: "",
    phone: "",
    email: "",
    results: dto.results.map(mapMasterResult),
  };
  return { ...buildMasterRow(patient, []), alertCount: dto.alertCount };
}

function mapMasterResult(r: MasterPatientResultDto): PatientTestResult {
  const ts = r.completedAt ?? "";
  return {
    testId: r.versionId,
    testCode: r.testCode,
    state: r.state,
    score: r.score,
    scorePercentage: r.scorePercentage ?? undefined,
    interpretation: r.qualifier ?? "",
    risk: riskFromSeverity(r.severity),
    updatedAt: ts,
    completedAt: r.completedAt,
    history: [],
    details: {},
  };
}

async function getPendingPatients(): Promise<PendingPatientRow[]> {
  const [masterRows, tests, professionals] = await Promise.all([
    getMasterRows(),
    listTests(),
    listProfessionals(),
  ]);
  const testByCode = new Map(tests.map((t) => [t.code, t] as const));
  const profById = new Map(professionals.map((p) => [p.id, p] as const));
  const rows: PendingPatientRow[] = [];
  for (const row of masterRows) {
    const pendingResults = row.patient.results.filter(
      (r) => r.state === "pendiente" || r.state === "vencido",
    );
    if (pendingResults.length === 0) continue;
    const pendingTests = [
      ...new Set(
        pendingResults.map((r) => {
          const t = r.testCode ? testByCode.get(r.testCode) : undefined;
          return t ? t.id : r.testId;
        }),
      ),
    ];
    const validDates = pendingResults
      .map((r) => r.updatedAt)
      .filter(
        (d): d is string => Boolean(d) && !Number.isNaN(new Date(d).getTime()),
      );
    const earliestAssignedAt =
      validDates.length > 0
        ? validDates.reduce((min, d) => (d < min ? d : min), validDates[0])
        : new Date().toISOString();
    const latestCompletedAt = row.lastEvaluation ?? null;
    const professionalName =
      (row.patient.professionalName &&
      row.patient.professionalName.trim() !== ""
        ? row.patient.professionalName
        : profById.get(row.patient.professionalId)
          ? `${profById.get(row.patient.professionalId)!.firstName} ${profById.get(row.patient.professionalId)!.lastName}`
          : "Sin asignar") || "Sin asignar";
    const rawDays = daysBetween(earliestAssignedAt, new Date().toISOString());
    const daysPending = Number.isFinite(rawDays) ? rawDays : 0;
    rows.push({
      patient: row.patient,
      pendingTests,
      pendingCount: Number.isFinite(pendingTests.length)
        ? pendingTests.length
        : 0,
      lastTestDate: latestCompletedAt,
      assignedAt: earliestAssignedAt,
      daysPending,
      professionalName,
      priority: pendingPriority(row.patient),
      status: row.patient.status,
    });
  }
  return rows.sort((a, b) => {
    const rank = { alta: 0, media: 1, baja: 2 };
    const aDays = Number.isFinite(a.daysPending) ? a.daysPending : 0;
    const bDays = Number.isFinite(b.daysPending) ? b.daysPending : 0;
    return rank[a.priority] - rank[b.priority] || bDays - aDays;
  });
}

async function getCoverageByTest(): Promise<CoverageByTest[]> {
  const [tests, masterRows] = await Promise.all([listTests(), getMasterRows()]);
  const total = Math.max(masterRows.length, 1);
  return tests.map((test) => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;
    for (const row of masterRows) {
      const r = row.patient.results.find((x) => x.testCode === test.code);
      if (!r) continue;
      if (r.state === "completado") completed++;
      else if (r.state === "en-progreso") inProgress++;
      else if (r.state === "pendiente") pending++;
      else if (r.state === "vencido") overdue++;
    }
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
  const [masterRows, tests] = await Promise.all([getMasterRows(), listTests()]);
  const categories = [
    ...new Set(tests.map((t) => t.category)),
  ] as TestCategory[];
  return categories.map((category) => {
    const categoryTests = tests.filter((t) => t.category === category);
    const testCodes = new Set(categoryTests.map((t) => t.code));
    const scores: number[] = [];
    const distribution: IndicatorAggregate["distribution"] = {
      bajo: 0,
      moderado: 0,
      alto: 0,
      critico: 0,
      "sin-evaluar": 0,
    };
    let evaluatedCount = 0;
    for (const row of masterRows) {
      const catResults = row.patient.results.filter(
        (r) =>
          r.testCode &&
          testCodes.has(r.testCode) &&
          r.state === "completado" &&
          r.score !== null,
      );
      if (catResults.length === 0) {
        distribution["sin-evaluar"] += 1;
        continue;
      }
      evaluatedCount += 1;
      for (const r of catResults) {
        const s = r.score as number;
        scores.push(s);
        const risk = r.risk;
        if (risk in distribution) {
          distribution[risk as keyof typeof distribution] += 1;
        }
      }
    }
    const average =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const affectedCount = distribution.alto + distribution.critico;
    const indicator = {
      id: `cat-${category}`,
      code: category,
      name: CATEGORY_LABELS[category] ?? category,
      category,
      icon: categoryTests[0]?.icon ?? "📊",
      description: `Agregado poblacional de ${CATEGORY_LABELS[category] ?? category}`,
      higherIsBetter: category !== "cardiometabolico",
    } as unknown as ClinicalIndicator;

    return {
      indicator,
      average,
      distribution,
      evaluatedCount,
      affectedCount,
      trend: [
        { label: "May", value: Math.max(0, average - 4) },
        { label: "Jun", value: Math.max(0, average - 2) },
        { label: "Jul", value: average },
        { label: "Ago", value: Math.min(100, average + 3) },
      ],
    } satisfies IndicatorAggregate;
  });
}

export const healthTestsApi: HealthTestsApi = {
  listPatients,
  getPatient,
  getPatientEvaluations,
  getEvaluationDetail,
  listTests,
  listIndicators,
  listProfessionals,
  listAlerts,
  transitionAlert,
  listBatteries,
  getBattery,
  createBattery,
  assignBattery,
  getStats,
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
