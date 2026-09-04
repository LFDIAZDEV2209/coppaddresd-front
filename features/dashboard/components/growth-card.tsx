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

/**
 * Crecimiento mensual: barras teal, pico en gradiente. Hover con tooltip
 * (periodo, usuarios nuevos, variación vs. mes anterior). Guard contra
 * datos vacíos.
 */
export function GrowthCard({ data }: GrowthCardProps) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const peakIndex = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0,
  );

  if (data.length === 0) {
    return (
      <div className="flex h-[130px] items-center justify-center text-[12px] text-muted-foreground">
        {t("Sin datos de crecimiento")}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-1.5" style={{ height: 110 }}>
        {data.map((point, i) => {
          const isPeak = i === peakIndex;
          const isHovered = hovered === i;
          const align =
            i === 0 ? "start" : i === data.length - 1 ? "end" : "center";
          const prev = i > 0 ? data[i - 1] : null;
          let delta: { value: string; up: boolean; vs: string } | undefined;
          if (prev) {
            const pct = Math.round(
              ((point.value - prev.value) / Math.max(prev.value, 1)) * 100,
            );
            delta = {
              value: `${pct > 0 ? "+" : ""}${pct}%`,
              up: pct >= 0,
              vs: `vs. ${t(MONTH_LONG[prev.month] ?? prev.month)}`,
            };
          }

          return (
            <div
              key={point.month}
              className="relative flex flex-1 cursor-pointer flex-col items-center justify-end"
              style={{ height: "100%" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <ChartTooltip
                visible={isHovered}
                align={align}
                title={t(MONTH_LONG[point.month] ?? point.month)}
                label={t("usuarios nuevos")}
                value={String(point.value)}
                delta={delta}
                style={{
                  bottom: Math.min((point.value / maxValue) * 88 + 8, 24),
                }}
              />
              <div
                className={cn(
                  "w-full max-w-[26px] rounded-t-md transition-all duration-200",
                  isHovered || isPeak ? "bg-brand-gradient" : "bg-[#5581a2]",
                  hovered !== null && !isHovered && "opacity-55",
                )}
                style={{ height: Math.max((point.value / maxValue) * 88, 4) }}
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
              i === peakIndex || hovered === i
                ? "font-bold text-brand-teal"
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
