"use client";

import { CalendarClock, CalendarDays, CalendarRange } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type RangeKey = "30d" | "60d" | "90d";

export interface RangeOption {
  key: RangeKey;
  label: string;
  days: number;
}

export const rangeOptions: RangeOption[] = [
  { key: "30d", label: "30 días", days: 30 },
  { key: "60d", label: "60 días", days: 60 },
  { key: "90d", label: "90 días", days: 90 },
];

const rangeIcons: Record<RangeKey, LucideIcon> = {
  "30d": CalendarRange,
  "60d": CalendarClock,
  "90d": CalendarDays,
};

/** Estilo del item activo (píldora primaria fuerte): alto contraste sobre el color principal. */
export const toggleActiveClass =
  "aria-pressed:border-primary-strong aria-pressed:bg-primary-strong aria-pressed:text-primary-foreground aria-pressed:shadow-sm data-[state=on]:border-primary-strong data-[state=on]:bg-primary-strong data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm";

/** Estilo del item activo sobre header navy (píldora blanca con icono navy). */
export const toggleActiveOnDarkClass =
  "border-transparent aria-pressed:bg-white aria-pressed:text-[var(--sidebar)] aria-pressed:shadow-sm data-[state=on]:bg-white data-[state=on]:text-[var(--sidebar)] data-[state=on]:shadow-sm";

/** Estilo del item inactivo sobre fondo del color principal (header del dashboard). */
const rangeInactiveClass =
  "border-transparent bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground data-[state=off]:border-transparent data-[state=off]:bg-white/10 data-[state=off]:text-primary-foreground";

/**
 * Selector de rango del dashboard (30/60/90 días). El item activo se resalta
 * con el color principal para un contraste claro; cada opción lleva su icono.
 */
export function RangeToggle({
  value,
  onValueChange,
  options = rangeOptions,
}: {
  value: RangeKey;
  onValueChange: (value: RangeKey) => void;
  options?: RangeOption[];
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(values) => {
        const next = values[0] as RangeKey | undefined;
        if (next) onValueChange(next);
      }}
      size="sm"
      variant="outline"
    >
      {options.map((option) => {
        const Icon = rangeIcons[option.key];
        return (
          <ToggleGroupItem
            key={option.key}
            value={option.key}
            className={
              option.key === value ? toggleActiveClass : rangeInactiveClass
            }
          >
            <Icon data-icon="inline-start" />
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
