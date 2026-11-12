import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: RainbowTone;
}

/** Panel del dashboard con cabecera Copp y acento de la paleta compartida. */
export function DashboardPanel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  accent = "sky",
}: DashboardPanelProps) {
  return (
    <section
      data-slot="chart-card"
      style={rainbowStyle(accent)}
      className={cn(
        "spectrum-panel flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-blue-soft/40 bg-card shadow-xs",
        className,
      )}
    >
      <header className="bg-brand-gradient flex min-h-[72px] flex-wrap items-center gap-3 px-5 py-3.5 text-white">
        <span
          aria-hidden="true"
          className="spectrum-icon flex size-8 shrink-0 items-center justify-center rounded-full border border-white/30"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] leading-5 font-bold uppercase tracking-[0.02em] [overflow-wrap:anywhere]">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-white/85">
            {description}
          </p>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </header>
      <div className="flex min-w-0 flex-1 flex-col p-5">{children}</div>
    </section>
  );
}
