import type { GrowthDataPoint } from "../types";

interface GrowthCardProps {
  data: GrowthDataPoint[];
}

export function GrowthCard({ data }: GrowthCardProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-foreground">
        Crecimiento usuarios
      </h3>

      <div className="flex flex-1 items-end gap-1.5" style={{ height: 100 }}>
        {data.map((point) => {
          const heightPercent = (point.value / maxValue) * 100;
          return (
            <div
              key={point.month}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative flex w-full flex-1 items-end justify-center">
                <div
                  className="w-[24px] rounded-t-md bg-accent transition-all duration-500 hover:bg-accent-strong hover:shadow-md hover:shadow-accent/20"
                  style={{ height: `${heightPercent}%` }}
                  title={`${point.value} usuarios`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between">
        {data.map((point) => (
          <span
            key={point.month}
            className="flex-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {point.month}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <div className="size-2 rounded-full bg-accent" />
        <span className="text-[11px] text-muted-foreground">
          Nuevos usuarios por mes
        </span>
      </div>
    </div>
  );
}
