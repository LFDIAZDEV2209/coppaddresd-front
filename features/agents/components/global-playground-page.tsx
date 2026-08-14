"use client";

import { useState } from "react";
import { Bot, Play, ChevronDown, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentType } from "../types";
import { useAgents } from "../hooks/use-agents";
import { Playground } from "./playground";
import { getAgentIconOption } from "./agent-icon-picker";

function AgentPicker({
  agents,
  selected,
  onSelect,
}: {
  agents: AgentType[];
  selected: AgentType | null;
  onSelect: (agent: AgentType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Bot className="size-4" />
            {selected ? selected.name : "Elegir agente"}
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-72">
        {agents.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
            No hay agentes creados todavía.
          </p>
        ) : (
          agents.map((agent) => {
            const icon = getAgentIconOption(agent.iconKey);
            const isSelected = selected?.id === agent.id;
            return (
              <DropdownMenuItem
                key={agent.id}
                onSelect={() => onSelect(agent)}
                className="flex items-center gap-2.5"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: icon.bg }}
                >
                  <icon.icon className="size-4" style={{ color: icon.color }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {agent.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {agent.specialty ?? agent.description ?? "Sin descripción"} · v
                    {agent.activeVersionNumber ?? "—"}
                  </span>
                </span>
                {isSelected && <Check className="size-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GlobalPlaygroundPage() {
  const { agents, loading } = useAgents(100);
  const [selected, setSelected] = useState<AgentType | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Playground"
        description="Probá cualquier agente en vivo: instrucciones, herramientas y conocimiento"
        icon={Play}
        actions={
          <AgentPicker agents={agents} selected={selected} onSelect={setSelected} />
        }
      />

      {selected ? (
        <Playground agent={selected} demoUserId="demo-admin-user" />
      ) : (
        <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Bot className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Elegí un agente para probar</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              Seleccioná un agente de la lista y conversá con él en tiempo real.
            </p>
          </div>
          <AgentPicker agents={agents} selected={selected} onSelect={setSelected} />
        </div>
      )}
    </div>
  );
}
