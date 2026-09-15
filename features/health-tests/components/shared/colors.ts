import type { AlertSeverity, RiskLevel, TestState } from "../../types";

/**
 * Colores semánticos compartidos del módulo de Tests de Salud.
 * Usan las variables del tema (success/warning/destructive/info/primary).
 */

export function riskColors(risk: RiskLevel) {
  const map: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
    bajo: {
      bg: "#10B9811A",
      text: "#0F8A5F",
      dot: "#10B981",
    },
    moderado: {
      bg: "#F59E0B1A",
      text: "#B45309",
      dot: "#F59E0B",
    },
    alto: {
      bg: "#F973161A",
      text: "#C2410C",
      dot: "#F97316",
    },
    critico: {
      bg: "#EF4444",
      text: "white",
      dot: "white",
    },
    "sin-evaluar": {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    },
  };
  return map[risk];
}

export function severityColors(severity: AlertSeverity) {
  const map: Record<AlertSeverity, { bg: string; text: string; dot: string }> =
    {
      critica: {
        bg: "#EF4444",
        text: "white",
        dot: "white",
      },
      alta: {
        bg: "#F973161A",
        text: "#C2410C",
        dot: "#F97316",
      },
      media: {
        bg: "#F59E0B1A",
        text: "#B45309",
        dot: "#F59E0B",
      },
      baja: {
        bg: "#0EA5E91A",
        text: "#0369A1",
        dot: "#0EA5E9",
      },
      informativa: {
        bg: "var(--muted)",
        text: "var(--muted-foreground)",
        dot: "var(--muted-foreground)",
      },
    };
  return map[severity];
}

export function testStateColors(state: TestState) {
  const map: Record<TestState, { bg: string; text: string; dot: string }> = {
    completado: {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    },
    "en-progreso": {
      bg: "var(--info-soft)",
      text: "var(--info-foreground)",
      dot: "var(--info)",
    },
    pendiente: {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    },
    vencido: {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
  };
  return map[state];
}

/** Color de acento para una categoría de test (consistente con los emojis). */
export function categoryAccent(category: string): string {
  const map: Record<string, string> = {
    "historia-clinica": "#1B6CA8",
    nutricion: "#1D9E75",
    movimiento: "#E87B2B",
    sueno: "#7C3AED",
    adherencia: "#0EA5E9",
    "salud-mental": "#4F46E5",
    cardiometabolico: "#E24B4A",
  };
  return map[category] ?? "#64748B";
}

/** Color de barra según el nivel de riesgo del resultado. */
export function scoreBarColor(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    bajo: "var(--success)",
    moderado: "var(--warning)",
    alto: "var(--destructive)",
    critico: "var(--destructive)",
    "sin-evaluar": "var(--muted-foreground)",
  };
  return map[risk];
}

/** Color de acento por severidad para iconos/grafías. */
export function severityHex(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    critica: "#EF4444",
    alta: "#F97316",
    media: "#F59E0B",
    baja: "#0EA5E9",
    informativa: "#64748B",
  };
  return map[severity];
}

/** Color de acento por nivel de riesgo para grafías. */
export function riskHex(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    bajo: "#10B981",
    moderado: "#F59E0B",
    alto: "#F97316",
    critico: "#EF4444",
    "sin-evaluar": "#94A3B8",
  };
  return map[risk];
}

/** Paleta intensa del mapa de calor geográfico (riesgo alto por estado). */
export const mapRiskPalette = {
  low: "#34D399",
  medium: "#FBBF24",
  high: "#F87171",
  none: "#B9C7DC",
  } as const;

/** Color pastel de un estado según el % de pacientes de riesgo alto. */
export function mapRiskColor(highRiskPct: number | null): string {
  if (highRiskPct == null) return mapRiskPalette.none;
  if (highRiskPct < 20) return mapRiskPalette.low;
  if (highRiskPct < 40) return mapRiskPalette.medium;
  return mapRiskPalette.high;
}
