"use client";

import { use } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  UserRound,
  ArrowLeft,
  Flame,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Stethoscope,
  AlertTriangle,
  ClipboardPenLine,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Lock,
  Weight,
  Droplet,
  Activity,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePatientOverview } from "../hooks/use-patient-overview";
import {
  MISSION_COLORS,
  MISSION_LABELS,
  MISSION_ORDER,
  CLINICAL_COLORS,
  adherenceChipClass,
  relativeTime,
  CHART_TOOLTIP,
} from "../services/program-erp-constants";
import { ChartTabs, usePersistedTab } from "./chart-tabs";

// --- Componente principal ---

export function ProgramPatientOverviewPage({
  patientId,
}: {
  patientId: string;
}) {
  const { data, loading, error, retry } = usePatientOverview(patientId);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Perfil 360 del paciente"
        description="Vista integral de progreso, adherencia y salud"
        icon={UserRound}
        actions={
          <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        }
      />

      {loading ? (
        <PatientSkeleton />
      ) : error ? (
        <PatientError message={error} onRetry={retry} />
      ) : data ? (
        <PatientContent data={data} patientId={patientId} />
      ) : (
        <PatientNotFound />
      )}
    </div>
  );
}

// --- Contenido ---

function PatientContent({
  data,
  patientId,
}: {
  data: import("../types/erp").PatientOverviewDto;
  patientId: string;
}) {
  const patientName = data.patient_name ?? "Paciente";
  const parts = patientName.split(" ");
  const initialsStr =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : patientName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B2B4A] p-6 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 200px at 85% -20%, rgba(212,175,55,0.18), transparent 60%)" }} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#123B63] text-xl font-bold">
            {initialsStr}
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{patientName}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-white/70">
              {data.enrollment && (
                <>
                  <span>
                    Semana {data.enrollment.current_week}/
                    {data.enrollment.total_weeks}
                  </span>
                  <span>·</span>
                  <span>{data.enrollment.status}</span>
                </>
              )}
              {data.xp && (
                <>
                  <span>·</span>
                  <span>
                    XP: {data.xp.balance.toLocaleString()} · Nivel{" "}
                    {data.xp.level}
                  </span>
                </>
              )}
            </div>
          </div>
          {data.streak && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <Flame className="mx-auto mb-0.5 size-5 text-amber-400" />
                <p className="text-lg font-bold tabular-nums">
                  {data.streak.current_streak}
                </p>
                <p className="text-[11px] text-white/60">Racha</p>
              </div>
              <div className="text-center">
                <Trophy className="mx-auto mb-0.5 size-5 text-green-400" />
                <p className="text-lg font-bold tabular-nums">
                  {data.streak.nb_current_streak}
                </p>
                <p className="text-[11px] text-white/60">Racha NB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6 Mission Progress Rings (as bars) */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="Misiones de hoy"
          description="Estado actual de cada misión"
          icon={Target}
          variant="secondary"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {data.tareas_hoy.length > 0
            ? data.tareas_hoy.map((t) => (
                <div
                  key={t.task_code}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-3"
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{
                      background: t.completed
                        ? MISSION_COLORS[t.task_code]
                        : "var(--muted)",
                    }}
                  >
                    {t.completed ? (
                      <CheckCircle2 className="size-6 text-white" />
                    ) : (
                      <Lock className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    {MISSION_LABELS[t.task_code] ?? t.task_code}
                  </span>
                  <Badge
                    className={
                      t.completed
                        ? "bg-success-soft text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {t.completed ? `+${t.points} XP` : "Pendiente"}
                  </Badge>
                </div>
              ))
            : MISSION_ORDER.map((code) => (
                <div
                  key={code}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-3"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Lock className="size-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium">
                    {MISSION_LABELS[code]}
                  </span>
                  <Badge className="bg-muted text-muted-foreground">
                    Sin datos
                  </Badge>
                </div>
              ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Adherencia semanal - Radar chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Adherencia semanal"
            description="Por misión esta semana"
            icon={Target}
            variant="secondary"
          />
          <div className="mt-4 h-[280px]">
            {data.adherencia_semana.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={MISSION_ORDER.map((code) => {
                    const m = data.adherencia_semana.find(
                      (a) => a.task_code === code,
                    );
                    return {
                      mission: MISSION_LABELS[code] ?? code,
                      pct: m?.pct ?? 0,
                    };
                  })}
                >
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="mission" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <Radar
                    name="Adherencia"
                    dataKey="pct"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.2}
                  />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, "Adherencia"]} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sin datos de adherencia.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Evolución 12 semanas — ChartTabs */}
        <PatientEvolucionCard data={data} />
      </section>

      {/* Scores */}
      {data.scores && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.scores.health && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader
                title="Índice de Salud"
                icon={Stethoscope}
                variant="secondary"
              />
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums">
                  {data.scores.health.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <TrendBadge trend={data.scores.health.trend} />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {[
                  { label: "Adherencia", value: data.scores.health.score_adherence },
                  { label: "Clínico", value: data.scores.health.score_clinical },
                  { label: "Nutrición", value: data.scores.health.score_nutrition },
                  { label: "Psicología", value: data.scores.health.score_psychology },
                  { label: "Ejercicio", value: data.scores.health.score_exercise },
                ].map((dim) => (
                  <div key={dim.label} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-muted-foreground">
                      {dim.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, dim.value))}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium tabular-nums">
                      {dim.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.scores.transformation && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader
                title="Índice de Transformación"
                icon={TrendingUp}
                variant="secondary"
              />
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums">
                  {data.scores.transformation.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <Badge variant="outline" className="text-xs">
                  Semana {data.scores.transformation.week_number}
                </Badge>
                <TrendBadge trend={data.scores.transformation.overall_trend} />
                {data.scores.transformation.previous !== null &&
                  data.scores.transformation.previous !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      anterior: {data.scores.transformation.previous}
                    </span>
                  )}
              </div>
              {data.scores.transformation.detail &&
              Object.keys(data.scores.transformation.detail).length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Indicador</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Delta</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-center">Favorable</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(data.scores.transformation.detail).map(
                        ([code, detail]) => (
                          <TableRow key={code}>
                            <TableCell className="font-medium text-sm">
                              {code}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {detail.baseline} {detail.unit}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums font-medium">
                              {detail.current} {detail.unit}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              <span
                                className={
                                  detail.delta > 0
                                    ? "text-success"
                                    : detail.delta < 0
                                      ? "text-destructive"
                                      : ""
                                }
                              >
                                {detail.delta > 0 ? "+" : ""}
                                {detail.delta}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              <span
                                className={
                                  detail.delta_pct > 0
                                    ? "text-success"
                                    : detail.delta_pct < 0
                                      ? "text-destructive"
                                      : ""
                                }
                              >
                                {detail.delta_pct > 0 ? "+" : ""}
                                {detail.delta_pct}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {detail.favorable ? (
                                <span className="text-success text-sm">✓</span>
                              ) : (
                                <span className="text-destructive text-sm">✗</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">
                              {detail.score}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-muted-foreground py-4">
                  No hay indicadores disponibles para esta semana.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Clinical Metrics */}
      <ClinicalMetricsSection metrics={data.mediciones_clinicas} />

      {/* IA Analysis placeholder */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4C1D95)" }}
          >
            <Sparkles className="size-5 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#7C3AED]">
              IA · Análisis individual
            </span>
            <span className="text-[15px] font-bold text-foreground">
              Análisis inteligente
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              El análisis IA de este paciente (fortalezas, áreas de mejora,
              predicciones de racha y riesgo de abandono) estará disponible
              próximamente.
            </p>
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-info-foreground">
              <Clock className="size-3" />
              Próximamente
            </span>
          </div>
        </div>
      </div>

      {/* Weaknesses + Interventions + Clinical Reviews */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Weaknesses */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title="Debilidades"
            icon={ShieldAlert}
            variant="primary"
          />
          {data.weaknesses.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                Sin debilidades detectadas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data.weaknesses.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                >
                  <Badge
                    className={
                      w.severity === "critical"
                        ? "bg-destructive-soft text-destructive"
                        : w.severity === "high"
                          ? "bg-warning-soft text-warning"
                          : "bg-warning-soft/60 text-warning"
                    }
                  >
                    {w.severity}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {w.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interventions */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title="Intervenciones"
            icon={ClipboardPenLine}
            variant="primary"
          />
          {data.interventions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                Sin intervenciones registradas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data.interventions.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                >
                  <Badge variant="outline" className="text-[10px]">
                    {inv.type}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {inv.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Reviews */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title="Revisiones clínicas"
            icon={Stethoscope}
            variant="primary"
          />
          {data.clinical_reviews.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                Sin revisiones pendientes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data.clinical_reviews.map((cr) => (
                <div
                  key={cr.id}
                  className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {cr.rule_code}
                  </span>
                  {cr.delta_pct !== null && (
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        cr.delta_pct >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {cr.delta_pct >= 0 ? "+" : ""}
                      {cr.delta_pct}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Acciones clínicas */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="Acciones clínicas"
          description="Enlaces rápidos a acciones disponibles"
          icon={Stethoscope}
          variant="secondary"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/program/interventions">
            <Button variant="outline" size="sm">
              <ClipboardPenLine data-icon="inline-start" />
              Intervenir
            </Button>
          </Link>
          <Link href="/program/weaknesses">
            <Button variant="outline" size="sm">
              <ShieldAlert data-icon="inline-start" />
              Debilidades
            </Button>
          </Link>
          <Link href="/program/scores">
            <Button variant="outline" size="sm">
              <TrendingUp data-icon="inline-start" />
              Scores
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

// --- Sub-componentes ---

/** Card: Evolución 12 semanas — tabs for adherencia / glucosa / bmi / hba1c / grasa. */
function PatientEvolucionCard({
  data,
}: {
  data: import("../types/erp").PatientOverviewDto;
}) {
  const [tab, setTab] = usePersistedTab("360-evolucion", "adherencia");

  const metrics = data.mediciones_clinicas;
  const clinicalItems: {
    key: "bmi" | "hba1c" | "body_fat" | "glucose";
    label: string;
    color: string;
  }[] = [
    { key: "bmi", label: "BMI", color: CLINICAL_COLORS.bmi },
    { key: "hba1c", label: "HbA1c", color: CLINICAL_COLORS.hba1c },
    { key: "body_fat", label: "% Grasa", color: CLINICAL_COLORS.body_fat },
    { key: "glucose", label: "Glucosa", color: CLINICAL_COLORS.glucose },
  ];

  // Build per-metric 12-week chart data
  const buildMetricChartData = (
    metricKey: "bmi" | "hba1c" | "body_fat" | "glucose"
  ) => {
    const snap = metrics?.[metricKey];
    if (!snap?.series_12w?.length) return null;
    return snap.series_12w.map((pt) => {
      const d = new Date(pt.date);
      const label = isNaN(d.getTime())
        ? String(pt.date)
        : d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
      return { date: label, value: pt.value };
    });
  };

  return (
    <ChartTabs
      tabs={[
        { key: "adherencia", label: "Adherencia" },
        { key: "glucosa", label: "Glucosa" },
        { key: "bmi", label: "BMI" },
        { key: "hba1c", label: "HbA1c" },
        { key: "grasa", label: "% Grasa" },
      ]}
      value={tab}
      onChange={setTab}
      title="Evolución 12 semanas"
      description="Tendencia semanal de adherencia y mediciones"
      icon={TrendingUp}
    >
      <div className="h-[280px]">
        {tab === "adherencia" && (
          data.evolucion_12_semanas.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.evolucion_12_semanas}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week_start"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `S${Math.ceil(d.getDate() / 7)}`;
                  }}
                />
                <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis yAxisId="xp" orientation="right" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="pct"
                  name="Adherencia %"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="xp"
                  type="monotone"
                  dataKey="xp"
                  name="XP ganado"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Sin datos de evolución.
              </p>
            </div>
          )
        )}

        {(tab === "bmi" || tab === "hba1c" || tab === "grasa" || tab === "glucosa" || tab === "glucose") && (() => {
          const metricKey =
            tab === "grasa" ? "body_fat" : tab === "glucosa" || tab === "glucose" ? "glucose" : (tab as "bmi" | "hba1c" | "glucose");
          const item = clinicalItems.find((c) => c.key === metricKey);
          const chartData = buildMetricChartData(metricKey);

          if (!chartData || chartData.length === 0) {
            return (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sin datos de {item?.label ?? tab}.
                </p>
              </div>
            );
          }

          return (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value) => [Number(value).toFixed(1), item?.label ?? tab]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={item?.label ?? tab}
                  stroke={item?.color ?? "var(--primary)"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
      </div>
    </ChartTabs>
  );
}

function ClinicalMetricsSection({
  metrics,
}: {
  metrics: import("../types/erp").PatientOverviewClinicalMetricsDto | null;
}) {
  if (!metrics) return null;

  const items: {
    key: "bmi" | "hba1c" | "body_fat";
    label: string;
    icon: LucideIcon;
    color: string;
    threshold: number;
    thresholdLabel: string;
  }[] = [
    { key: "bmi", label: "BMI", icon: Weight, color: CLINICAL_COLORS.bmi, threshold: 30, thresholdLabel: "≥ 30" },
    { key: "hba1c", label: "HbA1c", icon: Droplet, color: CLINICAL_COLORS.hba1c, threshold: 7, thresholdLabel: "≥ 7" },
    { key: "body_fat", label: "% Grasa", icon: Activity, color: CLINICAL_COLORS.body_fat, threshold: 25, thresholdLabel: "≥ 25" },
  ];

  const chartData = buildClinicalChartData(metrics);
  const hasChartData = chartData.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        title="Mediciones clínicas"
        description="Última medición, tendencia y evolución 12 semanas"
        icon={Stethoscope}
        variant="secondary"
      />

      {/* 3 Metric Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => {
          const snap = metrics[item.key];
          const latest = snap?.latest_value;
          const delta = snap?.delta_pct;
          const baseline = snap?.baseline_value;
          const observed = snap?.observed_at;

          return (
            <div
              key={item.key}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex size-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <item.icon className="size-5" style={{ color: item.color }} />
                </div>
                <span className="text-sm font-semibold">{item.label}</span>
                {latest !== null && latest !== undefined && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px]"
                    style={{ borderColor: `${item.color}40`, color: item.color }}
                  >
                    Umbral {item.thresholdLabel}
                  </Badge>
                )}
              </div>

              {latest !== null && latest !== undefined ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                    {latest.toFixed(1)}
                  </span>
                  {snap?.unit && (
                    <span className="text-xs text-muted-foreground">{snap.unit}</span>
                  )}
                  {delta !== null && delta !== undefined && (
                    <span
                      className={`text-[11px] font-semibold ${
                        delta <= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {delta <= 0 ? "↓" : "↑"} {Math.abs(delta).toFixed(1)}%
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-muted-foreground/50">—</span>
                  <span className="text-xs text-muted-foreground">Sin registro</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {baseline !== null && baseline !== undefined && (
                  <span>Base: {baseline.toFixed(1)}</span>
                )}
                {observed && (
                  <span className="ml-auto">{relativeTime(observed)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 12-week evolution chart */}
      {hasChartData ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Evolución 12 semanas"
            description="BMI, HbA1c y % grasa corporal"
            icon={TrendingUp}
            variant="secondary"
          />
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value, name) => [Number(value).toFixed(1), name]}
                  labelFormatter={(label) => `Semana: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {items.map((item) => {
                  const snap = metrics[item.key];
                  if (!snap?.series_12w?.length) return null;
                  return (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.label}
                      stroke={item.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sin serie 12 semanas</p>
        </div>
      )}
    </section>
  );
}

/** Merge 12-week series from BMI/HbA1c/body_fat into a unified array for recharts. */
function buildClinicalChartData(
  metrics: import("../types/erp").PatientOverviewClinicalMetricsDto,
): Record<string, string | number>[] {
  const weekMap = new Map<string, Record<string, string | number>>();

  const keys: Array<"bmi" | "hba1c" | "body_fat"> = ["bmi", "hba1c", "body_fat"];
  const orderMap = new Map<string, number>();
  for (const key of keys) {
    const series = metrics[key]?.series_12w;
    if (!series?.length) continue;
    for (const pt of series) {
      // Backend serializa la fecha ISO completa; se agrupa por día (dd MMM) para el eje X.
      const d = new Date(pt.date);
      const ts = d.getTime();
      const label = isNaN(ts)
        ? String(pt.date)
        : d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
      if (!orderMap.has(label)) orderMap.set(label, isNaN(ts) ? 0 : ts);
      if (!weekMap.has(label)) {
        weekMap.set(label, { week: label });
      }
      weekMap.get(label)![key] = pt.value;
    }
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => (orderMap.get(a[0]) ?? 0) - (orderMap.get(b[0]) ?? 0))
    .map(([, row]) => row);
}

function TrendBadge({ trend }: { trend: string }) {
  const config = {
    up: { label: "Mejorando", className: "bg-success-soft text-success-foreground" },
    down: { label: "Empeorando", className: "bg-destructive-soft text-destructive" },
    stable: { label: "Estable", className: "bg-muted text-muted-foreground" },
  } as const;
  const c = config[trend as keyof typeof config] ?? config.stable;
  return (
    <Badge className={c.className}>
      {trend === "up" ? (
        <TrendingUp className="mr-1 size-3" />
      ) : trend === "down" ? (
        <TrendingDown className="mr-1 size-3" />
      ) : (
        <Minus className="mr-1 size-3" />
      )}
      {c.label}
    </Badge>
  );
}

// --- Skeleton / Error / Not Found ---

function PatientSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-[#0B2B4A] p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 200px at 85% -20%, rgba(212,175,55,0.18), transparent 60%)" }} />
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
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-36 mb-4" />
            <Skeleton className="h-[280px] w-full rounded" />
          </div>
        ))}
      </section>
    </div>
  );
}

function PatientError({
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

function PatientNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <UserRound className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Paciente no encontrado</p>
        <p className="text-xs text-muted-foreground">
          El paciente no existe o no está dentro de tu alcance de datos.
        </p>
      </div>
      <Link href="/program/dashboard">
        <Button variant="outline" size="sm">
          <ArrowLeft data-icon="inline-start" />
          Volver al dashboard
        </Button>
      </Link>
    </div>
  );
}
