"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  value: string;
  context?: string;
  trend?: { value: string; direction: "up" | "down" };
  icon: LucideIcon;
  variant?: CardVariant;
  /** KPI héroe: relleno con el gradiente de marca (jerarquía principal). */
  filled?: boolean;
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
    iconColor: "text-white",
    trendColor: "text-success",
    accent: "#10B981",
  },
  warning: {
    iconBg: "bg-warning",
    iconColor: "text-white",
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
    iconColor: "text-white",
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

/** Extrae parte numérica + sufijo (ej. "99,8%" → 99.8 + "%"). */
function parseValue(
  target: string,
): { num: number; decimals: number; suffix: string } | null {
  const match = target.match(/^([\d.,]+)(.*)$/);
  if (!match) return null;
  const numeric = match[1];
  const normalized = numeric.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);
  if (Number.isNaN(num)) return null;
  const decimals = numeric.split(",")[1]?.length ?? 0;
  return { num, decimals, suffix: match[2] };
}

/** Count-up suave al montar; respeta prefers-reduced-motion. */
function useCountUp(target: string, duration = 750): string {
  const parsed = parseValue(target);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    setDisplay(target);
    if (!parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(
        (parsed.num * eased).toLocaleString("es-CO", {
          minimumFractionDigits: parsed.decimals,
          maximumFractionDigits: parsed.decimals,
        }) + parsed.suffix,
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

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
  context,
  trend,
  icon: Icon,
  variant = "default",
  filled = false,
}: StatCardProps) {
  const config = variantConfig[variant];
  const displayValue = useCountUp(value);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
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

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "line-clamp-2 text-[11px] font-medium uppercase leading-4 tracking-wider",
            filled ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <div className="flex items-baseline gap-2">
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
