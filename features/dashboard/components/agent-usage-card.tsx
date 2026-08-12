import type { AgentUsage } from "../types";

interface AgentUsageCardProps {
  data: AgentUsage[];
}

export function AgentUsageCard({ data }: AgentUsageCardProps) {
  const barColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="flex flex-col gap-4">
      {data.map((agent, index) => {
        const percent = (agent.usage / agent.max) * 100;
        const barColor = barColors[index % barColors.length];
        return (
          <div key={agent.name} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[12px] font-medium text-foreground">
              {agent.name}
            </span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="rounded-full transition-all duration-500"
                style={{
                  width: `${percent}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[11px] font-medium text-muted-foreground">
              {agent.usage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
