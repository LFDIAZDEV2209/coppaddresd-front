import type { LucideIcon } from "lucide-react";
import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";

type HeaderVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "destructive"
  | "surface";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  variant?: HeaderVariant;
  className?: string;
  accent?: RainbowTone;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  variant = "primary",
  className,
  accent,
}: SectionHeaderProps) {
  // primary lleva el gradiente completo de marca (el usuario lo prefiere); PageHeader usa el mismo
  const styles = {
    surface: "bg-card text-card-foreground px-5 py-4",
    primary:
      "bg-brand-gradient min-h-[72px] text-white rounded-none px-5 py-3.5",
    secondary: "bg-primary-soft text-foreground rounded-xl px-4 py-3",
    tertiary: "bg-transparent text-foreground px-0 py-2",
    destructive: "bg-destructive text-white rounded-none px-4 py-3",
  };

  const iconStyles = {
    surface: "bg-primary-soft text-primary-soft-foreground",
    primary: "border border-white/30 bg-white/10 text-white rounded-full",
    secondary: "bg-primary/10 text-primary",
    tertiary: "bg-muted text-muted-foreground",
    destructive: "bg-white text-destructive",
  };

  const titleStyles = {
    surface: "text-[15px] font-semibold text-card-foreground",
    primary:
      "text-[13px] leading-5 font-bold uppercase tracking-[0.02em] text-white",
    secondary: "text-[13px] font-semibold text-foreground",
    tertiary: "text-[13px] font-semibold text-foreground",
    destructive: "text-[13px] font-bold text-white",
  };

  const descStyles = {
    surface: "text-xs text-muted-foreground",
    primary: "text-xs leading-5 text-white/85",
    secondary: "text-[11px] text-muted-foreground",
    tertiary: "text-[11px] text-muted-foreground",
    destructive: "text-[11px] text-white/80",
  };

  return (
    <div
      data-slot="section-header"
      style={accent ? rainbowStyle(accent) : undefined}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-3",
        styles[variant],
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg shrink-0",
            accent ? "spectrum-icon" : iconStyles[variant],
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <h2
          className={cn(
            "whitespace-normal [overflow-wrap:anywhere]",
            titleStyles[variant],
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "whitespace-normal leading-relaxed",
              descStyles[variant],
            )}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
