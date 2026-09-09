"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select nativo estilizado (patrón del módulo Usuarios): borde visible,
 * flecha custom y mismo alto que los inputs. Se usa donde el Select de
 * Base UI no aporta (celdas de tabla, listas de tarjetas, wizards largos).
 */
export function NativeSelect({
  value,
  onChange,
  options,
  invalid,
  ariaLabel,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
        aria-invalid={invalid}
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white pr-8 pl-3 text-[13px] font-medium text-foreground shadow-xs outline-none transition-all hover:border-primary/50 hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:bg-destructive-soft/20 aria-[invalid=true]:text-destructive"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center border-l border-border/60"
      >
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </span>
    </div>
  );
}
