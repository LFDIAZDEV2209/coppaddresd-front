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
 * Paleta multi-color con degradados: cada día tiene su propio tono
 * (el pico conserva el gradiente de marca como acento héroe).
 */
const BAR_GRADIENTS: (readonly [string, string] | null)[] = [
  ["#38bdf8", "#0369a1"], // Lun · cielo
  ["#2dd4bf", "#0f766e"], // Mar · teal
  ["#a78bfa", "#6d28d9"], // Mié · violeta
  null, // Jue · pico → gradiente de marca
  ["#fbbf24", "#b45309"], // Vie · ámbar
  ["#f472b6", "#be185d"], // Sáb · rosa
  ["#94a3b8", "#475569"], // Dom · pizarra
];

/**
 * Actividad semanal: barras teal con pico en gradiente de marca, línea de
 * promedio punteada y eje con escala real. Hover: la barra se acentúa,
 * las demás se atenúan y aparece el tooltip con día, valor y variación.
 */
export function ActivityChart({ data }: ActivityChartProps) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const avg = Math.round(
    data.reduce((s, d) => s + d.value, 0) / Math.max(data.length, 1),
  );
  const peakIndex = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0,
  );
  const avgPx = (avg / maxValue) * 180;

  return (
    <div className="flex items-end gap-0">
      {/* Eje con escala real */}
      <div className="flex w-10 shrink-0 flex-col-reverse items-end justify-between pb-8 text-[10px] text-muted-foreground">
        {[0, Math.round(maxValue / 2), maxValue].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>

      <div className="relative flex flex-1 items-end gap-2">
        {/* Línea de promedio */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
          style={{ bottom: avgPx }}
        >
          <span className="h-px flex-1 border-t border-dashed border-brand-teal/40" />
          <span className="ml-1 rounded-full bg-brand-teal/10 px-1.5 py-px text-[9px] font-semibold text-brand-teal">
            {t("Promedio")} {avg}
          </span>
        </div>

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
              className="relative z-20 flex flex-1 cursor-pointer flex-col items-center gap-2"
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
                      "bar-grow-y mx-auto w-[30px] rounded-t-[10px] transition-[opacity,filter,transform] duration-200",
                      isPeak && "bg-brand-gradient",
                      isHovered && !isPeak && "brightness-110",
                      hovered !== null && !isHovered && "opacity-50",
                    )}
                    style={{
                      height: "100%",
                      animationDelay: `${index * 60}ms`,
                      background: isPeak
                        ? undefined
                        : `linear-gradient(180deg, ${BAR_GRADIENTS[index]?.[0]}, ${BAR_GRADIENTS[index]?.[1]})`,
                      boxShadow:
                        isHovered || isPeak
                          ? "0 6px 16px -4px rgba(3,93,77,0.35)"
                          : "0 4px 10px -4px rgba(15,30,60,0.25)",
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
