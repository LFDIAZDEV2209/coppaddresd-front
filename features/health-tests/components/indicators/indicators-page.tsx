"use client";

import {
  Activity,
  ArrowUpRight,
  HeartPulse,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useIndicators } from "../../hooks/use-health-tests";
import { CATEGORY_LABELS } from "../../lib/domain";
import type { IndicatorAggregate, RiskLevel } from "../../types";
import { categoryAccent, riskHex, scoreBarColor } from "../shared/colors";
import { ScoreBar } from "../shared/progress";
import { StatSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";

/**
 * Indicadores clínicos derivados de los tests reales de la batería.
 * Cada tarjeta muestra promedio poblacional, distribución de riesgo,
 * pacientes afectados y tendencia.
 */
export function IndicatorsPage() {
  const t = useT();
  const { data, loading, error, reload } = useIndicators();

  const header = (
    <PageHeader
      title={t("Indicadores clínicos")}
      description={t(
        "Indicadores derivados de la batería de evaluación: promedios, distribución y tendencias de la población",
      )}
      icon={Activity}
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
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

  if (!data) return null;

  const aggregates = data.aggregates;
  const avgAll = Math.round(
    aggregates.reduce((acc, a) => acc + a.average, 0) /
      Math.max(1, aggregates.length),
  );
  const affected = aggregates.reduce((acc, a) => acc + a.affectedCount, 0);
  const evaluated = aggregates.reduce((acc, a) => acc + a.evaluatedCount, 0);
  const improving = aggregates.filter(
    (a) =>
      a.trend.length >= 2 &&
      a.trend[a.trend.length - 1].value > a.trend[0].value,
  ).length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Promedio global")}
          value={`${avgAll} pts`}
          icon={TrendingUp}
          variant="primary"
          context={t("Sobre los indicadores evaluados")}
        />
        <StatCard
          label={t("Pacientes con riesgo alto/crítico")}
          value={String(affected)}
          icon={HeartPulse}
          variant="destructive"
          context={t("En al menos un indicador")}
        />
        <StatCard
          label={t("Evaluaciones analizadas")}
          value={String(evaluated)}
          icon={Users}
          variant="info"
          context={t("Resultados de la batería")}
        />
        <StatCard
          label={t("Indicadores en mejora")}
          value={`${improving}/${aggregates.length}`}
          icon={ArrowUpRight}
          variant="success"
          context={t("Tendencia positiva vs período anterior")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {aggregates.map((agg) => (
          <IndicatorCard key={agg.indicator.id} aggregate={agg} />
        ))}
      </div>
    </div>
  );
}

function IndicatorCard({ aggregate }: { aggregate: IndicatorAggregate }) {
  const t = useT();
  const {
    indicator,
    average,
    distribution,
    affectedCount,
    evaluatedCount,
    trend,
  } = aggregate;
  const accent = categoryAccent(indicator.category);

  const riskRows: { risk: RiskLevel; count: number }[] = (
    ["bajo", "moderado", "alto", "critico"] as RiskLevel[]
  )
    .map((risk) => ({ risk, count: distribution[risk] ?? 0 }))
    .filter((r) => r.count > 0);

  return (
    <article className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: `${accent}14` }}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{ backgroundColor: `${accent}22` }}
        >
          {indicator.icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="truncate text-[13px] font-bold text-foreground">
            {indicator.name}
          </h3>
          <span className="text-[11px] font-medium" style={{ color: accent }}>
            {CATEGORY_LABELS[indicator.category]}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4">
        <ScoreBar
          value={average}
          label={t("Promedio poblacional")}
          color={scoreBarColor(
            average >= 60 ? "bajo" : average >= 40 ? "moderado" : "alto",
          )}
        />

        {riskRows.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {riskRows.map((row) => (
              <span
                key={row.risk}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: `${riskHex(row.risk)}1A`,
                  color: riskHex(row.risk),
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: riskHex(row.risk) }}
                />
                {row.risk} · {row.count}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11.5px] text-muted-foreground">
            {t("Sin pacientes evaluados todavía")}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-[11.5px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3.5" />
            {t("{count} afectados", { count: String(affectedCount) })}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <HeartPulse className="size-3.5" />
            {t("{count} evaluados", { count: String(evaluatedCount) })}
          </span>
          {trend.length >= 2 && (
            <span
              className={`flex items-center gap-1 font-semibold ${
                trend[trend.length - 1].value >= trend[0].value
                  ? "text-success"
                  : "text-destructive"
              }`}
            >
              <TrendingUp className="size-3.5" />
              {trend[trend.length - 1].value - trend[0].value >= 0 ? "+" : ""}
              {trend[trend.length - 1].value - trend[0].value}
            </span>
          )}
        </div>

        {trend.length >= 2 && (
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`spark-${indicator.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  formatter={(value) => [`${value}`, ""]}
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
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={1.5}
                  fill={`url(#spark-${indicator.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </article>
  );
}
