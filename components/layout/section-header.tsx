import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl bg-primary-strong px-3 py-2",
        className
      )}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent">
        <Icon className="size-[15px] text-primary-foreground" />
      </div>

      <div className="flex flex-1 flex-col gap-px overflow-hidden">
        <h2 className="text-sm font-semibold text-primary-foreground truncate">
          {title}
        </h2>
        <p className="text-xs text-primary-foreground/76 truncate">
          {description}
        </p>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
