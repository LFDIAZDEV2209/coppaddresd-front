"use client";

import { Bot, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { fetchAgents } from "../services/agents-service";
import type { Agent } from "../types";

export function AgentsPageContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents().then((res) => {
      setAgents(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Agentes"
        description="Gestión de agentes de inteligencia artificial"
        icon={Bot}
        actions={
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
          >
            <Plus className="size-[15px]" />
            Nuevo agente
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar agentes..."
            className="h-[38px] pl-9"
          />
        </div>
        <Select>
          <SelectTrigger className="h-[38px] w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          <NewAgentCard />
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusVariant =
    agent.status === "Activo"
      ? "default"
      : agent.status === "Inactivo"
        ? "destructive"
        : "secondary";

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: agent.iconBg }}
        >
          {agent.icon}
        </div>
        <div className="flex flex-1 flex-col gap-px overflow-hidden">
          <span className="text-[13px] font-semibold text-foreground truncate">
            {agent.name}
          </span>
          <span className="text-[11.5px] text-muted-foreground truncate">
            {agent.description}
          </span>
        </div>
        <Badge variant={statusVariant as "default" | "destructive" | "secondary"} className="shrink-0">
          {agent.status}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-10 text-[11px] text-muted-foreground">
          Uso
        </span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="rounded-full bg-primary transition-all duration-500"
            style={{ width: `${agent.usage}%` }}
          />
        </div>
        <span className="w-8 text-right text-[11px] text-muted-foreground">
          {agent.usage}%
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{agent.conversations.toLocaleString()} conversaciones</span>
        <span>·</span>
        <span>{agent.type}</span>
      </div>
    </div>
  );
}

function NewAgentCard() {
  return (
    <button className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
      <Plus className="size-8" />
      <span className="text-[13px] font-medium">Nuevo agente</span>
    </button>
  );
}
