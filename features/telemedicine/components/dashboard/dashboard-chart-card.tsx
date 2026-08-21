import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenedor de una gráfica del dashboard: título, descripción, toolbar
 * (toggles de rango/agrupación) y el chart. Consistente con las cards del ERP.
 */
export function DashboardChartCard({
  title,
  description,
  toolbar,
  children,
  className,
}: {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-[12px] text-muted-foreground">{description}</p>
          )}
        </div>
        {toolbar}
      </div>
      {children}
    </section>
  );
}