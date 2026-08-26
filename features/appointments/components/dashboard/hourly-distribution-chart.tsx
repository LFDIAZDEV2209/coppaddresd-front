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
import { useT } from "@/providers/i18n-provider";
import type { HourlyCountDto } from "../../types";

/**
 * Franjas horarias de mayor demanda: citas por hora del día en el rango.
 * Solo muestra horas con actividad para mantener el eje legible.
 */
export function HourlyDistributionChart({
  hourlyDistribution,
  loading,
}: {
  hourlyDistribution: HourlyCountDto[];
  loading: boolean;
}) {
  const t = useT();

  if (loading) {
    return <div className="h-56 w-full animate-pulse rounded-xl bg-muted" />;
  }

  const data = hourlyDistribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      label: `${String(item.hour).padStart(2, "0")}:00`,
      citas: item.count,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-[12.5px] text-muted-foreground">
        {t('Sin citas en el período')}
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [String(value), t('Citas')]}
            labelFormatter={(label) => `${t('Hora')} ${label}`}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          />
          <Bar dataKey="citas" fill="var(--chart-2)" radius={[5, 5, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}