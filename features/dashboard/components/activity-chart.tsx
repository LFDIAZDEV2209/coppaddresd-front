"use client";

import { RAINBOW_GRADIENTS } from "@/lib/ui/rainbow";

import { useState } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { ChartTooltip } from "@/components/brand/chart-tooltip";
import { cn } from "@/lib/utils";
import type { ActivityDataPoint } from "../types";

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

const BAR_COLORS = RAINBOW_GRADIENTS;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// El API entrega «MMM d» sin año. Localizamos mes/día sin inventar el día de semana.
function formatDay(day: string, formatter: Intl.DateTimeFormat) {
  const match = /^([A-Za-z]{3}) (\d{1,2})$/.exec(day);
  if (!match) return day;
  const month = MONTHS.indexOf(match[1]);
  const date = new Date(Date.UTC(2000, month, Number(match[2])));
  if (month < 0 || date.getUTCMonth() !== month) return day;
  return formatter.format(date);
}

export function ActivityChart({ data }: ActivityChartProps) {
  const { t, lang } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const active = hovered ?? focused;
  const locale = lang === "en" ? "en-US" : "es-ES";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
        {t("Sin actividad en el período")}
      </div>
    );
  }

  const peakIndex = data.reduce(
    (best, point, index) => (point.value > data[best].value ? index : best),
    0,
  );
  const paddedMax = Math.max(...data.map((point) => point.value * 1.15), 4);
  const roughStep = paddedMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step =
    ([1, 2, 5, 10].find((value) => value >= roughStep / magnitude) ?? 10) *
    magnitude;
  const maxScale = Math.ceil(paddedMax / step) * step;
  const ticks = Array.from(
    { length: Math.round(maxScale / step) + 1 },
    (_, index) => index * step,
  );
  const average =
    data.reduce((sum, point) => sum + point.value, 0) / data.length;
  const days = data.map((point) => formatDay(point.day, date));
  const columns = {
    gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
  };
  const showLabel = (index: number, count: number) =>
    index === 0 ||
    index === data.length - 1 ||
    index % Math.ceil(data.length / count) === 0;

  return (
    <figure
      className="@container/activity flex min-w-0 flex-1 flex-col gap-4 [--activity-peak-gradient:var(--brand-gradient)] dark:[--activity-peak-gradient:linear-gradient(180deg,#38bdf8,#0f766e)]"
      aria-label={t("Actividad (30 días)")}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-5 rounded-sm"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #0369a1, #0f766e, #6d28d9, #b45309, #be185d)",
            }}
          />
          {t("Registros del día")}
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-4 border-t border-dashed border-brand-teal dark:border-brand-blue-soft"
          />
          {t("Promedio del período")}
          <span className="font-semibold tabular-nums text-foreground">
            {number.format(average)}
          </span>
        </span>
      </figcaption>

      <div className="grid min-h-[240px] min-w-0 flex-1 grid-cols-[2rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_2rem] gap-x-3 pt-2">
        <div
          className="relative min-h-[200px] text-right text-[11px] tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              data-slot="activity-y-tick"
              data-value={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${100 - (tick / maxScale) * 100}%` }}
            >
              {number.format(tick)}
            </span>
          ))}
        </div>

        <div
          data-slot="activity-plot"
          className="relative min-h-[200px] min-w-0"
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t border-border/60"
              style={{ top: `${100 - (tick / maxScale) * 100}%` }}
            />
          ))}
          <div
            data-slot="activity-average"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-brand-teal dark:border-brand-blue-soft"
            style={{ top: `${100 - (average / maxScale) * 100}%` }}
          />
          <div
            className="absolute inset-0 grid gap-px @min-[440px]/activity:gap-1"
            style={columns}
          >
            {data.map((point, index) => (
              <div
                key={`${point.day}-${index}`}
                className={cn("relative min-w-0", active === index && "z-20")}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <button
                  type="button"
                  className="flex h-full w-full items-end justify-center rounded-sm p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={t("{day}: {count} registros", {
                    day: days[index],
                    count: number.format(point.value),
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
                    data-slot="activity-bar"
                    aria-hidden="true"
                    className={cn(
                      "bar-grow-y block w-full max-w-7 rounded-t-sm transition-opacity motion-reduce:transition-none",
                      active !== null && active !== index && "opacity-65",
                    )}
                    style={{
                      height: `${(point.value / maxScale) * 100}%`,
                      backgroundImage:
                        index === peakIndex
                          ? "var(--activity-peak-gradient)"
                          : `linear-gradient(180deg, ${BAR_COLORS[index % BAR_COLORS.length][0]}, ${BAR_COLORS[index % BAR_COLORS.length][1]})`,
                    }}
                  />
                </button>
                <ChartTooltip
                  visible={active === index}
                  title={days[index]}
                  label={t("Registros")}
                  value={number.format(point.value)}
                  align={
                    index < data.length / 4
                      ? "start"
                      : index > (data.length * 3) / 4
                        ? "end"
                        : "center"
                  }
                  style={{
                    bottom: `${Math.min((point.value / maxScale) * 100 + 4, 70)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div />
        <div
          className="grid h-8 min-w-0 pt-2"
          style={columns}
          aria-hidden="true"
        >
          {days.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="relative min-w-0 text-[10px] tabular-nums text-muted-foreground @min-[440px]/activity:text-[11px]"
            >
              <span
                className={cn(
                  "absolute whitespace-nowrap",
                  index === 0
                    ? "left-0"
                    : index === days.length - 1
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2",
                )}
              >
                <span className="@min-[440px]/activity:hidden">
                  {showLabel(index, 3) ? day : null}
                </span>
                <span className="hidden @min-[440px]/activity:inline">
                  {showLabel(index, 6) ? day : null}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <table className="sr-only" aria-label={t("Registros del día")}>
        <thead className="sticky top-0 bg-card text-muted-foreground">
          <tr>
            <th scope="col" className="px-2 py-2 font-medium">
              {t("Fecha")}
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {t("Registros")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, index) => (
            <tr
              key={`${point.day}-${index}`}
              className="border-t border-border/60"
            >
              <th scope="row" className="px-2 py-2 font-normal">
                {days[index]}
              </th>
              <td className="px-2 py-2 text-right">
                {number.format(point.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
