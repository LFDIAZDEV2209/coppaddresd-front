"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";

type CardVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "navy";

interface StatCardProps {
  label: string;
  value: string | number;
  decimals?: number;
  suffix?: string;
  context?: string;
  trend?: { value: string; direction: "up" | "down" };
  icon: LucideIcon;
  variant?: CardVariant;
  tone?: RainbowTone;
  /** KPI héroe: relleno con el gradiente de marca (jerarquía principal). */
  filled?: boolean;
  /**
   * Alineación del contenido. `"left"` (default) mantiene el icono a la
   * izquierda; `"center"` apila el icono y centra etiqueta/valor/contexto.
   */
  align?: "left" | "center";
}

const variantConfig: Record<
  CardVariant,
  { trendColor: string; tone: RainbowTone }
> = {
  default: {
    tone: "sky",
    trendColor: "text-success",
  },
  primary: {
    tone: "violet",
    trendColor: "text-primary",
  },
  success: {
    tone: "green",
    trendColor: "text-success",
  },
  warning: {
    tone: "amber",
    trendColor: "text-warning",
  },
  destructive: {
    tone: "rose",
    trendColor: "text-destructive",
  },
  info: {
    tone: "sky",
    trendColor: "text-info",
  },
  navy: {
    tone: "teal",
    trendColor: "text-primary-soft-foreground",
  },
};

/** Solo se animan números tipados; los textos formateados se conservan literalmente. */
function useCountUp(
  target: string | number,
  decimals: number,
  suffix: string,
  locale: string,
): string {
  const format = (value: number) =>
    value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;
  const finalValue = typeof target === "number" ? format(target) : target;
  const [display, setDisplay] = useState(finalValue);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplay(finalValue);
    if (typeof target !== "number" || !Number.isFinite(target)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 750, 1);
      setDisplay(
        (target * (1 - Math.pow(1 - progress, 3))).toLocaleString(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + suffix,
      );
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, suffix, locale, finalValue]);
  return display;
}

/**
 * Métrica compacta con fondo semántico y el lenguaje del dashboard.
 * Conserva formatos, contexto, tendencias y la variante de énfasis existente.
 */
export function StatCard({
  label,
  value,
  decimals = 0,
  suffix = "",
  context,
  trend,
  icon: Icon,
  variant = "default",
  tone,
  filled = false,
  align = "left",
}: StatCardProps) {
  const config = variantConfig[variant];
  const accent = tone ?? config.tone;
  const { lang } = useI18n();
  const displayValue = useCountUp(
    value,
    decimals,
    suffix,
    lang === "en" ? "en-US" : "es-CO",
  );
  const centered = align === "center";

  return (
    <div
      data-slot="stat-card"
      data-tone={accent}
      style={rainbowStyle(accent)}
      className={cn(
        "group relative flex min-h-[92px] min-w-0 items-center gap-3 rounded-2xl border p-3.5",
        centered && "flex-col justify-center text-center",
        filled
          ? "border-transparent bg-brand-gradient text-white"
          : "spectrum-card",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-white",
          filled ? "border border-white/20 bg-white/10" : "spectrum-icon",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-0.5",
          centered && "items-center",
        )}
      >
        <span
          className={cn(
            "text-[11px] leading-3.5 font-semibold uppercase tracking-[0.02em] [overflow-wrap:anywhere]",
            filled ? "text-white/85" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1",
            centered && "justify-center",
          )}
        >
          <span
            className={cn(
              "text-2xl leading-7 font-bold tracking-tight tabular-nums [overflow-wrap:anywhere]",
              filled ? "text-white" : "text-primary-soft-foreground",
            )}
          >
            {displayValue}
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px] font-semibold",
                filled ? "text-white/90" : config.trendColor,
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp aria-hidden="true" className="size-3" />
              ) : (
                <TrendingDown aria-hidden="true" className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
        {context && (
          <span
            className={cn(
              "text-[11px] leading-3.5 [overflow-wrap:anywhere]",
              filled ? "text-white/85" : "text-muted-foreground",
            )}
          >
            {context}
          </span>
        )}
      </div>
    </div>
  );
}
