import { useT } from "@/providers/i18n-provider";
import type { ActivityDataPoint } from "../types";

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

/**
 * Gráfica de barras de actividad diaria (una barra por día del período).
 * Soporta series largas (p. ej. 30 puntos del endpoint de KPIs): el ancho de
 * barra es fluido y las etiquetas de día se espacian para no colisionar.
 */
export function ActivityChart({ data }: ActivityChartProps) {
  const t = useT();

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
        {t("Sin actividad en el período")}
      </div>
    );
  }

  const maxValue = Math.max(0, ...data.map((d) => d.value));
  // Con series largas se etiqueta una fracción de los días (máx. ~12 etiquetas).
  const labelEvery = data.length > 12 ? Math.ceil(data.length / 12) : 1;

  const barColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-1)",
    "var(--chart-2)",
  ];

  return (
    <div className="flex items-end gap-0">
      <div className="flex w-10 shrink-0 flex-col-reverse items-end justify-between pb-8 text-[10px] text-muted-foreground">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>

      <div className="flex flex-1 items-end gap-2">
        {data.map((point, index) => {
          const heightPercent = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
          const barColor = barColors[index % barColors.length];
          return (
            <div
              key={`${point.day}-${index}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex w-full items-end justify-center" style={{ height: 200 }}>
                <div
                  className="w-full max-w-[36px] rounded-t-lg transition-all duration-500 ease-out hover:shadow-lg"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 4px 12px ${barColor}30`,
                  }}
                  title={t("{count} registros", { count: String(point.value) })}
                />
              </div>
              <span className="max-w-full truncate text-[11px] font-medium text-muted-foreground">
                {index % labelEvery === 0 ? point.day : "\u00A0"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
