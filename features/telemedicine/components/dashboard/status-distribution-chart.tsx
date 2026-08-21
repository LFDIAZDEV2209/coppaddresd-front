"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusCountDto } from "../../types";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
} from "../../utils/format";

/**
 * Distribución de citas por estado (donut). Colores del design system vía
 * appointmentStatusColor (mismos que los badges del módulo).
 */
export function StatusDistributionChart({
  statusDistribution,
  loading,
}: {
  statusDistribution: StatusCountDto[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-56 w-full animate-pulse rounded-xl bg-muted" />;
  }

  const data = statusDistribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: appointmentStatusLabel[item.status],
      value: item.count,
      color: appointmentStatusColor(item.status).dot,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-[12.5px] text-muted-foreground">
        Sin datos de citas
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-56 flex-col items-center justify-center gap-4">
      <div className="relative h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value) => [String(value), "Citas"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {total}
          </span>
          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
            citas
          </span>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium text-foreground">{entry.name}</span>
            <span className="text-muted-foreground">({entry.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}