import { RAINBOW_TONES, type RainbowTone, chartColor } from "@/lib/ui/rainbow";

const tones: RainbowTone[] = [...RAINBOW_TONES, "rose", "orange"];
function paintRules(tone: RainbowTone) {
  const index = RAINBOW_TONES.indexOf(tone as (typeof RAINBOW_TONES)[number]);
  const tokens = [
    chartColor(tone),
    ...(index >= 0 && index < 5 ? [`var(--chart-${index + 1})`] : []),
  ];
  return tokens
    .map((token) => {
      const paths = [
        `.recharts-bar-rectangle [fill="${token}"]`,
        `.recharts-pie-sector [fill="${token}"]`,
        `[data-slot="chart-map"] [fill="${token}"]`,
      ];
      const horizontal = paths
        .slice(0, 1)
        .map((path) => `[data-chart-axis="horizontal"] ${path}`);
      return `${paths.join(",")} { fill: url(#copp-paint-${tone}-v); }\n${horizontal.join(",")} { fill: url(#copp-paint-${tone}-h); }`;
    })
    .join("\n");
}

/** Una definición por documento. Solo pinta datos; Recharts conserva el color base para leyendas y tooltips. */
export function ChartPaints() {
  return (
    <>
      <svg
        aria-hidden="true"
        focusable="false"
        width="0"
        height="0"
        className="pointer-events-none absolute overflow-hidden"
        data-slot="chart-paints"
      >
        <defs>
          {tones.flatMap((tone) =>
            (["v", "h"] as const).map((axis) => (
              <linearGradient
                key={`${tone}-${axis}`}
                id={`copp-paint-${tone}-${axis}`}
                x1="0%"
                y1="0%"
                x2={axis === "h" ? "100%" : "0%"}
                y2={axis === "v" ? "100%" : "0%"}
                style={{ color: chartColor(tone) }}
              >
                <stop
                  offset="0%"
                  stopColor={`var(--spectrum-${tone}-bright)`}
                />
                <stop
                  offset="100%"
                  stopColor={`var(--spectrum-${tone}-deep)`}
                />
              </linearGradient>
            )),
          )}
        </defs>
      </svg>
      <style>{tones.map(paintRules).join("\n")}</style>
    </>
  );
}
