"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartGradient } from "@/lib/ui/rainbow";
import { useT } from "@/providers/i18n-provider";
import type { ProfessionalActivityDto } from "../../types";

/**
 * Actividad por profesional (solo vista admin global): total de citas en el
 * rango por profesional. Barras horizontales para leer nombres completos.
 */
export function ProfessionalActivityChart({
  activity,
  loading,
}: {
  activity: ProfessionalActivityDto[];
  loading: boolean;
}) {
  const t = useT();

  if (loading) {
    return <div className="h-56 w-full animate-pulse rounded-xl bg-muted" />;
  }

  if (activity.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-[12.5px] text-muted-foreground">
        {t("Sin actividad en el período")}
      </div>
    );
  }

  const data = activity.map((item) => ({
    name: item.professionalName ?? t("Profesional"),
    citas: item.total,
    completadas: item.completed,
  }));

  return (
    <div className="flex h-56 w-full flex-col gap-2">
      <div
        data-slot="professional-plot"
        data-chart-axis="horizontal"
        tabIndex={0}
        role="region"
        aria-label={t("Actividad por profesional")}
        className="min-h-0 flex-1 overflow-y-auto rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div
          style={{
            height: Math.max(196, activity.length * 48 + 24),
            minWidth: 0,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, name) => [String(value), String(name)]}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              />
              <Bar
                name={t("Citas")}
                dataKey="citas"
                fill="var(--spectrum-sky-chart)"
                radius={[0, 8, 8, 0]}
                maxBarSize={18}
              />
              <Bar
                name={t("Completadas")}
                dataKey="completadas"
                fill="var(--spectrum-green-chart)"
                radius={[0, 8, 8, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ul className="flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-foreground">
        {[
          { label: t("Citas"), color: "var(--spectrum-sky-chart)" },
          { label: t("Completadas"), color: "var(--spectrum-green-chart)" },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-4 rounded-sm"
              style={{
                backgroundColor: item.color,
                backgroundImage: chartGradient(item.color, "horizontal"),
              }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
