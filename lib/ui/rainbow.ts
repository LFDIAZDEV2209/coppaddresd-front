import type { CSSProperties } from "react";

export const RAINBOW_TONES = [
  "sky",
  "teal",
  "violet",
  "amber",
  "pink",
  "green",
  "slate",
] as const;
export type RainbowTone = (typeof RAINBOW_TONES)[number] | "rose" | "orange";
export const RAINBOW_SERIES = RAINBOW_TONES.map(
  (tone) => `var(--spectrum-${tone}-chart)`,
);
export const RAINBOW_GRADIENTS = RAINBOW_TONES.map(
  (tone) =>
    [`var(--spectrum-${tone}-bright)`, `var(--spectrum-${tone}-deep)`] as const,
);

/** Un solo contrato de presentación; los estados y umbrales permanecen en cada módulo. */
export function rainbowStyle(tone: RainbowTone): CSSProperties {
  return {
    "--rainbow-color": `var(--spectrum-${tone}-chart)`,
    "--rainbow-deep": `var(--spectrum-${tone}-deep)`,
    "--rainbow-soft": `var(--spectrum-${tone}-soft)`,
    "--rainbow-fg": `var(--spectrum-${tone}-fg)`,
    "--rainbow-border": `var(--spectrum-${tone}-border)`,
  } as CSSProperties;
}

export function rainbowToneFromClassName(value = ""): RainbowTone | undefined {
  const roles: [RegExp, RainbowTone][] = [
    [/(?:destructive|danger|rose|red)/i, "rose"],
    [/(?:orange)/i, "orange"],
    [/(?:warning|yellow|amber)/i, "amber"],
    [/(?:success|emerald|green)/i, "green"],
    [/(?:teal|cyan)/i, "teal"],
    [/(?:violet|purple|indigo)/i, "violet"],
    [/(?:pink|fuchsia)/i, "pink"],
    [/(?:slate|gray|grey|muted|secondary)/i, "slate"],
    [/(?:info|primary|sky|blue|brand)/i, "sky"],
  ];
  return roles.find(([pattern]) => pattern.test(value))?.[1];
}

/** Adapta colores ya declarados por el módulo, sin interpretar ni reclasificar etiquetas clínicas. */
export function rainbowToneFromColor(value: string): RainbowTone | undefined {
  if (value.includes("var(")) return rainbowToneFromClassName(value);
  const hex = /^#([\da-f]{6}|[\da-f]{3})$/i.exec(value.trim());
  if (!hex) return undefined;
  const digits =
    hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
  const [r, g, b] = [0, 2, 4].map(
    (index) => parseInt(digits.slice(index, index + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  if (delta < 0.17) return undefined;
  let hue =
    max === r
      ? (g - b) / delta
      : max === g
        ? 2 + (b - r) / delta
        : 4 + (r - g) / delta;
  hue = (hue * 60 + 360) % 360;
  if (hue < 10 || hue >= 340) return "rose";
  if (hue < 40) return "orange";
  if (hue < 68) return "amber";
  if (hue < 160) return "green";
  if (hue < 190) return "teal";
  if (hue < 248) return "sky";
  if (hue < 290) return "violet";
  return "pink";
}

export function rainbowTagColors(tone: RainbowTone) {
  return {
    bg: `var(--spectrum-${tone}-soft)`,
    text: `var(--spectrum-${tone}-fg)`,
    dot: `var(--spectrum-${tone}-chart)`,
  };
}

/** Colores de datos independientes del acento elegido para la navegación. */
export function chartColor(tone: RainbowTone): string {
  return `var(--spectrum-${tone}-chart)`;
}

/** Transparencia compatible con tokens CSS y colores literales. */
export function colorTint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

// Volumen: escala ordenada fría → cálida. Riesgo clínico usa su propia rampa semántica.
export const VOLUME_MAP_SCALE = ["sky", "teal", "violet", "amber", "pink"].map(
  (tone) => chartColor(tone as RainbowTone),
);
export const MAP_NO_DATA = "var(--spectrum-map-empty)";
export function volumeMapColor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return MAP_NO_DATA;
  const ratio = count / max;
  return VOLUME_MAP_SCALE[
    ratio <= 0.15 ? 0 : ratio <= 0.4 ? 1 : ratio <= 0.7 ? 2 : ratio < 1 ? 3 : 4
  ];
}

const REGION_TONES: Record<string, RainbowTone> = {
  miami: "sky",
  ny: "green",
  barranquilla: "amber",
  orlando: "orange",
  houston: "violet",
  dallas: "rose",
  atlanta: "teal",
  seattle: "sky",
  denver: "amber",
  bogota: "pink",
  cdmx: "violet",
};
/** La misma ciudad mantiene el mismo color en el marcador, la leyenda y los listados. */
export function regionChartColor(region: string): string {
  const key = region
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  return chartColor(REGION_TONES[key] ?? "slate");
}

/** Adaptación para gráficas compartidas que todavía reciben colores semánticos heredados. */
export function sharedChartColor(value: string): string {
  const tone = rainbowToneFromColor(value);
  return tone ? chartColor(tone) : value;
}

/** Mismo acabado claro → profundo que las barras del dashboard. */
export function chartGradient(
  value: string,
  direction: "vertical" | "horizontal" = "vertical",
): string | undefined {
  const tone =
    rainbowToneFromColor(value) ??
    (/^var\(--chart-([1-5])\)$/.test(value)
      ? RAINBOW_TONES[Number(value.match(/[1-5]/)?.[0]) - 1]
      : undefined);
  if (!tone) return undefined;
  return `linear-gradient(${direction === "horizontal" ? "90deg" : "180deg"}, var(--spectrum-${tone}-bright), var(--spectrum-${tone}-deep))`;
}
