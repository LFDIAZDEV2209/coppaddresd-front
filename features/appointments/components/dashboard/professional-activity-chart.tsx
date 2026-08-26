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
        {t('Sin actividad en el período')}
      </div>
    );
  }

  const data = activity.map((item) => ({
    name: item.professionalName ?? t('Profesional'),
    citas: item.total,
    completadas: item.completed,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
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
            formatter={(value, name) => [
              String(value),
              name === "citas" ? t('Citas') : t('Completadas'),
            ]}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          />
          <Bar dataKey="citas" fill="var(--chart-1)" radius={[0, 5, 5, 0]} maxBarSize={18} />
          <Bar dataKey="completadas" fill="var(--chart-3)" radius={[0, 5, 5, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}