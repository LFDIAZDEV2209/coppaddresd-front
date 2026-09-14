"use client";

import { CalendarClock } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "../services/program-erp-constants";
import type { PatientControlsDto } from "../types/erp";

type ChipTone = "neutral" | "info" | "primary" | "success" | "warning" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/20 bg-info-soft text-info",
  primary: "border-primary/20 bg-primary-soft text-primary",
  success: "border-success/20 bg-success-soft text-success-foreground",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-destructive/20 bg-destructive-soft text-destructive",
};

/**
 * Estado del contrato UC-004 → etiqueta i18n + tono del chip.
 * `closed_without_exam` se matiza con `closed_reason` (declined / timeout).
 */
function resolveStatus(
  status: string,
  closedReason: string | null,
): { label: string; tone: ChipTone } {
  switch (status) {
    case "pending":
      return { label: "Pendiente", tone: "warning" };
    case "sent":
      return { label: "Abierto", tone: "info" };
    case "responded":
      return { label: "Respondido", tone: "primary" };
    case "followed_up":
      return { label: "Follow-up enviado", tone: "primary" };
    case "completed":
      return { label: "Cumplido", tone: "success" };
    case "closed_without_exam":
      return closedReason === "declined"
        ? { label: "Cerrado (rechazó)", tone: "danger" }
        : { label: "Cerrado (sin examen)", tone: "neutral" };
    case "missed":
      return { label: "No cumplido", tone: "danger" };
    case "failed":
      return { label: "Falló el envío", tone: "danger" };
    case "skipped":
      return { label: "Sin plantilla", tone: "neutral" };
    default:
      // Estado nuevo del backend aún no mapeado: fallback traducido genérico.
      return { label: "Estado desconocido", tone: "neutral" };
  }
}

/** Chip de estado de un control; compartido por timeline e historial. */
export function ControlStatusChip({
  status,
  closedReason,
}: {
  status: string;
  closedReason?: string | null;
}) {
  const t = useT();
  const { label, tone } = resolveStatus(status, closedReason ?? null);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        CHIP_TONES[tone],
      )}
    >
      {t(label)}
    </span>
  );
}

/**
 * "YYYY-MM-DD" se parsea como fecha LOCAL (evita el corrimiento de día por
 * UTC); un ISO datetime se toma directo. Formato: "20 sep 2026".
 */
export function formatControlDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseLocalDate(value)
    : new Date(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ISO datetime → "20 sep 2026, 14:30". */
export function formatControlDateTime(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Stepper de hitos (día 7/14/21…) con el control actual resaltado. */
export function ControlesTimeline({
  controls,
}: {
  controls: PatientControlsDto;
}) {
  const t = useT();
  const current = controls.current_control;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={t("Hitos del programa")}
        description={t("Estado de cada control por día de hito")}
        icon={CalendarClock}
        variant="secondary"
        actions={
          <div className="hidden text-right sm:block">
            {current && (
              <p className="text-[11px] font-semibold text-foreground">
                {t("Control actual")}:{" "}
                {t("Día {day}", { day: String(current.milestone_day) })}
              </p>
            )}
            {controls.next_due && (
              <p className="text-[11px] text-muted-foreground">
                {t("Próximo control")}:{" "}
                {formatControlDate(controls.next_due.target_date)}
              </p>
            )}
          </div>
        }
      />

      <ol className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
        {controls.milestones.map((milestone) => {
          const isCurrent =
            current !== null &&
            (milestone.control_id === current.control_id ||
              milestone.milestone_day === current.milestone_day);
          return (
            <li
              key={milestone.milestone_day}
              className={cn(
                "relative flex flex-col gap-2 rounded-xl border p-3 transition-colors",
                isCurrent
                  ? "border-primary/50 bg-primary-soft/40 ring-1 ring-primary/30"
                  : "border-border bg-muted/20",
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                {t("Día {day}", { day: String(milestone.milestone_day) })}
              </span>
              <ControlStatusChip
                status={milestone.status}
                closedReason={milestone.closed_reason}
              />
              <span className="text-[11px] text-muted-foreground">
                {formatControlDate(milestone.target_date)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
