"use client";

import { useT } from "@/providers/i18n-provider";
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

export function ProgramViewSwitcher({
  value,
  options,
  onChange,
}: ViewSwitcherProps) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label={t("Vistas del programa")}
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-brand-blue-soft/30 bg-secondary/60 p-1"
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
              "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              isActive
                ? "bg-brand-gradient text-white"
                : "text-muted-foreground hover:bg-primary-soft hover:text-foreground",
            )}
          >
            {t(option.label)}
          </button>
        );
      })}
    </div>
  );
}
