"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, CalendarRange, CalendarClock } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DailyAppointmentCountDto } from "../../types";
import { toggleActiveClass } from "./range-toggle";

type Bucket = "day" | "week" | "month";

const bucketLabels: Record<Bucket, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
};

const bucketIcons: Record<Bucket, typeof CalendarDays> = {
  day: CalendarDays,
  week: CalendarRange,
  month: CalendarClock,
};

/**
 * Serie temporal de citas (área o barras según el bucket). Agrupa los días en
 * semanas/meses client-side; el backend entrega la serie diaria completa.
 */
export function AppointmentsTrendChart({
  dailySeries,
  loading,
}: {
  dailySeries: DailyAppointmentCountDto[];
  loading: boolean;
}) {
  const t = useT();
  const [bucket, setBucket] = useState<Bucket>("day");

  const data = useMemo(() => {
    if (bucket === "day") {
      return dailySeries.map((d) => ({
        label: formatDay(d.day),
        short: formatShort(d.day),
        citas: d.count,
      }));
    }
    return aggregate(dailySeries, bucket);
  }, [dailySeries, bucket]);

  if (loading) {
    return <div className="h-56 w-full animate-pulse rounded-xl bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-[12.5px] text-muted-foreground">
        {t('Sin citas en el período seleccionado')}
      </div>
    );
  }

  const chart =
    bucket === "day" ? (
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
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
          minTickGap={28}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [String(value), t('Citas')]}
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
          dataKey="citas"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#trendFill)"
        />
      </AreaChart>
    ) : (
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
          allowDecimals={false}
          tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [String(value), t('Citas')]}
          labelFormatter={(label) => String(label)}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        />
        <Bar
          dataKey="citas"
          fill="var(--chart-1)"
          radius={[5, 5, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    );

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        value={[bucket]}
        onValueChange={(values) => {
          const next = values[0] as Bucket | undefined;
          if (next) setBucket(next);
        }}
        size="sm"
        variant="outline"
      >
        {(Object.keys(bucketLabels) as Bucket[]).map((key) => {
          const Icon = bucketIcons[key];
          return (
            <ToggleGroupItem
              key={key}
              value={key}
              className={toggleActiveClass}
            >
              <Icon data-icon="inline-start" />
              {t(bucketLabels[key])}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function formatShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Agrupa la serie diaria en semanas/meses (punto = fin del período). */
function aggregate(series: DailyAppointmentCountDto[], bucket: Bucket) {
  const buckets = new Map<string, { label: string; citas: number }>();

  for (const item of series) {
    const [y, m, d] = item.day.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    let key: string;
    let label: string;
    if (bucket === "month") {
      key = `${date.getFullYear()}-${date.getMonth()}`;
      label = date.toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
      });
    } else {
      // Semana ISO: lunes como inicio.
      const monday = new Date(date);
      const offset = (date.getDay() + 6) % 7;
      monday.setDate(date.getDate() - offset);
      key = monday.toISOString().slice(0, 10);
      label = monday.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      });
    }

    const current = buckets.get(key) ?? { label, citas: 0 };
    current.citas += item.count;
    buckets.set(key, current);
  }

  return [...buckets.values()];
}
