import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CardVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info";

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
  { iconBg: string; iconColor: string; trendColor: string }
> = {
  default: {
    iconBg: "bg-primary",
    iconColor: "text-white",
    trendColor: "text-success",
  },
  primary: {
    iconBg: "bg-primary",
    iconColor: "text-white",
    trendColor: "text-primary",
  },
  success: {
    iconBg: "bg-success",
    iconColor: "text-white",
    trendColor: "text-success",
  },
  warning: {
    iconBg: "bg-warning",
    iconColor: "text-white",
    trendColor: "text-warning",
  },
  destructive: {
    iconBg: "bg-destructive",
    iconColor: "text-white",
    trendColor: "text-destructive",
  },
  info: {
    iconBg: "bg-info",
    iconColor: "text-white",
    trendColor: "text-info",
  },
};

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
    <div className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-sm hover:-translate-y-0.5">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          config.iconBg
        )}
      >
        <Icon className={cn("size-5", config.iconColor)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] leading-none font-bold tracking-tight text-foreground">
            {value}
          </span>
          {trend && (
            <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", config.trendColor)}>
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
          <span className="text-[11px] text-muted-foreground">
            {context}
          </span>
        )}
      </div>
    </div>
  );
}