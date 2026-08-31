"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BellRing,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Clock,
  HeartPulse,
  Hourglass,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Timer,
  UserRound,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { SectionHeader } from "@/components/layout/section-header";
import { usePatientDetail } from "../../hooks/use-health-tests";
import {
  patientRisk,
  typificationLabel,
  typifyPatient,
} from "../../lib/domain";
import {
  formatDate,
  formatShortDate,
  fullName,
  initials,
} from "../../lib/format";
import { categoryAccent, riskHex, scoreBarColor } from "../shared/colors";
import { RiskBadge, SeverityBadge, TestStateBadge } from "../shared/badges";
import { ScoreBar } from "../shared/progress";
import { ChartCard, StatSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import type { PatientEvaluation } from "../../types";

const EVALUATION_STATES: Record<
  PatientEvaluation["status"],
  { labelKey: string; state: "completado" | "en-progreso" | "pendiente" }
> = {
  completed: { labelKey: "Completado", state: "completado" },
  started: { labelKey: "En progreso", state: "en-progreso" },
  abandoned: { labelKey: "Abandonado", state: "pendiente" },
};

/**
 * Hub de tests de salud del paciente: identidad, resumen, indicadores,
 * historial de evaluaciones filtrable y navegación al detalle individual.
 */
export function PatientProfilePage({ patientId }: { patientId: string }) {
  const t = useT();
  const { data, loading, error, notFound, reload } =
    usePatientDetail(patientId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");

  const risk = useMemo(() => {
    if (!data) return null;
    return patientRisk(data.patient.results);
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const ev of data.evaluations) {
      if (ev.testCategory) set.add(ev.testCategory);
    }
    return [...set].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return [...data.evaluations]
      .sort((a, b) =>
        (b.completedAt ?? b.startedAt).localeCompare(
          a.completedAt ?? a.startedAt,
        ),
      )
      .filter((e) => {
        if (statusFilter !== "todos" && e.status !== statusFilter) return false;
        if (categoryFilter !== "todos" && e.testCategory !== categoryFilter)
          return false;
        if (
          q &&
          !e.testName.toLowerCase().includes(q) &&
          !e.testCode.toLowerCase().includes(q)
        )
          return false;
        return true;
      });
  }, [data, search, statusFilter, categoryFilter]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleEmptyState
          title={t("No encontramos este paciente")}
          description={t(
            "El paciente no existe o no está dentro de tu alcance de datos.",
          )}
        />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleEmptyState
          title={t("No encontramos este paciente")}
          description={t(
            "El paciente no existe o no está dentro de tu alcance de datos.",
          )}
        />
      </div>
    );
  }

  const { patient, alerts, evaluations } = data;
  const typification = typifyPatient(patient);
  const completed = evaluations.filter((e) => e.status === "completed").length;
  const pending = evaluations.filter((e) => e.status === "started").length;
  const patientAlerts = alerts.filter((a) => a.patientId === patient.id);
  const totalTests = patient.results.length;

  const radarData = patient.results
    .filter((r) => r.score !== null)
    .map((r) => ({
      name:
        testNameFor(patient.results, r.testId, evaluations) ??
        r.testCode ??
        r.testId,
      score: r.score ?? 0,
    }));

  const evolutionData = buildEvolution(patient);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={fullName(patient.firstName, patient.lastName)}
        description={t("Perfil individual de evaluación de salud")}
        icon={UserRound}
        actions={
          <Link
            href="/health-tests/pacientes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            <ArrowLeft data-icon="inline-start" className="size-3.5" />
            {t("Tabla maestra")}
          </Link>
        }
      />

      {/* Header del paciente: identidad + riesgo + tipificación */}
      <section className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary">
            {initials(patient.firstName, patient.lastName)}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {fullName(patient.firstName, patient.lastName)}
              </h2>
              <RiskBadge
                risk={risk ?? "sin-evaluar"}
                label={typificationLabel(typification)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              <span>
                {patient.documentNumber}
                {patient.clinic ? ` · ${patient.clinic}` : ""}
              </span>
              <span>
                {patient.gender} ·{" "}
                {patient.age > 0
                  ? `${patient.age} ${t("años")}`
                  : t("edad no disponible")}
              </span>
              {patient.insurance ? (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  {patient.insurance}
                </span>
              ) : null}
              {patient.phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {patient.phone}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Stethoscope className="size-3" />
                {patient.professionalName || t("Sin asignar")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 rounded-xl bg-muted px-4 py-3 text-[12px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {t("Asignado")} {formatDate(patient.assignedAt)}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5" />
            {t("Última evaluación")} {formatDate(lastCompleted(evaluations))}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Tests completados")}
          value={`${completed}/${totalTests}`}
          icon={ClipboardCheck}
          variant="success"
          context={`${totalTests === 0 ? 0 : Math.round((completed / totalTests) * 100)}% ${t("de la batería")}`}
        />
        <StatCard
          label={t("Pendientes")}
          value={String(Math.max(0, totalTests - completed - pending))}
          icon={Hourglass}
          variant="warning"
          context={t("Sin aplicar")}
        />
        <StatCard
          label={t("En progreso")}
          value={String(pending)}
          icon={Timer}
          variant="info"
          context={t("Guardados a medias")}
        />
        <StatCard
          label={t("Alertas del paciente")}
          value={String(patientAlerts.length)}
          icon={BellRing}
          variant="destructive"
          context={t("Relacionadas con sus resultados")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("Perfil de indicadores")}
          description={t("Scores de los tests completados (0-100)")}
          icon={Activity}
        >
          {radarData.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {t("Sin tests completados todavía")}
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="68%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={{ fontSize: 8.5, fill: "var(--muted-foreground)" }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="score"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} pts`, ""]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t("Evolución de scores")}
          description={t("Evaluaciones repetidas en el tiempo")}
          icon={HeartPulse}
        >
          {evolutionData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Activity className="size-6" />
              </span>
              <p className="max-w-52 text-xs text-muted-foreground">
                {t("Sin evaluaciones repetidas para comparar")}
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evolutionData}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [String(value), String(name)]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--chart-2)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Historial de evaluaciones (hub) */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Historial de evaluaciones")}
          description={t(
            "Todos los tests del paciente, sus resultados e intentos",
          )}
          icon={ClipboardCheck}
          variant="primary"
        />
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search
              data-icon="inline-start"
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Buscar test…")}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t("Filtrar por estado")}
            className="h-9 rounded-lg border border-border bg-background px-3 text-[12.5px] text-foreground outline-none focus:border-primary"
          >
            <option value="todos">{t("Todos los estados")}</option>
            <option value="completed">{t("Completado")}</option>
            <option value="started">{t("En progreso")}</option>
            <option value="abandoned">{t("Abandonado")}</option>
          </select>
          {categories.length > 0 ? (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={t("Filtrar por categoría")}
              className="h-9 rounded-lg border border-border bg-background px-3 text-[12.5px] text-foreground outline-none focus:border-primary"
            >
              <option value="todos">{t("Todas las categorías")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin evaluaciones que coincidan")}
            description={
              evaluations.length === 0
                ? t("Este paciente no tiene tests aplicados todavía.")
                : t("Prueba con otros filtros de búsqueda.")
            }
            onClear={
              search || statusFilter !== "todos" || categoryFilter !== "todos"
                ? () => {
                    setSearch("");
                    setStatusFilter("todos");
                    setCategoryFilter("todos");
                  }
                : undefined
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {filtered.map((ev) => {
              const state = EVALUATION_STATES[ev.status];
              const accent = categoryAccent(ev.testCategory);
              return (
                <li key={ev.id}>
                  <Link
                    href={`/health-tests/pacientes/${patientId}/evaluaciones/${ev.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/40 sm:px-5"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[13px]"
                      style={{ backgroundColor: `${accent}1A`, color: accent }}
                    >
                      <ClipboardCheck className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {ev.testName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {ev.testCode}
                        {ev.testCategory ? ` · ${ev.testCategory}` : ""}
                        {ev.attempt > 1
                          ? ` · ${t("Intento")} ${ev.attempt}`
                          : ""}
                      </span>
                    </div>
                    {ev.score !== null ? (
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden w-28 flex-col items-end gap-0.5 sm:flex">
                          <span className="text-[12.5px] font-bold text-foreground">
                            {ev.scorePercentage !== null
                              ? `${Math.round(ev.scorePercentage)}%`
                              : `${ev.score} pts`}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground">
                            {formatShortDate(ev.completedAt ?? ev.startedAt)}
                          </span>
                        </div>
                        <RiskBadge
                          risk={riskFromEvaluation(ev)}
                          className="px-2 py-0.5 text-[10.5px]"
                        />
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden text-[11px] text-muted-foreground sm:block">
                          {formatShortDate(ev.startedAt)}
                        </span>
                        <TestStateBadge
                          state={state.state}
                          label={t(state.labelKey)}
                        />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Tests de la batería */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Tests de la batería")}
          description={t("Estado, score e interpretación de cada evaluación")}
          icon={Building2}
          variant="primary"
        />
        <div className="grid grid-cols-1 gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-3">
          {patient.results.map((result) => {
            const accent = categoryAccent(
              categories.find((c) =>
                evaluations.some(
                  (e) => e.versionId === result.testId && e.testCategory === c,
                ),
              ) ?? "",
            );
            return (
              <article
                key={result.testId}
                className="flex flex-col gap-3 bg-card p-4 transition-colors duration-200 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: `${accent}1A`, color: accent }}
                    >
                      <ClipboardCheck className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <h4 className="truncate text-[13px] font-bold text-foreground">
                        {testNameFor(
                          patient.results,
                          result.testId,
                          evaluations,
                        ) ??
                          result.testCode ??
                          result.testId}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {result.testCode}
                      </span>
                    </div>
                  </div>
                  <TestStateBadge
                    state={result.state}
                    label={t(result.state)}
                  />
                </div>

                {result.score !== null ? (
                  <div className="flex flex-col gap-2">
                    <ScoreBar
                      value={result.score}
                      color={scoreBarColor(result.risk)}
                      label={t("Score")}
                    />
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-muted-foreground">
                        {result.interpretation}
                      </span>
                      <RiskBadge
                        risk={result.risk}
                        label={t(result.risk)}
                        className="px-2 py-0.5 text-[10.5px]"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {t("Evaluado")} {formatDate(result.completedAt)}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">
                    {result.state === "en-progreso"
                      ? `${t("Guardado a medias")} · ${
                          typeof result.details.progreso === "string"
                            ? result.details.progreso
                            : ""
                        }`
                      : t("Pendiente de aplicación")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {patient.results.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">
            {t("Este paciente no tiene tests aplicados todavía.")}
          </p>
        ) : null}
      </section>

      {/* Alertas del paciente */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Alertas del paciente")}
          description={t("Resultados que requieren atención clínica")}
          icon={ShieldAlert}
          variant="primary"
        />
        {patientAlerts.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">
            {t("Sin alertas para este paciente")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {patientAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${riskHex(severityToRisk(alert.severity))}1A`,
                    }}
                  >
                    <ShieldAlert
                      className="size-4"
                      style={{ color: riskHex(severityToRisk(alert.severity)) }}
                    />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[12.5px] font-semibold text-foreground">
                      {alert.message}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {alert.indicatorName} · {formatDate(alert.createdAt)}
                    </span>
                    <span className="text-[11px] text-foreground/80">
                      {t("Acción recomendada")}: {alert.recommendedAction}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "var(--muted)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t(alert.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Nombre del test desde las evaluaciones (el DTO de evaluación trae testName). */
function testNameFor(
  results: { testId: string }[],
  versionId: string,
  evaluations: PatientEvaluation[],
): string | null {
  const ev = evaluations.find((e) => e.versionId === versionId);
  return ev?.testName ?? null;
}

function riskFromEvaluation(ev: PatientEvaluation) {
  if (ev.score === null) return "sin-evaluar" as const;
  if (ev.score >= 70) return "alto" as const;
  if (ev.score >= 40) return "moderado" as const;
  return "bajo" as const;
}

function severityToRisk(
  severity: string,
): "critico" | "alto" | "moderado" | "bajo" {
  if (severity === "critica") return "critico";
  if (severity === "alta") return "alto";
  if (severity === "media") return "moderado";
  return "bajo";
}

function lastCompleted(evaluations: PatientEvaluation[]): string | null {
  const dates = evaluations
    .map((e) => e.completedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function buildEvolution(patient: {
  results: {
    history: { completedAt: string; score: number }[];
    score: number | null;
  }[];
}) {
  const withHistory = patient.results.filter(
    (r) => r.history.length > 1 && r.score !== null,
  );
  if (withHistory.length === 0) return [];
  const test = withHistory[0];
  return test.history.map((h, i) => ({
    label: `${formatShortDate(h.completedAt)}${i === test.history.length - 1 ? " · ahora" : ""}`,
    valor: h.score,
  }));
}
