import { TrendingUp, TrendingDown } from "lucide-react";
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
    accent: "#3B82F6",
  },
  primary: {
    iconBg: "bg-primary",
    iconColor: "text-white",
    trendColor: "text-primary",
    accent: "#3B82F6",
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
    accent: "#162032",
  },
};

/**
 * Tarjeta de métrica con acento de color por variante: raya superior e
 * icono en caja de color. El fondo queda neutro (bg-card: blanco en claro,
 * oscuro en dark) para no competir con los acentos.
 */
export function StatCard({
  label,
  value,
  context,
  trend,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  const config = variantConfig[variant];

  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: config.accent }}
      />
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
          config.iconBg,
        )}
      >
        <Icon className={cn("size-5", config.iconColor)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[11px] font-medium uppercase leading-4 tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl leading-none font-bold tracking-tight text-foreground">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px] font-semibold",
                config.trendColor,
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
          <span className="text-[11px] text-muted-foreground">{context}</span>
        )}
      </div>
    </div>
  );
}
