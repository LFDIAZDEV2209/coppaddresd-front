"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  ClipboardCheck,
  HeartPulse,
  Hourglass,
  PieChart as PieChartIcon,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useDashboard } from "../../hooks/use-health-tests";
import type { HealthAlert, RiskLevel } from "../../types";
import { RISK_LABELS, riskSeverity } from "../../lib/domain";
import { formatDate } from "../../lib/format";
import { riskHex, severityHex } from "../shared/colors";
import { SeverityBadge } from "../shared/badges";
import {
  ChartCard,
  ChartCardSkeleton,
  StatSkeleton,
} from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";

/**
 * Dashboard global del módulo de Tests de Salud.
 * Todas las métricas se derivan del service (mock hoy, API mañana).
 */
export function HealthTestsDashboard() {
  const t = useT();
  const { data, loading, error, reload } = useDashboard();

  const stats = useMemo(() => {
    if (!data) return null;
    const { patients, tests, alerts } = data;
    const totalAssignments = patients.length * tests.length;
    const completed = patients.reduce(
      (acc, p) =>
        acc + p.results.filter((r) => r.state === "completado").length,
      0,
    );
    const inProgress = patients.reduce(
      (acc, p) =>
        acc + p.results.filter((r) => r.state === "en-progreso").length,
      0,
    );
    const evaluated = patients.filter(
      (p) => p.results.filter((r) => r.state === "completado").length >= 5,
    ).length;
    const pending = patients.length - evaluated;
    const coverage =
      totalAssignments === 0
        ? 0
        : Math.round((completed / totalAssignments) * 100);
    const activeAlerts = alerts.filter(
      (a) => a.status === "activa" || a.status === "en-revision",
    ).length;
    const atRisk = patients.filter((p) => {
      const evaluated = p.results.filter((r) => r.score !== null);
      let worst: RiskLevel = "sin-evaluar";
      for (const r of evaluated) {
        if (riskSeverity(r.risk) > riskSeverity(worst)) worst = r.risk;
      }
      return worst === "alto" || worst === "critico";
    }).length;
    return {
      totalAssignments,
      completed,
      inProgress,
      evaluated,
      pending,
      coverage,
      activeAlerts,
      atRisk,
    };
  }, [data]);

  const header = (
    <PageHeader
      title={t("Tests de salud")}
      description={t(
        "Monitoreo, análisis y seguimiento de la evaluación de salud de la población",
      )}
      icon={HeartPulse}
      actions={
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/health-tests/pacientes" />}
        >
          {t("Tabla maestra")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      }
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {header}
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data || !stats) return null;

  const pieData = [
    { name: t("Completados"), value: stats.completed, color: "#10B981" },
    { name: t("En progreso"), value: stats.inProgress, color: "#0EA5E9" },
    {
      name: t("Pendientes"),
      value: stats.totalAssignments - stats.completed - stats.inProgress,
      color: "#94A3B8",
    },
  ];

  const riskDistribution = riskDistributionOf(data.patients);

  const recentAlerts = [...data.alerts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Pacientes evaluados")}
          value={String(stats.evaluated)}
          icon={Users}
          variant="primary"
          context={t("Con batería avanzada o completa")}
        />
        <StatCard
          label={t("Pacientes pendientes")}
          value={String(stats.pending)}
          icon={Hourglass}
          variant="warning"
          context={t("Requieren iniciar o completar")}
        />
        <StatCard
          label={t("Cobertura global")}
          value={`${stats.coverage}%`}
          icon={PieChartIcon}
          variant="success"
          context={t("{completed} de {total} tests completados", {
            completed: String(stats.completed),
            total: String(stats.totalAssignments),
          })}
        />
        <StatCard
          label={t("Alertas activas")}
          value={String(stats.activeAlerts)}
          icon={BellRing}
          variant="destructive"
          context={t("Requieren revisión")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("Cobertura de la batería")}
          description={t("Estado global de las evaluaciones asignadas")}
          icon={ClipboardCheck}
          actions={
            <Link
              href="/health-tests/cobertura"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/85 transition-colors hover:text-white"
            >
              {t("Ver cobertura")}
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative size-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}`, ""]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                  {stats.coverage}%
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  {t("Cobertura")}
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2.5">
              {pieData.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between text-[12.5px]"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name}
                  </span>
                  <span className="font-semibold text-foreground">
                    {entry.value}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5 text-[12.5px]">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="size-3.5 text-success" />
                  {t("Pacientes en la batería")}
                </span>
                <span className="font-semibold text-foreground">
                  {data.patients.length}
                </span>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title={t("Evolución de la cobertura")}
          description={t("Porcentaje de tests completados · últimos 12 meses")}
          icon={TrendingUp}
          actions={
            <Link
              href="/health-tests/cobertura"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/85 transition-colors hover:text-white"
            >
              {t("Ver detalle")}
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.coverageTrend}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="covFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--sidebar)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--sidebar)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
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
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, t("Cobertura")]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="var(--sidebar)"
                  strokeWidth={2}
                  fill="url(#covFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("Distribución por nivel de riesgo")}
          description={t(
            "Riesgo poblacional según los resultados de la batería",
          )}
          icon={Activity}
        >
          {riskDistribution.total === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {t("Sin pacientes evaluados todavía")}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution.items}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={76}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {riskDistribution.items.map((entry) => (
                        <Cell key={entry.risk} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}`, ""]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex w-full flex-col gap-2">
                {riskDistribution.items.map((entry) => (
                  <div
                    key={entry.risk}
                    className="flex items-center justify-between text-[12.5px]"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.name}
                    </span>
                    <span className="font-semibold text-foreground">
                      {entry.value}
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5 text-[12.5px]">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <HeartPulse className="size-3.5 text-destructive" />
                    {t("Riesgo elevado (alto o crítico)")}
                  </span>
                  <span className="font-semibold text-destructive">
                    {stats.atRisk}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t("Alertas recientes")}
          description={t("Resultados que requieren atención")}
          icon={BellRing}
          actions={
            <Link
              href="/health-tests/alertas"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/85 transition-colors hover:text-white"
            >
              {t("Ver todas")}
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {recentAlerts.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {t("Sin alertas activas")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentAlerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title={t("Cobertura por categoría clínica")}
        description={t(
          "Qué dominios de la evaluación presentan mejor o peor adherencia",
        )}
        icon={PieChartIcon}
        actions={
          <Link
            href="/health-tests/cobertura"
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/85 transition-colors hover:text-white"
          >
            {t("Cobertura completa")}
            <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        <CategoryCoverageChart />
      </ChartCard>
    </div>
  );
}

function riskDistributionOf(
  patients: { results: { score: number | null; risk: RiskLevel }[] }[],
) {
  const counts: Record<RiskLevel, number> = {
    bajo: 0,
    moderado: 0,
    alto: 0,
    critico: 0,
    "sin-evaluar": 0,
  };
  for (const p of patients) {
    const evaluated = p.results.filter((r) => r.score !== null);
    let worst: RiskLevel = "sin-evaluar";
    for (const r of evaluated) {
      if (riskSeverity(r.risk) > riskSeverity(worst)) worst = r.risk;
    }
    counts[worst] = (counts[worst] ?? 0) + 1;
  }
  const order: RiskLevel[] = [
    "bajo",
    "moderado",
    "alto",
    "critico",
    "sin-evaluar",
  ];
  const items = order
    .filter((risk) => counts[risk] > 0)
    .map((risk) => ({
      risk,
      name: RISK_LABELS[risk],
      value: counts[risk],
      color: riskHex(risk),
    }));
  const total = order.reduce((acc, r) => acc + counts[r], 0);
  return { items, total };
}

function AlertRow({ alert }: { alert: HealthAlert }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${severityHex(alert.severity)}1A` }}
      >
        <BellRing
          className="size-4"
          style={{ color: severityHex(alert.severity) }}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-semibold text-foreground">
          {alert.message}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {alert.indicatorName} · {formatDate(alert.createdAt)}
        </span>
      </div>
      <SeverityBadge
        severity={alert.severity}
        className="hidden sm:inline-flex"
      />
    </li>
  );
}

function CategoryCoverageChart() {
  const t = useT();
  const { data, loading, error, reload } = useDashboard();
  const categories = useMemo(() => {
    if (!data) return [];
    const byCategory = new Map<
      string,
      { name: string; coverage: number; color: string }
    >();
    for (const test of data.tests) {
      const completed = data.patients.filter((p) =>
        p.results.some((r) => r.testId === test.id && r.state === "completado"),
      ).length;
      const coverage = Math.round((completed / data.patients.length) * 100);
      const current = byCategory.get(test.category) ?? {
        name: test.category,
        coverage: 0,
        color: "",
      };
      byCategory.set(test.category, {
        ...current,
        coverage: Math.max(current.coverage, coverage),
        color: categoryColor(test.category),
      });
    }
    return [...byCategory.values()].sort((a, b) => a.coverage - b.coverage);
  }, [data]);

  if (loading && !data)
    return <div className="h-56 w-full animate-pulse rounded-xl bg-muted" />;
  if (error && !data)
    return <ModuleErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const chartData = categories.map((c) => ({
    name: c.name,
    coverage: c.coverage,
    color: c.color,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, t("Cobertura")]}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          />
          <Bar dataKey="coverage" radius={[0, 5, 5, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function categoryColor(category: string): string {
  const map: Record<string, string> = {
    "historia-clinica": "#1B6CA8",
    nutricion: "#1D9E75",
    movimiento: "#E87B2B",
    sueno: "#7C3AED",
    adherencia: "#0EA5E9",
    "salud-mental": "#4F46E5",
    cardiometabolico: "#E24B4A",
  };
  return map[category] ?? "#64748B";
}
