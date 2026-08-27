"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Clock,
  HeartPulse,
  Hourglass,
  Phone,
  ShieldAlert,
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
import { ModuleErrorState } from "../shared/module-states";
import type { PatientProfile } from "../../types";

/**
 * Perfil individual de tests del paciente: resumen, indicadores,
 * estado por test, evolución, alertas e historial.
 */
export function PatientProfilePage({ patientId }: { patientId: string }) {
  const t = useT();
  const { data, loading, error, reload } = usePatientDetail(patientId);

  const risk = useMemo(() => {
    if (!data) return null;
    return patientRisk(data.patient.results);
  }, [data]);

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

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data || !risk) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState
          message={t("No encontramos este paciente.")}
          onRetry={() => window.history.back()}
        />
      </div>
    );
  }

  const { patient, alerts, tests, professionals } = data;
  const professional = professionals.find(
    (p) => p.id === patient.professionalId,
  );
  const typification = typifyPatient(patient);
  const completed = patient.results.filter(
    (r) => r.state === "completado",
  ).length;
  const pending = patient.results.filter(
    (r) => r.state === "pendiente" || r.state === "vencido",
  ).length;
  const inProgress = patient.results.filter(
    (r) => r.state === "en-progreso",
  ).length;
  const patientAlerts = alerts.filter((a) => a.patientId === patient.id);
  const progress =
    patient.results.length === 0
      ? 0
      : Math.round((completed / patient.results.length) * 100);

  const radarData = patient.results
    .filter((r) => r.score !== null)
    .map((r) => {
      const test = tests.find((x) => x.id === r.testId);
      return {
        name: test?.name ?? r.testId,
        score: r.score ?? 0,
      };
    });

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
              <RiskBadge risk={risk} label={typificationLabel(typification)} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              <span>{patient.documentNumber}</span>
              <span>
                {patient.gender} · {patient.age} años
              </span>
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {patient.phone}
              </span>
              <span className="flex items-center gap-1">
                <Stethoscope className="size-3" />
                {professional
                  ? fullName(professional.firstName, professional.lastName)
                  : "Sin asignar"}
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
            {t("Última evaluación")} {formatDate(lastCompleted(patient))}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Tests completados")}
          value={`${completed}/${patient.results.length}`}
          icon={ClipboardCheck}
          variant="success"
          context={`${progress}% ${t("de la batería")}`}
        />
        <StatCard
          label={t("Pendientes")}
          value={String(pending)}
          icon={Hourglass}
          variant="warning"
          context={t("Sin aplicar")}
        />
        <StatCard
          label={t("En progreso")}
          value={String(inProgress)}
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

      {/* Tests de la batería */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Tests de la batería")}
          description={t("Estado, score e interpretación de cada evaluación")}
          icon={ClipboardCheck}
          variant="primary"
        />
        <div className="grid grid-cols-1 gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => {
            const result = patient.results.find((r) => r.testId === test.id);
            if (!result) return null;
            const accent = categoryAccent(test.category);
            return (
              <article
                key={test.id}
                className="flex flex-col gap-3 bg-card p-4 transition-colors duration-200 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: `${accent}1A` }}
                    >
                      {test.icon}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <h4 className="truncate text-[13px] font-bold text-foreground">
                        {test.name}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {test.code} · {test.timeMinutes} min
                      </span>
                    </div>
                  </div>
                  <TestStateBadge
                    state={result.state}
                    label={result.state.replace("-", " ")}
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
                        label={result.risk}
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
                      backgroundColor: `${riskHex(alert.severity === "critica" ? "critico" : alert.severity === "alta" ? "alto" : alert.severity === "media" ? "moderado" : "bajo")}1A`,
                    }}
                  >
                    <ShieldAlert
                      className="size-4"
                      style={{
                        color: riskHex(
                          alert.severity === "critica"
                            ? "critico"
                            : alert.severity === "alta"
                              ? "alto"
                              : alert.severity === "media"
                                ? "moderado"
                                : "bajo",
                        ),
                      }}
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
                    {alert.status.replace("-", " ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historial */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Historial de evaluaciones")}
          description={t("Timeline de actividades de la batería")}
          icon={Clock}
          variant="primary"
        />
        <ol className="flex flex-col gap-0 p-5">
          {buildTimeline(patient, tests).map((event, index) => (
            <li
              key={`${event.date}-${index}`}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              {index < buildTimeline(patient, tests).length - 1 && (
                <span
                  className="absolute left-[13px] top-7 h-full w-px"
                  style={{ backgroundColor: "var(--border)" }}
                  aria-hidden
                />
              )}
              <span
                className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${event.color}1A` }}
              >
                {event.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                <span className="text-[12.5px] font-semibold text-foreground">
                  {event.title}
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  {event.subtitle}
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  {formatDate(event.date)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function lastCompleted(patient: PatientProfile): string | null {
  const dates = patient.results
    .map((r) => r.completedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function buildEvolution(patient: PatientProfile) {
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

function buildTimeline(
  patient: PatientProfile,
  tests: { id: string; name: string; icon: string }[],
) {
  const events: {
    date: string;
    title: string;
    subtitle: string;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      date: patient.assignedAt,
      title: "Batería asignada",
      subtitle: "Se asignó la batería de evaluación inicial",
      color: "#0EA5E9",
      icon: <CalendarClock className="size-3.5 text-info" />,
    },
  ];

  for (const result of patient.results) {
    if (result.completedAt) {
      const test = tests.find((x) => x.id === result.testId);
      events.push({
        date: result.completedAt,
        title: `${test?.icon ?? "📋"} ${test?.name ?? result.testId} completado`,
        subtitle:
          result.score !== null
            ? `Score ${result.score} · ${result.interpretation}`
            : "Evaluación completada",
        color: "#10B981",
        icon: <ClipboardCheck className="size-3.5 text-success" />,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
