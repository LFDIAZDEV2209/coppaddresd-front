"use client";

import { RAINBOW_SERIES } from "@/lib/ui/rainbow";

import { useId, useState } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { ChartTooltip } from "@/components/brand/chart-tooltip";
import { cn } from "@/lib/utils";
import type { GrowthDataPoint } from "../types";

interface GrowthCardProps {
  data: GrowthDataPoint[];
  height?: number;
}
const W = 320;
const PAD = 12;
const DOT_COLORS = RAINBOW_SERIES;

export function GrowthCard({ data, height = 160 }: GrowthCardProps) {
  const H = height;
  const { t, lang } = useI18n();
  const id = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const active = hovered ?? focused;
  const locale = lang === "en" ? "en-US" : "es-CO";
  const number = new Intl.NumberFormat(locale);
  const monthShort = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });
  const monthLong = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const labels = data.map((point) => {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(point.month);
    if (!match) return { short: point.month, full: point.month };
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    const full = monthLong.format(date);
    return {
      short: monthShort.format(date),
      full: full.charAt(0).toUpperCase() + full.slice(1),
    };
  });

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("Sin datos de crecimiento")}
      </p>
    );
  }

  const step = Math.max(
    1,
    Math.ceil(Math.max(...data.map((point) => point.value)) / 2),
  );
  const max = step * 2;
  const pts = data.map((point, index) => ({
    x:
      data.length > 1
        ? PAD + (index / (data.length - 1)) * (W - 2 * PAD)
        : W / 2,
    y: H - PAD - (point.value / max) * (H - 2 * PAD),
  }));
  const line = pts
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const area = `${line} L${pts.at(-1)!.x},${H - PAD} L${pts[0].x},${H - PAD} Z`;

  return (
    <figure
      aria-label={t("Crecimiento")}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
        <div
          aria-hidden="true"
          className="relative text-right text-[10px] tabular-nums text-muted-foreground"
        >
          {[0, step, max].map((value) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: H - PAD - (value / max) * (H - 2 * PAD) }}
            >
              {number.format(value)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0" style={{ height: H }}>
          {[0, step, max].map((value) => (
            <div
              key={value}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t border-border/60"
              style={{ top: H - PAD - (value / max) * (H - 2 * PAD) }}
            />
          ))}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`${id}-area`} x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="0%"
                  stopColor="var(--spectrum-sky-chart)"
                  stopOpacity="0.16"
                />
                <stop
                  offset="35%"
                  stopColor="var(--spectrum-teal-chart)"
                  stopOpacity="0.12"
                />
                <stop
                  offset="70%"
                  stopColor="var(--spectrum-violet-chart)"
                  stopOpacity="0.12"
                />
                <stop
                  offset="100%"
                  stopColor="var(--spectrum-amber-chart)"
                  stopOpacity="0.16"
                />
              </linearGradient>
              <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--spectrum-sky-chart)" />
                <stop offset="35%" stopColor="var(--spectrum-teal-chart)" />
                <stop offset="70%" stopColor="var(--spectrum-violet-chart)" />
                <stop offset="100%" stopColor="var(--spectrum-amber-chart)" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id}-area)`} />
            <path
              d={line}
              fill="none"
              stroke={`url(#${id}-line)`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {pts.map((point, index) => {
            const previous = index > 0 ? data[index - 1] : null;
            const percent =
              previous && previous.value > 0
                ? Math.round(
                    ((data[index].value - previous.value) / previous.value) *
                      100,
                  )
                : null;
            const color =
              DOT_COLORS[
                Math.round(
                  (index / Math.max(data.length - 1, 1)) *
                    (DOT_COLORS.length - 1),
                )
              ];
            return (
              <div
                key={data[index].month}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2",
                  active === index && "z-20",
                )}
                style={{ left: `${(point.x / W) * 100}%`, top: point.y }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("{month}: {count} pacientes nuevos", {
                    month: labels[index].full,
                    count: number.format(data[index].value),
                  })}
                  onFocus={() => setFocused(index)}
                  onBlur={() => setFocused(null)}
                  onClick={() => setFocused(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setHovered(null);
                      setFocused(null);
                    }
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="block size-2.5 rounded-full border-2 bg-card"
                    style={{
                      borderColor: color,
                      backgroundColor: active === index ? color : undefined,
                    }}
                  />
                </button>
                <ChartTooltip
                  visible={active === index}
                  title={labels[index].full}
                  label={t("Pacientes nuevos")}
                  value={number.format(data[index].value)}
                  align={
                    index === 0
                      ? "start"
                      : index === data.length - 1
                        ? "end"
                        : "center"
                  }
                  placement={point.y < H / 2 ? "bottom" : "top"}
                  delta={
                    percent === null
                      ? undefined
                      : {
                          value: `${percent > 0 ? "+" : ""}${percent}%`,
                          up: percent >= 0,
                          vs: `vs. ${labels[index - 1].full}`,
                        }
                  }
                />
              </div>
            );
          })}
        </div>
        <div />
        <div
          aria-hidden="true"
          className="relative h-6 text-[10px] text-muted-foreground"
        >
          {pts.map((point, index) => (
            <span
              key={data[index].month}
              className="absolute top-1 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(point.x / W) * 100}%` }}
            >
              {labels[index].short}
            </span>
          ))}
        </div>
      </div>
      <details className="border-t border-border/60 text-xs">
        <summary className="min-h-11 cursor-pointer content-center rounded-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          {t("Ver datos mensuales")}
        </summary>
        <table
          aria-label={t("Pacientes nuevos por mes")}
          className="w-full text-left tabular-nums"
        >
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="px-2 py-2 font-medium">
                {t("Mes")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {t("Pacientes nuevos")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr key={point.month} className="border-t border-border/60">
                <th scope="row" className="px-2 py-2 font-normal">
                  {labels[index].full}
                </th>
                <td className="px-2 py-2 text-right">
                  {number.format(point.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
