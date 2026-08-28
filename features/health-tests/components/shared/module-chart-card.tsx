"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/layout/section-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tarjeta del módulo con header navy (SectionHeader primary) y cuerpo.
 * Patrón consistente con el lenguaje de Citas/Pacientes del ERP.
 */
export function ChartCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <SectionHeader
        title={title}
        description={description}
        icon={Icon}
        variant="primary"
        actions={actions}
      />
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Esqueleto de tarjeta de métrica. */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        count === 4 && "sm:grid-cols-2 xl:grid-cols-4",
        count === 3 && "sm:grid-cols-3",
        count === 2 && "sm:grid-cols-2",
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Esqueleto de tarjeta con header (chart/lista). */
export function ChartCardSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="h-12 w-full rounded-none" />
      <div className={cn("flex items-center justify-center p-5", height)}>
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    </div>
  );
}

/** Esqueleto de tabla de registros. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="h-12 w-full rounded-none" />
      <div className="p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border py-4 last:border-0"
          >
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-4 w-28 md:block" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
