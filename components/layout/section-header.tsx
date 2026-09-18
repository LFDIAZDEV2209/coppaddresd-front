import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type HeaderVariant = "primary" | "secondary" | "tertiary" | "destructive";

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
  // primary lleva el gradiente completo de marca (el usuario lo prefiere); PageHeader usa el mismo
  const styles = {
    primary: "bg-brand-gradient text-white rounded-none px-4 py-3",
    secondary: "bg-primary-soft text-foreground rounded-xl px-4 py-3",
    tertiary: "bg-transparent text-foreground px-0 py-2",
    destructive: "bg-destructive text-white rounded-none px-4 py-3",
  };

  const iconStyles = {
    primary: "bg-white text-[var(--sidebar)]",
    secondary: "bg-primary/10 text-primary",
    tertiary: "bg-muted text-muted-foreground",
    destructive: "bg-white text-destructive",
  };

  const titleStyles = {
    primary: "text-[13px] font-bold text-white",
    secondary: "text-[13px] font-semibold text-foreground",
    tertiary: "text-[13px] font-semibold text-foreground",
    destructive: "text-[13px] font-bold text-white",
  };

  const descStyles = {
    primary: "text-[11px] text-white/75",
    secondary: "text-[11px] text-muted-foreground",
    tertiary: "text-[11px] text-muted-foreground",
    destructive: "text-[11px] text-white/80",
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", styles[variant], className)}>
      {Icon && (
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg shrink-0",
            iconStyles[variant],
          )}
        >
          <Icon className="size-4" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden min-w-0">
        <h2 className={cn("truncate", titleStyles[variant])}>{title}</h2>
        {description && (
          <p className={cn("truncate", descStyles[variant])}>{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      )}
    </div>
  );
}
