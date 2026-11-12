import type { LucideIcon } from "lucide-react";
import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";

interface DashboardMetricProps {
  label: string;
  value: string;
  context?: string;
  icon: LucideIcon;
  tone: "blue" | "teal" | "navy" | "warm";
}
const tones: Record<DashboardMetricProps["tone"], RainbowTone> = {
  blue: "sky",
  teal: "green",
  navy: "violet",
  warm: "amber",
};

/** Métrica compacta exclusiva del piloto visual del dashboard. */
export function DashboardMetric({
  label,
  value,
  context,
  icon: Icon,
  tone,
}: DashboardMetricProps) {
  return (
    <article
      style={rainbowStyle(tones[tone])}
      className={cn(
        "spectrum-card flex min-h-[92px] items-center gap-3 rounded-2xl border p-3.5",
      )}
    >
      <span
        aria-hidden="true"
        className="spectrum-icon flex size-9 shrink-0 items-center justify-center rounded-full text-white"
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-[11px] leading-3.5 font-semibold uppercase tracking-[0.02em] text-muted-foreground">
          {label}
        </h2>
        <p className="text-2xl leading-7 font-bold tracking-tight text-primary-soft-foreground tabular-nums">
          {value}
        </p>
        {context && (
          <p className="text-[10px] leading-3.5 text-muted-foreground">
            {context}
          </p>
        )}
      </div>
    </article>
  );
}
