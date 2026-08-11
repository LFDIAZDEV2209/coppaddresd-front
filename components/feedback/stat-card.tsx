import type { LucideIcon } from "lucide-react";

type CardVariant = "default" | "primary" | "success" | "warning" | "destructive" | "info";

interface StatCardProps {
  label: string;
  value: string;
  context?: string;
  trend?: { value: string; direction: "up" | "down" };
  icon: LucideIcon;
  variant?: CardVariant;
}

const variantConfig: Record<CardVariant, { iconBg: string; iconColor: string; trendBg: string }> = {
  default: { iconBg: "#E5F0FA", iconColor: "#123B63", trendBg: "#E6F7EF" },
  primary: { iconBg: "#E5F0FA", iconColor: "#123B63", trendBg: "#E5F0FA" },
  success: { iconBg: "#E6F7EF", iconColor: "#10B981", trendBg: "#E6F7EF" },
  warning: { iconBg: "#FDF2E3", iconColor: "#F59E0B", trendBg: "#FDF2E3" },
  destructive: { iconBg: "#FCEBEC", iconColor: "#EF4444", trendBg: "#FCEBEC" },
  info: { iconBg: "#E6F7FB", iconColor: "#0E7490", trendBg: "#E6F7FB" },
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
    <div className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: config.iconBg }}
        >
          <Icon className="size-5" style={{ color: config.iconColor }} />
        </div>

        {trend && (
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1"
            style={{ backgroundColor: config.trendBg }}
          >
            <span
              className="text-[11px] font-semibold"
              style={{ color: config.iconColor }}
            >
              {trend.direction === "up" ? "↗" : "↘"} {trend.value}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[28px] font-bold leading-none tracking-tight text-foreground">
          {value}
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">
          {label}
        </span>
        {context && (
          <span className="text-[11.5px] text-muted-foreground/70">
            {context}
          </span>
        )}
      </div>
    </div>
  );
}
