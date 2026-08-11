import type { ActivityDataPoint } from "../types";

interface ActivityChartProps {
  data: ActivityDataPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-0">
      <div className="flex w-10 shrink-0 flex-col-reverse items-end justify-between pb-8 text-[10px] text-muted-foreground">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>

      <div className="flex flex-1 items-end gap-2">
        {data.map((point) => {
          const heightPercent = (point.value / maxValue) * 100;
          return (
            <div
              key={point.day}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex w-full items-end justify-center" style={{ height: 200 }}>
                <div
                  className="w-[36px] rounded-t-lg bg-primary transition-all duration-500 ease-out hover:bg-primary-strong hover:shadow-lg hover:shadow-primary/20"
                  style={{ height: `${heightPercent}%` }}
                  title={`${point.value} conversaciones`}
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
