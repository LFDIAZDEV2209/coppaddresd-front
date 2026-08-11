import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type HeaderVariant = "primary" | "secondary" | "tertiary";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  variant?: HeaderVariant;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  variant = "primary",
  className,
}: SectionHeaderProps) {
  const styles = {
    primary: "bg-[#0B2B4A] text-white rounded-2xl px-5 py-4",
    secondary: "bg-primary-soft text-foreground rounded-xl px-4 py-3",
    tertiary: "bg-transparent text-foreground px-0 py-2",
  };

  const iconStyles = {
    primary: "bg-[#123B63] text-white",
    secondary: "bg-primary/10 text-primary",
    tertiary: "bg-muted text-muted-foreground",
  };

  const titleStyles = {
    primary: "text-[15px] font-bold text-white",
    secondary: "text-[14px] font-semibold text-foreground",
    tertiary: "text-[14px] font-semibold text-foreground",
  };

  const descStyles = {
    primary: "text-[12px] text-white/70",
    secondary: "text-[11.5px] text-muted-foreground",
    tertiary: "text-[11.5px] text-muted-foreground",
  };

  return (
    <div className={cn("flex items-center gap-3", styles[variant], className)}>
      {Icon && (
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-xl shrink-0",
            iconStyles[variant]
          )}
        >
          <Icon className="size-[18px]" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden min-w-0">
        <h2 className={cn("truncate", titleStyles[variant])}>{title}</h2>
        {description && (
          <p className={cn("truncate", descStyles[variant])}>{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
