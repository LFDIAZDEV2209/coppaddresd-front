/**
 * Paleta curada de colores de acento. Única fuente de verdad de la UI: el
 * valor persistido (localStorage `copp-accent` + `auth.UserPreferences`) es
 * el HEX; el provider lo aplica como `--accent-color` inline en <html> y el
 * resto de tokens (primary/soft/strong/ring/sidebar) se derivan en CSS.
 *
 * `foreground` define el color de texto sobre el acento (WCAG AA): "light"
 * para acentos oscuros, "dark" para acentos claros (ej. Ámbar).
 */
export interface AccentColorOption {
  /** Slug legible para a11y/i18n. */
  key: string;
  /** Nombre visible (key de i18n). */
  name: string;
  /** Hex #RRGGBB que se persiste y aplica. */
  hex: string;
  /** Primer plano sobre el color primario: "light" (blanco) o "dark". */
  foreground: "light" | "dark";
}

export const ACCENT_COLORS: AccentColorOption[] = [
  { key: "indigo", name: "Índigo", hex: "#4B0082", foreground: "light" },
  { key: "violeta", name: "Violeta", hex: "#7C3AED", foreground: "light" },
  { key: "azul", name: "Azul", hex: "#123B63", foreground: "light" },
  { key: "teal", name: "Teal", hex: "#0D9488", foreground: "light" },
  { key: "esmeralda", name: "Esmeralda", hex: "#10B981", foreground: "light" },
  { key: "ambar", name: "Ámbar", hex: "#F59E0B", foreground: "dark" },
];

/** Acento por defecto: el azul navy de la marca (paleta "Azul"). */
export const DEFAULT_ACCENT = "#123B63";

export const ACCENT_STORAGE_KEY = "copp-accent";

export const PRIMARY_FOREGROUND_LIGHT = "#FFFFFF";
export const PRIMARY_FOREGROUND_DARK = "#1A1D2E";

/** Acentuado activo desde su hex (null si el hex no está en la paleta). */
export function findAccentOption(hex: string): AccentColorOption | null {
  const normalized = hex.toUpperCase();
  return ACCENT_COLORS.find((c) => c.hex.toUpperCase() === normalized) ?? null;
}
