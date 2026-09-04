"use client";

import { useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { ChartTooltip } from "@/components/brand/chart-tooltip";
import { cn } from "@/lib/utils";
import type { AgentUsage } from "../types";

interface AgentUsageCardProps {
  data: AgentUsage[];
}

/**
 * Ranking de consumo por agente: badge de posición (#1 en teal), barra
 * que crece al cargar, hover acentúa + atenúa el resto, tooltip con
 * porcentaje y ranking.
 */
export function AgentUsageCard({ data }: AgentUsageCardProps) {
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const ranking = [...data]
    .sort((a, b) => b.usage - a.usage)
    .map((a) => a.name);

  return (
    <div className="flex flex-col gap-3.5 py-1">
      {data.map((agent, index) => {
        const percent = Math.min((agent.usage / agent.max) * 100, 100);
        const isHovered = hovered === index;
        const rank = ranking.indexOf(agent.name) + 1;

        return (
          <div
            key={agent.name}
            className="relative flex cursor-default items-center gap-2.5"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <ChartTooltip
              visible={isHovered}
              align="center"
              placement={index < 3 ? "bottom" : "top"}
              title={agent.name}
              label={t("de uso")}
              value={`${agent.usage}%`}
              extra={t("{rank}º en uso", { rank: String(rank) })}
            />
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold transition-colors duration-200",
                rank === 1
                  ? "bg-brand-teal text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {rank}
            </span>
            <span
              className={cn(
                "w-16 shrink-0 truncate text-[12px] transition-colors duration-200",
                isHovered
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/85",
              )}
            >
              {agent.name}
            </span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "bar-grow-x rounded-full transition-all duration-200",
                  isHovered ? "bg-brand-gradient" : "bg-brand-navy/85",
                  hovered !== null && !isHovered && "opacity-35",
                )}
                style={{
                  width: `${percent}%`,
                  animationDelay: `${index * 70}ms`,
                }}
              />
            </div>
            <span
              className={cn(
                "w-10 shrink-0 text-right text-[11px] tabular-nums transition-colors duration-200",
                isHovered
                  ? "font-bold text-brand-teal"
                  : "font-semibold text-muted-foreground",
              )}
            >
              {agent.usage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
