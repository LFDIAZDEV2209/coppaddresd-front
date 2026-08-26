import { useT } from "@/providers/i18n-provider";
import type { ActivityDataPoint } from "../types";

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const t = useT();
  const maxValue = Math.max(...data.map((d) => d.value));

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
          const heightPercent = (point.value / maxValue) * 100;
          const barColor = barColors[index % barColors.length];
          return (
            <div
              key={point.day}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex w-full items-end justify-center" style={{ height: 200 }}>
                <div
                  className="w-[36px] rounded-t-lg transition-all duration-500 ease-out hover:shadow-lg"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 4px 12px ${barColor}30`,
                  }}
                  title={t('{count} conversaciones', { count: String(point.value) })}
                />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {point.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
