import type {
  AlertSeverity,
  NotificationStatus,
  RiskLevel,
  TestState,
} from "../../types";

/**
 * Paleta semántica del módulo de Tests de Salud.
 *
 * Sigue la línea visual del dashboard: saturada y con relieve, no pastel.
 * Cada tono expone:
 *  - solid   → relleno vivo (gráficas)
 *  - deep    → relleno profundo (píldoras/chips con texto encima)
 *  - darker  → borde y relieve
 *  - text    → color de texto legible sobre `deep` (contraste AA)
 *  - soft    → fondo tenue + texto oscuro (superficies tranquilas)
 */
export interface Tone {
  solid: string;
  deep: string;
  darker: string;
  text: string;
  soft: string;
  softText: string;
}

/** Tonos base (mismos matices que la paleta de gráficas del dashboard). */
export const tones = {
  red: {
    solid: "#DC2626",
    deep: "#B91C1C",
    darker: "#7F1D1D",
    text: "#FFFFFF",
    soft: "#FEE2E2",
    softText: "#991B1B",
  },
  orange: {
    solid: "#EA580C",
    deep: "#C2410C",
    darker: "#9A3412",
    text: "#FFFFFF",
    soft: "#FFEDD5",
    softText: "#9A3412",
  },
  amber: {
    solid: "#D97706",
    deep: "#B45309",
    darker: "#92400E",
    text: "#1A1203",
    soft: "#FEF3C7",
    softText: "#92400E",
  },
  emerald: {
    solid: "#059669",
    deep: "#047857",
    darker: "#065F46",
    text: "#FFFFFF",
    soft: "#D1FAE5",
    softText: "#065F46",
  },
  sky: {
    solid: "#0284C7",
    deep: "#0369A1",
    darker: "#075985",
    text: "#FFFFFF",
    soft: "#E0F2FE",
    softText: "#075985",
  },
  slate: {
    solid: "#64748B",
    deep: "#475569",
    darker: "#334155",
    text: "#FFFFFF",
    soft: "#F1F5F9",
    softText: "#334155",
  },
} satisfies Record<string, Tone>;

/** Tokens neutros heredados del paso anterior (texto/superficies/bordes). */
export const carbon = {
  blue60: "#0F62FE",
  blue70: "#0043CE",
  gray100: "#161616",
  gray70: "#525252",
  gray60: "#6F6F6F",
  gray50: "#8D8D8D",
  gray20: "#E0E0E0",
  gray10: "#F4F4F4",
  white: "#FFFFFF",
} as const;

/** Rampa clínica de severidad: verde → ámbar → naranja → rojo. */
export const severityTones: Record<AlertSeverity, Tone> = {
  baja: tones.emerald,
  media: tones.amber,
  alta: tones.orange,
  critica: tones.red,
  informativa: tones.slate,
};

/** Rampa de riesgo, alineada a la de severidad. */
export const riskTones: Record<RiskLevel, Tone> = {
  bajo: tones.emerald,
  moderado: tones.amber,
  alto: tones.orange,
  critico: tones.red,
  "sin-evaluar": tones.slate,
};

/** Estados de un test de salud. */
export const testStateTones: Record<TestState, Tone> = {
  completado: tones.emerald,
  "en-progreso": tones.sky,
  pendiente: tones.slate,
  vencido: tones.amber,
};

/** Estados de gestión de una alerta. */
export const alertStatusTones: Record<string, Tone> = {
  activa: tones.red,
  "en-revision": tones.amber,
  atendida: tones.emerald,
  cerrada: tones.slate,
};

/** Estados de entrega de una notificación. */
export const notificationStatusTones: Record<NotificationStatus, Tone> = {
  sent: tones.emerald,
  queued: tones.slate,
  failed: tones.red,
  skipped: tones.amber,
};

/** Tonos de acento por severidad (iconos y chips). */
export function severityTone(severity: AlertSeverity): Tone {
  return severityTones[severity] ?? tones.slate;
}

export function riskTone(risk: RiskLevel): Tone {
  return riskTones[risk] ?? tones.slate;
}

/* ------------------------------------------------------------------ */
/* Compatibilidad: helpers previos que devuelven { bg, text, dot }      */
/* ------------------------------------------------------------------ */

export function riskColors(risk: RiskLevel) {
  const tone = riskTone(risk);
  return { bg: tone.soft, text: tone.softText, dot: tone.solid };
}

export function severityColors(severity: AlertSeverity) {
  const tone = severityTone(severity);
  return { bg: tone.soft, text: tone.softText, dot: tone.solid };
}

export function testStateColors(state: TestState) {
  const tone = testStateTones[state] ?? tones.slate;
  return { bg: tone.soft, text: tone.softText, dot: tone.solid };
}

/** Color de acento para una categoría de test (consistente con los emojis). */
export function categoryAccent(category: string): string {
  const map: Record<string, string> = {
    "historia-clinica": "#0369A1",
    nutricion: "#047857",
    movimiento: "#C2410C",
    sueno: "#7C3AED",
    adherencia: "#0284C7",
    "salud-mental": "#4F46E5",
    cardiometabolico: "#B91C1C",
  };
  return map[category] ?? tones.slate.solid;
}

/** Color de barra según el nivel de riesgo del resultado. */
export function scoreBarColor(risk: RiskLevel): string {
  return riskTone(risk).deep;
}

/** Color de acento por severidad para iconos/grafías. */
export function severityHex(severity: AlertSeverity): string {
  return severityTone(severity).solid;
}

/** Color de acento por nivel de riesgo para grafías. */
export function riskHex(risk: RiskLevel): string {
  return riskTone(risk).solid;
}

/** Paleta del mapa de calor geográfico (riesgo alto por estado). */
export const mapRiskPalette = {
  low: tones.emerald.solid,
  medium: tones.amber.solid,
  high: tones.red.solid,
  none: "#C6C6C6",
} as const;

/** Color de un estado según el % de pacientes de riesgo alto. */
export function mapRiskColor(highRiskPct: number | null): string {
  if (highRiskPct == null) return mapRiskPalette.none;
  if (highRiskPct < 20) return mapRiskPalette.low;
  if (highRiskPct < 40) return mapRiskPalette.medium;
  return mapRiskPalette.high;
}
