"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AlertSeverity,
  AlertStatus,
  NotificationStatus,
  RiskLevel,
  TestState,
} from "../../types";
import {
  alertStatusTones,
  notificationStatusTones,
  riskTone,
  severityTone,
  testStateTones,
  type Tone,
} from "./colors";
import { dotStyle, pillStyle, softPillStyle } from "./depth";

/** Primera letra en mayúscula (critica → Critica). */
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Píldora de estado con relieve: relleno saturado en degradado, brillo
 * interior y punto luminoso. Base común de todos los badges del módulo.
 */
function ToneBadge({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold",
        className,
      )}
      style={pillStyle(tone)}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={dotStyle(tone)}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** Badge de nivel de riesgo (bajo/moderado/alto/crítico/sin evaluar). */
export function RiskBadge({
  risk,
  label,
  className,
}: {
  risk: RiskLevel;
  label?: string;
  className?: string;
}) {
  return (
    <ToneBadge tone={riskTone(risk)} label={label ?? risk} className={className} />
  );
}

/**
 * Píldora tenue: fondo suave y texto oscuro. Para estados secundarios
 * (entregas) donde la píldora saturada compite con la severidad.
 */
function SoftBadge({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium",
        className,
      )}
      style={softPillStyle(tone)}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={dotStyle(tone)}
        aria-hidden
      />
      {label}
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
  return (
    <ToneBadge
      tone={severityTone(severity)}
      label={label ?? capitalize(severity)}
      className={className}
    />
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
  const tone = testStateTones[state] ?? testStateTones.pendiente;
  return <ToneBadge tone={tone} label={label ?? state} className={className} />;
}

/** Badge de estado de gestión de una alerta. */
export function AlertStatusBadge({
  status,
  label,
  className,
}: {
  status: AlertStatus;
  label?: string;
  className?: string;
}) {
  const tone = alertStatusTones[status] ?? alertStatusTones.cerrada;
  return <ToneBadge tone={tone} label={label ?? status} className={className} />;
}

/** Badge de estado de entrega de una notificación. */
export function DeliveryStatusBadge({
  status,
  label,
  className,
}: {
  status: NotificationStatus;
  label?: string;
  className?: string;
}) {
  const tone = notificationStatusTones[status] ?? notificationStatusTones.queued;
  return <SoftBadge tone={tone} label={label ?? status} className={className} />;
}

/** Icono semántico de severidad (para listas compactas). */
export function SeverityIcon({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  const color = severityTone(severity).solid;
  if (severity === "critica") {
    return (
      <TriangleAlert
        className={cn(className)}
        style={{ color }}
        aria-hidden
      />
    );
  }
  return <ShieldAlert className={cn(className)} style={{ color }} aria-hidden />;
}
