import { UserPlus, Bot as BotIcon, ShieldCheck, ScrollText } from "lucide-react";
import { fetchActiveAgentTypes, fetchExecutions } from "@/features/agents/services/agents-service";
import { fetchPatientDashboard } from "@/features/patients/services/patients-service";
import type { QuickAction, AgentUsage, GrowthDataPoint, ActivityEvent } from "../types";

export function getQuickActions(): QuickAction[] {
  return [
    { label: "Crear usuario", href: "/users?action=create", icon: UserPlus },
    { label: "Crear agente", href: "/agents?action=create", icon: BotIcon },
    { label: "Administrar roles", href: "/roles", icon: ShieldCheck },
    { label: "Ver auditoría", href: "/settings/audit", icon: ScrollText },
  ];
}

/** Conteos reales de ejecuciones por agente activo en los últimos 30 días. */
export async function fetchAgentUsage(): Promise<AgentUsage[]> {
  const agents = await fetchActiveAgentTypes();
  const fromDate = new Date(Date.now() - 30 * 86400000).toISOString();
  const counts = await Promise.all(agents.map(async agent => ({
    name: agent.name, usage: (await fetchExecutions({ agentTypeId: agent.id, fromDate, limit: 1 })).total,
  })));
  const max = Math.max(1, ...counts.map(row => row.usage));
  return counts.sort((a, b) => b.usage - a.usage).slice(0, 6).map(row => ({ ...row, max }));
}

export async function fetchGrowthData(): Promise<GrowthDataPoint[]> {
  const dashboard = await fetchPatientDashboard(null, 6);
  return dashboard.newPatientsByMonth.map(point => ({ month: `${point.year}-${String(point.month).padStart(2, "0")}`, value: point.count }));
}

export async function fetchRecentActivity(): Promise<ActivityEvent[]> {
  const [agents, executions] = await Promise.all([fetchActiveAgentTypes(), fetchExecutions({ limit: 5 })]);
  const names = new Map(agents.map(agent => [agent.id, agent.name]));
  return executions.items.map(execution => ({
    id: execution.id, user: names.get(execution.agentTypeId) ?? execution.agentTypeId,
    initials: "IA", action: execution.status, time: execution.createdAt,
  }));
}
