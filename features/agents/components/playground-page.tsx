"use client";

import { ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAgentType } from "../services/agents-service";
import type { AgentType } from "../types";
import { Playground } from "./playground";
import { getAgentIconOption } from "./agent-icon-picker";

export function PlaygroundPage({ agentTypeId }: { agentTypeId: string }) {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const type = await fetchAgentType(agentTypeId);
        if (!active) return;
        setAgent(type);
      } catch {
        if (!active) return;
        setError("No se pudo cargar el agente.");
      }
    })();
    return () => {
      active = false;
    };
  }, [agentTypeId]);

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
        <Button variant="outline" className="w-fit" onClick={() => router.push("/agents")}>
          <ArrowLeft data-icon="inline-start" />
          Volver a agentes
        </Button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  const icon = getAgentIconOption(agent.iconKey);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => router.push(`/agents/${agent.id}`)}
            aria-label="Volver al detalle del agente"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: icon.bg }}
          >
            <icon.icon className="size-5" style={{ color: icon.color }} />
          </span>
          <div className="flex flex-col gap-px">
            <span className="text-sm font-semibold">Demo · {agent.name}</span>
            <span className="text-[12px] text-muted-foreground">
              Probá el agente en vivo: instrucciones, herramientas y conocimiento.
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
          <Play className="size-3.5 text-emerald-600" />
          Modo demo
        </Button>
      </div>

      <Playground agent={agent} demoUserId="demo-admin-user" />
    </div>
  );
}
