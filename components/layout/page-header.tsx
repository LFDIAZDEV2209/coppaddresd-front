import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-t-xl rounded-b-none bg-gradient-to-r from-[var(--sidebar)] to-[color-mix(in_srgb,var(--sidebar)_88%,var(--primary))] px-6 py-4",
        className
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon className="size-5" />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden min-w-0">
        <h1 className="text-lg font-bold text-white tracking-tight truncate">
          {title}
        </h1>
        <p className="text-[12px] text-white/60 truncate">
          {description}
        </p>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}