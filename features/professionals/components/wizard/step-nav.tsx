/**
 * Stepper visual reutilizable para wizards de creación/edición.
 * Muestra pasos con círculos numerados/icono, etiquetas e indicadores
 * de progreso. Solo permite navegar a pasos ya completados.
 */

"use client";

import {
  Building2,
  CalendarClock,
  Check,
  Send,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { StepDef } from "./wizard-state";

/** Iconos por defecto para las claves de paso del wizard de personas. */
const DEFAULT_ICONS: Record<string, React.ElementType> = {
  identity: UserRound,
  clinics: Building2,
  profession: Stethoscope,
  schedule: CalendarClock,
  review: Send,
  job: UserRound,
  clinic: Building2,
};

interface StepNavProps {
  /** Definición de los pasos (key, label, hint). */
  steps: StepDef[];
  /** Índice del paso actual (0-based). */
  currentIndex: number;
  /** Callback al hacer click en un paso completado. Omitir para deshabilitar la navegación por click. */
  onStepClick?: (index: number) => void;
  /** Mapa de iconos por clave de paso. Se fusiona con los iconos por defecto del wizard de personas. */
  icons?: Record<string, React.ElementType>;
}

export function StepNav({
  steps,
  currentIndex,
  onStepClick,
  icons,
}: StepNavProps) {
  const t = useT();
  const mergedIcons = { ...DEFAULT_ICONS, ...icons };

  return (
    <nav
      aria-label={t("Progreso del formulario")}
      className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 sm:px-6"
    >
      {steps.map((s, i) => {
        const Icon = mergedIcons[s.key] ?? UserRound;
        const active = currentIndex === i;
        const done = currentIndex > i;
        const clickable = done && Boolean(onStepClick);
        return (
          <div
            key={s.key}
            className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3"
          >
            <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`${s.label}${done ? " (completado)" : ""}`}
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 sm:size-11",
                  done &&
                    "border-success bg-success text-white shadow-sm shadow-success/30",
                  active &&
                    "scale-105 border-[var(--sidebar)] bg-[var(--sidebar)] text-white shadow-md shadow-[var(--sidebar)]/30 ring-4 ring-primary/15",
                  !done &&
                    !active &&
                    "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-4.5 sm:size-5" />
                ) : (
                  <Icon className="size-4 sm:size-4.5" />
                )}
              </button>
              <span
                className={cn(
                  "hidden max-w-36 flex-col leading-tight text-center sm:flex sm:text-left",
                  done && "cursor-pointer",
                )}
              >
                <span
                  className={cn(
                    "truncate text-[11.5px] font-bold",
                    active ? "text-[var(--sidebar)]" : "text-foreground",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {done ? t("Completado") : s.hint}
                </span>
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                aria-hidden
                className={cn(
                  "h-0.5 min-w-3 flex-1 rounded-full transition-colors duration-300",
                  currentIndex > i ? "bg-success" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
