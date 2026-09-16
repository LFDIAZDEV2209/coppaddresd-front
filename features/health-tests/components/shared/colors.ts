import type { AlertSeverity, RiskLevel, TestState } from "../../types";

/**
 * Colores semánticos del módulo de Tests de Salud.
 *
 * Paleta basada en IBM Carbon Design System (Apache-2.0): tonos funcionales
 * pensados para consolas clínicas de uso prolongado — el color comunica,
 * no decora. Cada estado usa un fondo teñido ( *-10 ) con texto oscuro
 * ( *-60/70 ) para garantizar contraste AA sobre superficies claras.
 *
 * Estos valores son exclusivos del módulo de Tests de Salud; el resto del
 * ERP conserva sus tokens de tema en globals.css.
 */
export const carbon = {
  /* Interactivo / acento primario */
  blue60: "#0f62fe",
  blue70: "#0043ce",
  blue10: "#edf5ff",
  blue20: "#d0e2ff",
  /* Éxito (riesgo bajo, completado, entregado) */
  green60: "#198038",
  green70: "#0e6027",
  green50: "#24a148",
  green10: "#defbe6",
  /* Advertencia (riesgo moderado, en revisión) */
  yellow30: "#f1c21b",
  yellow60: "#8e6a00",
  yellow10: "#fcf4d6",
  /* Riesgo alto */
  orange40: "#ff832b",
  orange70: "#8a3800",
  orange10: "#fff2e8",
  /* Crítico / error */
  red60: "#da1e28",
  red70: "#a2191f",
  red10: "#fff1f1",
  /* Categóricos */
  purple60: "#8a3ffc",
  magenta60: "#d02670",
  teal60: "#007d79",
  cyan50: "#1192e8",
  /* Neutros */
  gray100: "#161616",
  gray70: "#525252",
  gray60: "#6f6f6f",
  gray50: "#8d8d8d",
  gray30: "#c6c6c6",
  gray20: "#e0e0e0",
  gray10: "#f4f4f4",
  white: "#ffffff",
} as const;

/** Escala de riesgo clínico: verde → amarillo → naranja → rojo. */
export function riskColors(risk: RiskLevel) {
  const map: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
    bajo: {
      bg: carbon.green10,
      text: carbon.green70,
      dot: carbon.green60,
    },
    moderado: {
      bg: carbon.yellow10,
      text: carbon.yellow60,
      dot: carbon.yellow30,
    },
    alto: {
      bg: carbon.orange10,
      text: carbon.orange70,
      dot: carbon.orange40,
    },
    critico: {
      bg: carbon.red10,
      text: carbon.red70,
      dot: carbon.red60,
    },
    "sin-evaluar": {
      bg: carbon.gray10,
      text: carbon.gray70,
      dot: carbon.gray50,
    },
  };
  return map[risk];
}

/** Escala de severidad de alertas (misma semántica que el riesgo). */
export function severityColors(severity: AlertSeverity) {
  const map: Record<AlertSeverity, { bg: string; text: string; dot: string }> =
    {
      critica: {
        bg: carbon.red10,
        text: carbon.red70,
        dot: carbon.red60,
      },
      alta: {
        bg: carbon.orange10,
        text: carbon.orange70,
        dot: carbon.orange40,
      },
      media: {
        bg: carbon.yellow10,
        text: carbon.yellow60,
        dot: carbon.yellow30,
      },
      baja: {
        bg: carbon.blue10,
        text: carbon.blue70,
        dot: carbon.blue60,
      },
      informativa: {
        bg: carbon.gray10,
        text: carbon.gray70,
        dot: carbon.gray50,
      },
    };
  return map[severity];
}

/** Estado de ejecución de un test. */
export function testStateColors(state: TestState) {
  const map: Record<TestState, { bg: string; text: string; dot: string }> = {
    completado: {
      bg: carbon.green10,
      text: carbon.green70,
      dot: carbon.green60,
    },
    "en-progreso": {
      bg: carbon.blue10,
      text: carbon.blue70,
      dot: carbon.blue60,
    },
    pendiente: {
      bg: carbon.gray10,
      text: carbon.gray70,
      dot: carbon.gray50,
    },
    vencido: {
      bg: carbon.yellow10,
      text: carbon.yellow60,
      dot: carbon.yellow30,
    },
  };
  return map[state];
}

/** Color de acento para una categoría de test (consistente con los emojis). */
export function categoryAccent(category: string): string {
  const map: Record<string, string> = {
    "historia-clinica": carbon.blue60,
    nutricion: carbon.green60,
    movimiento: carbon.orange40,
    sueno: carbon.purple60,
    adherencia: carbon.cyan50,
    "salud-mental": carbon.magenta60,
    cardiometabolico: carbon.red60,
  };
  return map[category] ?? carbon.gray60;
}

/** Color de barra según el nivel de riesgo del resultado. */
export function scoreBarColor(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    bajo: carbon.green60,
    moderado: carbon.yellow30,
    alto: carbon.orange40,
    critico: carbon.red60,
    "sin-evaluar": carbon.gray50,
  };
  return map[risk];
}

/** Color de acento por severidad para iconos/grafías. */
export function severityHex(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    critica: carbon.red60,
    alta: carbon.orange40,
    media: carbon.yellow30,
    baja: carbon.blue60,
    informativa: carbon.gray60,
  };
  return map[severity];
}

/** Color de acento por nivel de riesgo para grafías. */
export function riskHex(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    bajo: carbon.green60,
    moderado: carbon.yellow30,
    alto: carbon.orange40,
    critico: carbon.red60,
    "sin-evaluar": carbon.gray50,
  };
  return map[risk];
}

/** Paleta del mapa de calor geográfico (riesgo alto por estado). */
export const mapRiskPalette = {
  low: carbon.green50,
  medium: carbon.yellow30,
  high: carbon.red60,
  none: carbon.gray30,
} as const;

/** Color de un estado según el % de pacientes de riesgo alto. */
export function mapRiskColor(highRiskPct: number | null): string {
  if (highRiskPct == null) return mapRiskPalette.none;
  if (highRiskPct < 20) return mapRiskPalette.low;
  if (highRiskPct < 40) return mapRiskPalette.medium;
  return mapRiskPalette.high;
}
