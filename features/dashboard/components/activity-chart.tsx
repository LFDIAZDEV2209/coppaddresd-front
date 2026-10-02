"use client";

import { useMemo, useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { ChartTooltip } from "@/components/brand/chart-tooltip";
import { cn } from "@/lib/utils";
import type { ActivityDataPoint } from "../types";

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

/**
 * Abreviaturas de día (keys i18n): la serie del backend termina HOY
 * (DashboardController: to = DateTime.Today), así que la fecha de cada punto
 * se puede derivar del índice para etiquetas legibles del eje X ("Lun 5").
 */
const DAY_SHORT_KEYS: readonly string[] = [
  "Dom", // getDay() = 0
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
];

const DAY_FULL_KEYS: Record<string, string> = {
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
 * Actividad diaria: barras con degradado, pico en gradiente de marca,
 * línea de promedio punteada, eje X con "abreviatura + número del día"
 * (tarea 2.1/F3: nada de caracteres truncados), leyenda debajo y escala Y
 * con padding del 20 % (design.md §2) para que un pico no domine y las
 * barras pequeñas sigan visibles.
 */
export function ActivityChart({ data }: ActivityChartProps) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);

  // Congelar "hoy" por render derivable (la serie del backend termina hoy).
  const today = useMemo(() => new Date(), []);
  const dates = useMemo<Date[]>(() => {
    const len = data.length;
    return data.map((_, index): Date => {
      const date = new Date(today);
      date.setDate(today.getDate() - (len - 1 - index));
      return date;
    });
  }, [data, today]);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
        {t("Sin actividad en el período")}
      </div>
    );
  }

  // Escala con 20 % de padding arriba (design.md decision 2).
  const rawMax = Math.max(...data.map((d) => d.value), 1);
  const maxScale = Math.max(Math.ceil(rawMax * 1.2), 4);
  const avg = Math.round(
    data.reduce((s, d) => s + d.value, 0) / Math.max(data.length, 1),
  );
  const avgPx = (avg / maxScale) * 180;
  const peakIndex = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0,
  );
  // ~8 etiquetas visibles como máximo: cada una con espacio suficiente para
  // "Lun 5" sin truncar (legibilidad del eje X con 30 barras).
  const labelEvery = data.length > 8 ? Math.ceil(data.length / 8) : 1;
  // Altura mínima perceptible para barras bajas (visible en la escala).
  const MIN_HEIGHT_PX = 4;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-0">
        {/* Eje con escala real (0 → max con padding del 20 %) */}
        <div className="flex w-10 shrink-0 flex-col-reverse items-end justify-between pb-8 text-[10px] text-muted-foreground">
          {[0, Math.round(maxScale / 2), maxScale].map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </div>

        <div className="relative flex flex-1 items-end gap-2">
          {/* Línea de promedio con etiqueta integrada */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ bottom: avgPx }}
          >
            <span className="h-px flex-1 border-t border-dashed border-brand-teal/40" />
            <span className="ml-1 rounded-full bg-brand-teal/10 px-1.5 py-px text-[9px] font-semibold text-brand-teal">
              {t("Promedio del período")} {avg}
            </span>
          </div>

          {data.map((point, index) => {
            const heightPercent = (point.value / maxScale) * 100;
            const isPeak = index === peakIndex;
            const isHovered = hovered === index;
            const align =
              index === 0
                ? "start"
                : index === data.length - 1
                  ? "end"
                  : "center";
            const date = dates[index];
            const shortKey = DAY_SHORT_KEYS[date.getDay()];
            const previous = index > 0 ? dates[index - 1] : null;
            const prevShortKey = previous
              ? DAY_SHORT_KEYS[previous.getDay()]
              : null;
            let delta: { value: string; up: boolean; vs: string } | undefined;
            if (previous && prevShortKey) {
              const prevValue = data[index - 1].value;
              const pct = Math.round(
                ((point.value - prevValue) / Math.max(prevValue, 1)) * 100,
              );
              delta = {
                value: `${pct > 0 ? "+" : ""}${pct}%`,
                up: pct >= 0,
                vs: `vs. ${t(DAY_FULL_KEYS[prevShortKey] ?? prevShortKey)}`,
              };
            }

            const isLabelVisible = index % labelEvery === 0;

            return (
              <div
                key={`${point.day}-${index}`}
                className="relative z-20 flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2"
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
                    title={`${t(DAY_FULL_KEYS[shortKey] ?? shortKey)} ${date.getDate()}`}
                    label={t("Registros")}
                    value={String(point.value)}
                    delta={delta}
                    style={{
                      bottom: Math.min((heightPercent / 100) * 180 + 8, 96),
                    }}
                  />
                  <div
                    className="relative w-full"
                    style={{
                      height: `${Math.max(heightPercent, (MIN_HEIGHT_PX / 180) * 100)}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "bar-grow-y mx-auto w-full max-w-[30px] rounded-t-[10px] transition-[opacity,filter,transform] duration-200",
                        isPeak && "bg-brand-gradient",
                        isHovered && !isPeak && "brightness-110",
                        hovered !== null && !isHovered && "opacity-50",
                      )}
                      style={{
                        height: "100%",
                        animationDelay: `${index * 60}ms`,
                        background: isPeak
                          ? undefined
                          : `linear-gradient(180deg, ${BAR_GRADIENTS[index % BAR_GRADIENTS.length]?.[0] ?? "#2dd4bf"}, ${BAR_GRADIENTS[index % BAR_GRADIENTS.length]?.[1] ?? "#0f766e"})`,
                        boxShadow:
                          isHovered || isPeak
                            ? "0 6px 16px -4px rgba(3,93,77,0.35)"
                            : "0 4px 10px -4px rgba(15,30,60,0.25)",
                      }}
                    />
                  </div>
                </div>
                <span
                  aria-hidden={!isLabelVisible}
                  className={cn(
                    "text-center text-[10.5px] leading-tight tabular-nums transition-colors duration-200 sm:text-[11px]",
                    isHovered || isPeak
                      ? "font-bold text-brand-teal"
                      : "font-medium text-muted-foreground",
                  )}
                >
                  {isLabelVisible
                    ? `${t(DAY_SHORT_KEYS[date.getDay()] ?? "")} ${date.getDate()}`
                    : "\u200B"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda debajo del gráfico (criterio 2.1) */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-4 rounded-t-[3px]"
            style={{
              background: "linear-gradient(180deg, #38bdf8, #0369a1)",
            }}
          />
          {t("Registros del día")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0 w-4 border-t border-dashed border-brand-teal"
          />
          {t("Promedio del período")}
        </span>
      </div>
    </div>
  );
}
