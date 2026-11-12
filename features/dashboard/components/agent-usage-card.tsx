"use client";

import { RAINBOW_GRADIENTS } from "@/lib/ui/rainbow";

import { useI18n } from "@/providers/i18n-provider";
import type { AgentUsage } from "../types";

interface AgentUsageCardProps {
  data: AgentUsage[];
}

const AGENT_GRADIENTS = RAINBOW_GRADIENTS;

export function AgentUsageCard({ data }: AgentUsageCardProps) {
  const { t, lang } = useI18n();
  const number = new Intl.NumberFormat(lang === "en" ? "en-US" : "es-CO");
  const ranked = [...data].sort((a, b) => b.usage - a.usage);

  if (ranked.length === 0) {
    return (
      <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
        {t("Sin ejecuciones de agentes")}
      </p>
    );
  }

  return (
    <ol className="flex flex-1 flex-col justify-between gap-4">
      {ranked.map((agent, index) => {
        const max = Math.max(1, agent.max, agent.usage);
        const colors = AGENT_GRADIENTS[index % AGENT_GRADIENTS.length];
        return (
          <li
            key={agent.name}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-2"
          >
            <span
              aria-hidden="true"
              className="flex size-5 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground"
            >
              {index + 1}
            </span>
            <span className="min-w-0 text-xs leading-5 font-medium text-foreground [overflow-wrap:anywhere]">
              {agent.name}
            </span>
            <span className="text-right text-xs leading-5 font-semibold tabular-nums text-foreground">
              {number.format(agent.usage)}
            </span>
            <div
              role="meter"
              aria-label={agent.name}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={agent.usage}
              aria-valuetext={t("{count} ejecuciones", {
                count: number.format(agent.usage),
              })}
              className="col-start-2 col-end-4 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="bar-grow-x h-full rounded-full"
                style={{
                  width: `${(agent.usage / max) * 100}%`,
                  backgroundImage: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
