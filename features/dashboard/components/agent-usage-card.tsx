import type { AgentUsage } from "../types";

interface AgentUsageCardProps {
  data: AgentUsage[];
}

export function AgentUsageCard({ data }: AgentUsageCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-foreground">
        Uso de agentes
      </h3>

      <div className="flex flex-col gap-4">
        {data.map((agent) => {
          const percent = (agent.usage / agent.max) * 100;
          return (
            <div key={agent.name} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[12px] font-medium text-foreground">
                {agent.name}
              </span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[11px] font-medium text-muted-foreground">
                {agent.usage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
