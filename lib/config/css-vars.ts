/**
 * Lectura de variables CSS en runtime para componentes que necesitan un
 * color concreto (no pueden usar `bg-primary` etc.): p. ej. FullCalendar
 * (inline styles), stat-cards y dots de la sala virtual. Los tokens derivan
 * del acento activo, por lo que re-leer en cada render refleja el acento.
 */
export function readCssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Mezcla un hex con blanco (amount 0..1) en runtime — para superficies que
 * siempre son oscuras (p. ej. la sala virtual) y necesitan una variante
 * clara del acento sin depender del tema activo.
 */
export function lightenHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const channel = (start: number) => {
    const value = parseInt(h.slice(start, start + 2), 16);
    return Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}
