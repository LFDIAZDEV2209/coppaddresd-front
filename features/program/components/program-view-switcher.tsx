"use client";

import { cn } from "@/lib/utils";

interface ViewOption {
  value: string;
  label: string;
}

interface ViewSwitcherProps {
  value: string;
  options: ViewOption[];
  onChange: (value: string) => void;
}

export function ProgramViewSwitcher({ value, options, onChange }: ViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Vistas del programa"
      className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
