"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
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
  {
    iconBg: string;
    iconColor: string;
    trendColor: string;
    accent: string;
  }
> = {
  default: {
    iconBg: "bg-primary",
    iconColor: "text-white",
    trendColor: "text-success",
    accent: "var(--primary)",
  },
  primary: {
    iconBg: "bg-primary",
    iconColor: "text-white",
    trendColor: "text-primary",
    accent: "var(--primary)",
  },
  success: {
    iconBg: "bg-success",
    iconColor: "text-success-foreground",
    trendColor: "text-success",
    accent: "#10B981",
  },
  warning: {
    iconBg: "bg-warning",
    iconColor: "text-warning-foreground",
    trendColor: "text-warning",
    accent: "#F59E0B",
  },
  destructive: {
    iconBg: "bg-destructive",
    iconColor: "text-white",
    trendColor: "text-destructive",
    accent: "#EF4444",
  },
  info: {
    iconBg: "bg-info",
    iconColor: "text-info-foreground",
    trendColor: "text-info",
    accent: "#0EA5E9",
  },
  navy: {
    iconBg: "bg-[var(--sidebar)]",
    iconColor: "text-white",
    trendColor: "text-[var(--sidebar)]",
    accent: "var(--sidebar)",
  },
};

/** Solo se animan números tipados; los textos formateados se conservan literalmente. */
function useCountUp(target: string | number, decimals: number, suffix: string, locale: string): string {
  const format = (value: number) => value.toLocaleString(locale, {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
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
      setDisplay((target * (1 - Math.pow(1 - progress, 3))).toLocaleString(locale, {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }) + suffix);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, suffix, locale, finalValue]);
  return display;
}

/**
 * Tarjeta de métrica con acento de color por variante. `filled` convierte
 * la card en KPI héroe (gradiente de marca) para jerarquía principal.
 * El valor hace count-up suave al montar.
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
  filled = false,
  align = "left",
}: StatCardProps) {
  const config = variantConfig[variant];
  const { lang } = useI18n();
  const displayValue = useCountUp(value, decimals, suffix, lang === "en" ? "en-US" : "es-CO");
  const centered = align === "center";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        centered && "flex-col justify-center gap-3 text-center",
        filled
          ? "border-transparent bg-brand-gradient shadow-lg shadow-brand-navy/25"
          : "border-border/70 bg-card hover:border-border",
      )}
    >
      {!filled && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: config.accent }}
        />
      )}
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105",
          filled
            ? "bg-white/15 text-white"
            : cn(config.iconBg, config.iconColor),
        )}
      >
        <Icon className="size-5" />
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          centered ? "w-full items-center" : "flex-1",
        )}
      >
        <span
          className={cn(
            "line-clamp-2 text-[11px] font-medium uppercase leading-4 tracking-wider",
            filled ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "flex items-baseline gap-2",
            centered && "justify-center",
          )}
        >
          <span
            className={cn(
              "text-2xl leading-none font-bold tracking-tight tabular-nums",
              filled ? "text-white" : "text-foreground",
            )}
          >
            {displayValue}
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px] font-semibold",
                filled ? "text-teal-200" : config.trendColor,
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
        {context && (
          <span
            className={cn(
              "text-[11px]",
              filled ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {context}
          </span>
        )}
      </div>
    </div>
  );
}
