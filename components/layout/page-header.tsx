import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  leadingVisual?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: "brand" | "primary";
  /** Se conserva para compatibilidad; ambas composiciones comparten el lenguaje aprobado. */
  layout?: "attached" | "workspace";
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  leadingVisual,
  actions,
  tone = "brand",
  layout = "workspace",
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      data-layout={layout}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-4 rounded-2xl px-5 py-4 text-white shadow-sm",
        tone === "primary" ? "bg-primary" : "bg-brand-gradient",
        className,
      )}
    >
      {leadingVisual ?? (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10"
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="flex min-w-0 basis-40 flex-1 flex-col gap-1">
        <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere]">
          {title}
        </h1>
        <p className="text-sm leading-5 text-white/85">{description}</p>
      </div>
      {actions && (
        <div className="flex min-w-0 w-full flex-wrap items-center gap-2 @min-[640px]/workspace:w-auto [&>div]:flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
