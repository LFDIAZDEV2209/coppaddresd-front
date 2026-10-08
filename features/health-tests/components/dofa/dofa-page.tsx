"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  HeartPulse,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useIndicators } from "../../hooks/use-health-tests";
import type { DofaItem } from "../../types";
import { StatSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";

const QUADRANT_STYLE = {
  fortalezas: {
    label: "Fortalezas",
    description: "Aspectos positivos predominantes de la población",
    icon: ShieldCheck,
    headerBg: "linear-gradient(135deg,#0F766E,#10B981)",
    itemColor: "#10B981",
    barBg: "var(--success-soft)",
  },
  oportunidades: {
    label: "Oportunidades",
    description: "Áreas con potencial claro de intervención",
    icon: Lightbulb,
    headerBg: "linear-gradient(135deg,#1D4ED8,#0EA5E9)",
    itemColor: "#0EA5E9",
    barBg: "var(--info-soft)",
  },
  debilidades: {
    label: "Debilidades",
    description: "Problemas frecuentes detectados en la evaluación",
    icon: ArrowDownRight,
    headerBg: "linear-gradient(135deg,#B45309,#F59E0B)",
    itemColor: "#F59E0B",
    barBg: "var(--warning-soft)",
  },
  amenazas: {
    label: "Amenazas",
    description: "Riesgos relevantes que requieren atención",
    icon: AlertTriangle,
    headerBg: "linear-gradient(135deg,#B91C1C,#EF4444)",
    itemColor: "#EF4444",
    barBg: "var(--destructive-soft)",
  },
} as const;

/**
 * DOFA poblacional derivado de los indicadores clínicos reales de la
 * batería: fortalezas, oportunidades, debilidades y amenazas.
 */
export function DofaPage() {
  const t = useT();
  const { data, loading, error, reload } = useIndicators();

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={3} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
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

  if (!data) return null;

  const dofa = buildDofa(data.aggregates, t);
  const totalAffected = new Set(data.aggregates.flatMap(a => a.affectedPatientIds)).size;
  const totalEvaluated = new Set(data.aggregates.flatMap(a => a.evaluatedPatientIds)).size;


  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Análisis DOFA poblacional")}
        description={t(
          "Diagnóstico de fortalezas, oportunidades, debilidades y amenazas construido con los resultados reales de la batería",
        )}
        icon={TrendingUp}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("Población analizada")}
          value={String(totalEvaluated)}
          icon={Users}
          variant="primary"
          context={t("Resultados de la batería")}
        />
        <StatCard
          label={t("Pacientes en riesgo alto/crítico")}
          value={String(totalAffected)}
          icon={HeartPulse}
          variant="destructive"
          context={t("Requieren intervención")}
        />
        <StatCard
          label={t("Indicadores con amenaza")}
          value={String(dofa.amenazas.length)}
          icon={AlertTriangle}
          variant="warning"
          context={t("Requieren seguimiento prioritario")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DofaCard quadrant="fortalezas" items={dofa.fortalezas} />
        <DofaCard quadrant="oportunidades" items={dofa.oportunidades} />
        <DofaCard quadrant="debilidades" items={dofa.debilidades} />
        <DofaCard quadrant="amenazas" items={dofa.amenazas} />
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-[11.5px] text-muted-foreground">
        <ArrowUpRight className="size-3.5 shrink-0" />
        {t(
          "El DOFA describe las severidades registradas y los datos faltantes. La tendencia refleja meses con evaluaciones reales.",
        )}
      </p>
    </div>
  );
}

function DofaCard({
  quadrant,
  items,
}: {
  quadrant: keyof typeof QUADRANT_STYLE;
  items: DofaItem[];
}) {
  const t = useT();
  const style = QUADRANT_STYLE[quadrant];
  const Icon = style.icon;
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: style.headerBg }}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
          <Icon className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-[13px] font-bold text-white">{t(style.label)}</h3>
          <p className="truncate text-[11px] text-white/80">
            {t(style.description)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t("Sin hallazgos en este cuadrante")}
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-foreground">
                  {item.title}
                </span>
                <span
                  className="shrink-0 font-bold"
                  style={{ color: style.itemColor }}
                >
                  {item.value}
                  <span className="ml-0.5 font-medium text-muted-foreground">
                    {item.metric}
                  </span>
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: style.barBg }}
                role="progressbar"
                aria-valuenow={Math.round((item.value / max) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={item.title}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((item.value / max) * 100)}%`,
                    backgroundColor: style.itemColor,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

/** DOFA descriptivo basado en severidades persistidas, sin umbrales inventados. */
function buildDofa(aggregates: import("../../types").IndicatorAggregate[], t: ReturnType<typeof useT>) {
  const fortalezas: DofaItem[] = [], oportunidades: DofaItem[] = [], debilidades: DofaItem[] = [], amenazas: DofaItem[] = [];
  for (const aggregate of aggregates) {
    const { indicator, average, distribution, evaluatedCount, affectedCount } = aggregate;
    if (!evaluatedCount) continue;
    const base = { id: indicator.id, title: indicator.name, metric: "%", indicatorId: indicator.id, value: average };
    if (affectedCount > 0) amenazas.push({ ...base, quadrant: "amenazas", description: t("{count} pacientes con severidad alta/crítica registrada.", { count: String(affectedCount) }) });
    else if (distribution["sin-evaluar"] === 0 || distribution.bajo > 0) fortalezas.push({ ...base, quadrant: "fortalezas", description: t("Sin resultados de severidad alta/crítica registrados en esta categoría.") });
    if (distribution.moderado > 0) oportunidades.push({ ...base, quadrant: "oportunidades", description: t("{count} pacientes con severidad moderada registrada.", { count: String(distribution.moderado) }) });
    if (distribution["sin-evaluar"] > 0) debilidades.push({ ...base, quadrant: "debilidades", value: distribution["sin-evaluar"], metric: "", description: t("{count} pacientes sin severidad disponible en esta categoría.", { count: String(distribution["sin-evaluar"]) }) });
  }
  return { fortalezas, oportunidades, debilidades, amenazas };
}
