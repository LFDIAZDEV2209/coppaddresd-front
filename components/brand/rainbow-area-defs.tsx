import { RAINBOW_SERIES } from "@/lib/ui/rainbow";

/** Definiciones SVG reutilizables para una serie temporal única. El id evita colisiones entre tarjetas. */
export function RainbowAreaDefs({ id }: { id: string }) {
  const colors = RAINBOW_SERIES.slice(0, 6);
  return (
    <defs>
      <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
        {colors.map((color, index) => (
          <stop
            key={color}
            offset={`${(index / (colors.length - 1)) * 100}%`}
            stopColor={color}
          />
        ))}
      </linearGradient>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="0">
        {colors.map((color, index) => (
          <stop
            key={color}
            offset={`${(index / (colors.length - 1)) * 100}%`}
            stopColor={color}
            stopOpacity={0.15}
          />
        ))}
      </linearGradient>
    </defs>
  );
}
