"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertSeverity, RiskLevel, TestState } from "../../types";
import { riskColors, severityColors, testStateColors } from "./colors";

/** Badge de nivel de riesgo con icono (bajo/moderado/alto/crítico/sin evaluar). */
export function RiskBadge({
  risk,
  label,
  className,
}: {
  risk: RiskLevel;
  label?: string;
  className?: string;
}) {
  const colors = riskColors(risk);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold",
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: colors.dot }}
        aria-hidden
      />
      {label ?? risk}
    </span>
  );
}

/** Badge de severidad de alerta. */
export function SeverityBadge({
  severity,
  label,
  className,
}: {
  severity: AlertSeverity;
  label?: string;
  className?: string;
}) {
  const colors = severityColors(severity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold",
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: colors.dot }}
      />
      {label ?? severity}
    </span>
  );
}

/** Badge de estado de un test (completado/en progreso/pendiente/vencido). */
export function TestStateBadge({
  state,
  label,
  className,
}: {
  state: TestState;
  label?: string;
  className?: string;
}) {
  const colors = testStateColors(state);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold",
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: colors.dot }}
      />
      {label ?? state}
    </span>
  );
}

/** Icono semántico de severidad (para listas compactas). */
export function SeverityIcon({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  if (severity === "critica") {
    return <TriangleAlert className={cn("text-destructive", className)} />;
  }
  return (
    <ShieldAlert
      className={cn(
        severity === "alta" && "text-destructive",
        severity === "media" && "text-warning",
        severity === "baja" && "text-info",
        severity === "informativa" && "text-muted-foreground",
        className,
      )}
    />
  );
}
