import {
  Users,
  Bot,
  MessageSquare,
  Activity,
  UserPlus,
  Bot as BotIcon,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import type {
  KpiData,
  ActivityDataPoint,
  QuickAction,
  AgentUsage,
  GrowthDataPoint,
  ActivityEvent,
} from "../types";

export async function fetchDashboardKpis(): Promise<KpiData[]> {
  await simulateDelay(400);

  return [
    {
      id: "kpi-users",
      label: "Total de usuarios",
      value: "12.847",
      context: "+124 esta semana",
      trend: { value: "+12,4%", direction: "up" },
      icon: Users,
      iconColor: "#155E75",
      iconBg: "#E6F7FB",
    },
    {
      id: "kpi-agents",
      label: "Agentes activos",
      value: "24",
      context: "3 nuevos este mes",
      trend: { value: "+8,3%", direction: "up" },
      icon: Bot,
      iconColor: "#047857",
      iconBg: "#E6F7EF",
    },
    {
      id: "kpi-conversations",
      label: "Conversaciones hoy",
      value: "1.284",
      context: "Promedio: 1.100/día",
      trend: { value: "+16,7%", direction: "up" },
      icon: MessageSquare,
      iconColor: "#155E75",
      iconBg: "#E5F0FA",
    },
    {
      id: "kpi-uptime",
      label: "Disponibilidad",
      value: "99,8%",
      context: "Últimos 30 días",
      trend: { value: "+0,2%", direction: "up" },
      icon: Activity,
      iconColor: "#047857",
      iconBg: "#E6F7EF",
    },
  ];
}

export async function fetchActivityData(): Promise<ActivityDataPoint[]> {
  await simulateDelay(300);

  return [
    { day: "Lun", value: 51 },
    { day: "Mar", value: 65 },
    { day: "Mié", value: 80 },
    { day: "Jue", value: 89 },
    { day: "Vie", value: 76 },
    { day: "Sáb", value: 54 },
    { day: "Dom", value: 59 },
  ];
}

export function getQuickActions(): QuickAction[] {
  return [
    { label: "Crear usuario", href: "/users?action=create", icon: UserPlus },
    { label: "Crear agente", href: "/agents?action=create", icon: BotIcon },
    { label: "Administrar roles", href: "/roles", icon: ShieldCheck },
    { label: "Ver auditoría", href: "/settings/audit", icon: ScrollText },
  ];
}

export async function fetchAgentUsage(): Promise<AgentUsage[]> {
  await simulateDelay(350);

  return [
    { name: "MediBot", usage: 87, max: 100 },
    { name: "SanaIA", usage: 74, max: 100 },
    { name: "CliniQ", usage: 60, max: 100 },
    { name: "DiagPro", usage: 48, max: 100 },
    { name: "AsistIA", usage: 35, max: 100 },
    { name: "DocFlow", usage: 21, max: 100 },
  ];
}

export async function fetchGrowthData(): Promise<GrowthDataPoint[]> {
  await simulateDelay(300);

  return [
    { month: "Ene", value: 26 },
    { month: "Feb", value: 33 },
    { month: "Mar", value: 29 },
    { month: "Abr", value: 42 },
    { month: "May", value: 49 },
    { month: "Jun", value: 62 },
    { month: "Jul", value: 72 },
  ];
}

export async function fetchRecentActivity(): Promise<ActivityEvent[]> {
  await simulateDelay(250);

  return [
    {
      id: "evt-1",
      user: "María García",
      initials: "MG",
      action: "Creó un nuevo agente de IA",
      time: "Hace 12 min",
    },
    {
      id: "evt-2",
      user: "Luis Pérez",
      initials: "LP",
      action: "Actualizó permisos de rol Soporte",
      time: "Hace 34 min",
    },
    {
      id: "evt-3",
      user: "Ana Torres",
      initials: "AT",
      action: "Revisó auditoría de seguridad",
      time: "Hace 1h",
    },
    {
      id: "evt-4",
      user: "Carlos Ruiz",
      initials: "CR",
      action: "Configuró integración con CRM",
      time: "Hace 2h",
    },
  ];
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
