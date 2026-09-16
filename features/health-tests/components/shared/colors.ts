import type { AlertSeverity, RiskLevel, TestState } from "../../types";

/**
 * Colores semánticos compartidos del módulo de Tests de Salud.
 * Usan las variables del tema (success/warning/destructive/info/primary).
 */

export function riskColors(risk: RiskLevel) {
  const map: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
    bajo: {
      bg: "#E3F4EC",
      text: "#0F7A5A",
      dot: "#5FBF9B",
    },
    moderado: {
      bg: "#FBF0D9",
      text: "#8A6100",
      dot: "#E3B85C",
    },
    alto: {
      bg: "#FCE7DC",
      text: "#A8531A",
      dot: "#EDA57C",
    },
    critico: {
      bg: "#FBE0E3",
      text: "#B02A38",
      dot: "#E58C97",
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
        bg: "#FBE0E3",
        text: "#B02A38",
        dot: "#E58C97",
      },
      alta: {
        bg: "#FCE7DC",
        text: "#A8531A",
        dot: "#EDA57C",
      },
      media: {
        bg: "#FBF0D9",
        text: "#8A6100",
        dot: "#E3B85C",
      },
      baja: {
        bg: "#E4EEF8",
        text: "#2C5F86",
        dot: "#93B8D6",
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
    critica: "#E58C97",
    alta: "#EDA57C",
    media: "#E3B85C",
    baja: "#93B8D6",
    informativa: "#94A3B8",
  };
  return map[severity];
}

/** Color de acento por nivel de riesgo para grafías. */
export function riskHex(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    bajo: "#5FBF9B",
    moderado: "#E3B85C",
    alto: "#EDA57C",
    critico: "#E58C97",
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
