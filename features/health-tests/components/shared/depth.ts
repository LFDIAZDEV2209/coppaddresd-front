import type { CSSProperties } from "react";
import type { Tone } from "./colors";

/**
 * Helpers de relieve (efecto 3D) para píldoras, chips y barras.
 * Replican el lenguaje visual del dashboard: degradado superior, brillo
 * interior, sombra inferior y sombra exterior suave.
 */

const INNER_HIGHLIGHT = "inset 0 1px 0 rgba(255, 255, 255, 0.42)";
const INNER_SHADE = "inset 0 -1px 2px rgba(0, 0, 0, 0.12)";
const OUTER_SHADOW = "0 1px 2px rgba(16, 24, 40, 0.16)";

/** Relleno profundo con degradado vertical (píldoras de estado). */
export function pillStyle(tone: Tone): CSSProperties {
  return {
    color: tone.text,
    backgroundColor: tone.deep,
    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, white 22%, ${tone.deep}) 0%, ${tone.deep} 62%, color-mix(in srgb, black 10%, ${tone.deep}) 100%)`,
    border: `1px solid ${tone.darker}`,
    boxShadow: `${INNER_HIGHLIGHT}, ${INNER_SHADE}, ${OUTER_SHADOW}`,
  };
}

/** Píldora plana para severidad/estado: color sólido, sin degradado. */
export function flatPillStyle(tone: Tone): CSSProperties {
  return {
    color: tone.text,
    backgroundColor: tone.solid,
    border: `1px solid color-mix(in srgb, ${tone.darker} 58%, transparent)`,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.12)",
  };
}

/** Punto tipo neón: núcleo claro y halo del propio tono. */
export function neonDotStyle(tone: Tone): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, white 74%, ${tone.solid})`,
    boxShadow: `0 0 0 1px color-mix(in srgb, ${tone.solid} 50%, transparent), 0 0 6px 1px color-mix(in srgb, ${tone.solid} 85%, transparent)`,
  };
}

/** Píldora tenue para estados secundarios (fondo suave, texto oscuro). */
export function softPillStyle(tone: Tone): CSSProperties {
  return {
    color: tone.softText,
    backgroundColor: tone.soft,
    border: `1px solid color-mix(in srgb, ${tone.darker} 28%, transparent)`,
  };
}

/**
 * Chip de tono suave con borde sólido: el lenguaje visual de "Alertas por
 * estado" del rail (fondo tenue + borde del color + texto oscuro legible).
 */
export function toneChipStyle(tone: Tone): CSSProperties {
  return {
    color: tone.softText,
    backgroundColor: tone.soft,
    borderColor: tone.solid,
  };
}

/** Punto brillante (brillo radial + anillo interior). */
export function dotStyle(tone: Tone): CSSProperties {
  return {
    backgroundColor: tone.solid,
    backgroundImage: `radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.9), ${tone.solid} 72%)`,
    boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.16)",
  };
}

/** Chip de icono tipo StatCard: degradado diagonal + sombras. */
export function chipStyle(tone: Tone, size = 26): CSSProperties {
  return {
    width: size,
    height: size,
    color: tone.text,
    backgroundColor: tone.deep,
    backgroundImage: `linear-gradient(150deg, color-mix(in srgb, white 26%, ${tone.deep}) 0%, ${tone.deep} 58%, color-mix(in srgb, black 10%, ${tone.deep}) 100%)`,
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 2px rgba(0, 0, 0, 0.14), 0 2px 4px rgba(16, 24, 40, 0.18)",
  };
}

/** Barra de progreso con degradado horizontal sobre un tono. */
export function barStyle(tone: Tone, pct: number): CSSProperties {
  return {
    width: `${pct}%`,
    backgroundColor: tone.solid,
    backgroundImage: `linear-gradient(90deg, color-mix(in srgb, white 18%, ${tone.solid}) 0%, ${tone.solid} 60%, color-mix(in srgb, black 12%, ${tone.solid}) 100%)`,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.3)",
  };
}
