"use client";

import { useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { ChartTooltip } from "@/components/brand/chart-tooltip";
import { cn } from "@/lib/utils";
import type { GrowthDataPoint } from "../types";

interface GrowthCardProps {
  data: GrowthDataPoint[];
}

const MONTH_LONG: Record<string, string> = {
  Ene: "Enero",
  Feb: "Febrero",
  Mar: "Marzo",
  Abr: "Abril",
  May: "Mayo",
  Jun: "Junio",
  Jul: "Julio",
  Ago: "Agosto",
  Sep: "Septiembre",
  Oct: "Octubre",
  Nov: "Noviembre",
  Dic: "Diciembre",
};

const W = 320;
const H = 110;
const TOP_PAD = 10;
const BOTTOM_PAD = 8;

/**
 * Crecimiento mensual: tendencia con área degradada + línea teal y puntos
 * interactivos (tooltip con periodo, usuarios nuevos y variación vs. mes
 * anterior). El último punto marca el periodo actual. Guard contra datos
 * vacíos.
 */
export function GrowthCard({ data }: GrowthCardProps) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <div className="flex h-[130px] items-center justify-center text-[12px] text-muted-foreground">
        {t("Sin datos de crecimiento")}
      </div>
    );
  }

  const pts = data.map((d, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * W : W / 2,
    y: H - BOTTOM_PAD - (d.value / maxValue) * (H - BOTTOM_PAD - TOP_PAD),
  }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const lastIndex = data.length - 1;

  return (
    <div className="flex flex-col">
      <div className="relative" style={{ height: H }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#035d4d" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#035d4d" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#growth-area)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--brand-teal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Puntos interactivos (HTML: círculos perfectos + tooltip) */}
        {pts.map((p, i) => {
          const isLast = i === lastIndex;
          const isHovered = hovered === i;
          const align = i === 0 ? "start" : i === lastIndex ? "end" : "center";
          const prev = i > 0 ? data[i - 1] : null;
          let delta: { value: string; up: boolean; vs: string } | undefined;
          if (prev) {
            const pct = Math.round(
              ((data[i].value - prev.value) / Math.max(prev.value, 1)) * 100,
            );
            delta = {
              value: `${pct > 0 ? "+" : ""}${pct}%`,
              up: pct >= 0,
              vs: `vs. ${t(MONTH_LONG[prev.month] ?? prev.month)}`,
            };
          }

          return (
            <div
              key={data[i].month}
              className="absolute z-20 flex cursor-pointer items-center justify-center p-3"
              style={{
                left: `${(p.x / W) * 100}%`,
                top: `${(p.y / H) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <ChartTooltip
                visible={isHovered}
                align={align}
                placement={p.y / H < 0.42 ? "bottom" : "top"}
                title={t(MONTH_LONG[data[i].month] ?? data[i].month)}
                label={t("usuarios nuevos")}
                value={String(data[i].value)}
                delta={delta}
              />
              <button
                type="button"
                className={cn(
                  "block size-3 cursor-pointer rounded-full border-2 bg-white transition-all duration-200",
                  isLast
                    ? "border-brand-teal ring-4 ring-brand-teal/15"
                    : "border-brand-teal/60 hover:border-brand-teal",
                  isHovered && "scale-125 border-brand-teal bg-brand-teal",
                )}
                aria-label={`${data[i].month}: ${data[i].value}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between">
        {data.map((point, i) => (
          <span
            key={point.month}
            className={cn(
              "flex-1 text-center text-[10px] transition-colors duration-200",
              i === lastIndex
                ? "font-bold text-brand-teal"
                : i === hovered
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
            )}
          >
            {point.month}
          </span>
        ))}
      </div>
    </div>
  );
}
