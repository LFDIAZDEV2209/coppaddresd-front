"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import type { LucideIcon } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const axisProps = {
  tick: { fontSize: 10.5, fill: "var(--muted-foreground)" },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  fontSize: 12,
  boxShadow: "0 12px 32px rgba(13,27,75,0.16)",
} as const;

function ChartFrame({
  loading,
  height = "h-56",
  children,
}: {
  loading: boolean;
  height?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className={`${height} w-full animate-pulse rounded-xl bg-muted`} />;
  }
  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityLineChart({
  data,
  loading = false,
}: {
  data: { dia: string; posts: number; comentarios: number; reacciones: number }[];
  loading?: boolean;
}) {
  const t = useT();
  // Escala dinámica del eje Y según el pico máximo de actividad
  const max = Math.max(...data.flatMap((d) => [d.posts, d.comentarios, d.reacciones]), 0);
  const step = max <= 20 ? 5 : max <= 100 ? 25 : 50;
  const domainMax = Math.ceil(max / step) * step || step;
  return (
    <ChartFrame loading={loading}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {(["posts", "comentarios", "reacciones"] as const).map((k, i) => (
            <linearGradient key={k} id={`cpLine-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0.22} />
              <stop offset="100%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="dia" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} domain={[0, domainMax]} allowDecimals={false} />
        <Tooltip
          formatter={(value) => String(value)}
          contentStyle={tooltipStyle}
          labelFormatter={(l) => `${t("Día")} ${l}`}
          cursor={{ stroke: "var(--border)", strokeDasharray: 3 }}
        />
        <Area type="linear" dataKey="posts" name={t("Posts")} stroke="var(--chart-1)" strokeWidth={2} fill="url(#cpLine-posts)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} animationDuration={450} />
        <Area type="linear" dataKey="comentarios" name={t("Comentarios")} stroke="var(--chart-2)" strokeWidth={2} fill="url(#cpLine-comentarios)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} animationDuration={450} />
        <Area type="linear" dataKey="reacciones" name={t("Reacciones")} stroke="var(--chart-3)" strokeWidth={2} fill="url(#cpLine-reacciones)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} animationDuration={450} />
      </AreaChart>
    </ChartFrame>
  );
}

export function PostTypesDoughnut({
  data,
  loading = false,
}: {
  data: { name: string; value: number }[];
  loading?: boolean;
}) {
  const t = useT();
  return (
    <ChartFrame loading={loading}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={0}
          outerRadius={90}
          paddingAngle={1}
          cornerRadius={0}
          stroke="var(--card)"
          strokeWidth={2}
          labelLine={false}
          label={(props) => {
            const { cx, cy, midAngle, outerRadius, percent } = props;
            // Valores numéricos siempre presentes en Pie render
            const cxN = cx ?? 0;
            const cyN = cy ?? 0;
            const midAngleN = midAngle ?? 0;
            const outerRadiusN = outerRadius ?? 0;
            const percentN = percent ?? 0;
            // No renderizar etiqueta en porciones muy pequeñas
            if (percentN < 0.05) return null;
            const RADIAN = Math.PI / 180;
            const radius = outerRadiusN * 0.55;
            const x = cxN + radius * Math.cos(-midAngleN * RADIAN);
            const y = cyN + radius * Math.sin(-midAngleN * RADIAN);
            return (
              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                {`${(percentN * 100).toFixed(0)}%`}
              </text>
            );
          }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value}%`, String(name)]} />
      </PieChart>
    </ChartFrame>
  );
}

export function PeakHoursBar({
  data,
  loading = false,
  height,
}: {
  data: { hora: string; valor: number }[];
  loading?: boolean;
  height?: string;
}) {
  const t = useT();
  return (
    <ChartFrame loading={loading} height={height}>
      <BarChart data={data} margin={{ top: 0, right: 8, left: -18, bottom: -10 }} barCategoryGap="18%">
        <defs>
          <linearGradient id="cpBar-hora" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="hora" {...axisProps} minTickGap={16} interval={2} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => String(value)} labelFormatter={(l) => `${t("Hora")} ${l}`} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="valor" name={t("Actividad")} fill="url(#cpBar-hora)" radius={[5, 5, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ChartFrame>
  );
}

export function DiagnosisRadar({
  data,
  loading = false,
}: {
  data: { subject: string; value: number; fullMark: number }[];
  loading?: boolean;
}) {
  const t = useT();
  return (
    <ChartFrame loading={loading}>
      <RadarChart data={data} outerRadius="65%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} angle={90} />
        <Radar name={t("Participación")} dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.28} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => String(value)} />
      </RadarChart>
    </ChartFrame>
  );
}

export function GroupedBarChart({
  data,
  bars,
  loading = false,
  height,
}: {
  data: Record<string, string | number>[];
  bars: { key: string; name: string; color: string }[];
  loading?: boolean;
  height?: string;
}) {
  const t = useT();
  return (
    <ChartFrame loading={loading} height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={16} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => String(value)} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

export function XpLineChart({
  data,
  lines,
  loading = false,
  height,
}: {
  data: Record<string, string | number>[];
  lines: { key: string; name: string; color: string }[];
  loading?: boolean;
  height?: string;
}) {
  const t = useT();
  return (
    <ChartFrame loading={loading} height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={16} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => String(value)} cursor={{ strokeDasharray: 3, stroke: "var(--border)" }} />
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export function SimpleBarChart({
  data,
  loading = false,
  color = "var(--chart-1)",
  height,
}: {
  data: { label: string; value: number }[];
  loading?: boolean;
  color?: string;
  height?: string;
}) {
  const t = useT();
  return (
    <ChartFrame loading={loading} height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={12} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => String(value)} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="value" name={t("Valor")} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartFrame>
  );
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; icon?: LucideIcon }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
