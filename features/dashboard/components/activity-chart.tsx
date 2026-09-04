"use client";

import { useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { ChartTooltip } from "@/components/brand/chart-tooltip";
import { cn } from "@/lib/utils";
import type { ActivityDataPoint } from "../types";

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

const DAY_LONG: Record<string, string> = {
  Lun: "Lunes",
  Mar: "Martes",
  Mié: "Miércoles",
  Jue: "Jueves",
  Vie: "Viernes",
  Sáb: "Sábado",
  Dom: "Domingo",
};

/**
 * Actividad semanal: barras navy con pico en gradiente teal. Al pasar el
 * mouse la barra se acentúa, las demás se atenúan y aparece el tooltip
 * con día, valor exacto y variación vs. el día anterior.
 */
export function ActivityChart({ data }: ActivityChartProps) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const peakIndex = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0,
  );

  return (
    <div className="flex items-end gap-0">
      <div className="flex w-10 shrink-0 flex-col-reverse items-end justify-between pb-8 text-[10px] text-muted-foreground">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>

      <div className="flex flex-1 items-end gap-2">
        {data.map((point, index) => {
          const heightPercent = (point.value / maxValue) * 100;
          const isPeak = index === peakIndex;
          const isHovered = hovered === index;
          const align =
            index === 0
              ? "start"
              : index === data.length - 1
                ? "end"
                : "center";
          const prev = index > 0 ? data[index - 1] : null;
          let delta: { value: string; up: boolean; vs: string } | undefined;
          if (prev) {
            const pct = Math.round(
              ((point.value - prev.value) / Math.max(prev.value, 1)) * 100,
            );
            delta = {
              value: `${pct > 0 ? "+" : ""}${pct}%`,
              up: pct >= 0,
              vs: `vs. ${t(DAY_LONG[prev.day] ?? prev.day)}`,
            };
          }

          return (
            <div
              key={point.day}
              className="flex flex-1 cursor-pointer flex-col items-center gap-2"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="relative flex w-full items-end justify-center"
                style={{ height: 180 }}
              >
                <ChartTooltip
                  visible={isHovered}
                  align={align}
                  title={t(DAY_LONG[point.day] ?? point.day)}
                  label={t("Conversaciones")}
                  value={String(point.value)}
                  delta={delta}
                  style={{
                    bottom: Math.min((heightPercent / 100) * 180 + 8, 96),
                  }}
                />
                <div
                  className="relative w-full"
                  style={{ height: `${heightPercent}%` }}
                >
                  <div
                    className={cn(
                      "mx-auto w-[30px] rounded-t-[10px] transition-all duration-200",
                      isHovered || isPeak
                        ? "bg-brand-gradient"
                        : "bg-brand-navy/85",
                      hovered !== null && !isHovered && "opacity-55",
                    )}
                    style={{
                      height: "100%",
                      boxShadow:
                        isHovered || isPeak
                          ? "0 6px 16px -4px rgba(3,93,77,0.35)"
                          : "0 4px 10px -4px rgba(20,40,85,0.25)",
                    }}
                  />
                </div>
              </div>
              <span
                className={cn(
                  "text-[11px] transition-colors duration-200",
                  isHovered || isPeak
                    ? "font-bold text-brand-teal"
                    : "font-medium text-muted-foreground",
                )}
              >
                {point.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
