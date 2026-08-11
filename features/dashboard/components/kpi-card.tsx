import { TrendingUp, TrendingDown } from "lucide-react";
import type { KpiData } from "../types";

interface KpiCardProps {
  data: KpiData;
}

export function KpiCard({ data }: KpiCardProps) {
  const { label, value, context, trend, icon: Icon, iconColor, iconBg } = data;

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="size-5" style={{ color: iconColor }} />
        </div>

        <div className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-1">
          {trend.direction === "up" ? (
            <TrendingUp className="size-3 text-success-foreground" />
          ) : (
            <TrendingDown className="size-3 text-destructive" />
          )}
          <span
            className="text-[11px] font-semibold"
            style={{
              color:
                trend.direction === "up"
                  ? "var(--success-foreground)"
                  : "var(--destructive)",
            }}
          >
            {trend.value}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[28px] font-bold leading-none tracking-tight text-foreground">
          {value}
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[11.5px] text-muted-foreground/70">{context}</span>
      </div>
    </div>
  );
}
