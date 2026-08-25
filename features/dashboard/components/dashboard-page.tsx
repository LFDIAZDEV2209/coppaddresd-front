import { LayoutDashboard, Users, Bot, MessageSquare, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { ActivityChart } from "./activity-chart";
import { QuickActions } from "./quick-actions";
import { AgentUsageCard } from "./agent-usage-card";
import { GrowthCard } from "./growth-card";
import { RecentActivityCard } from "./recent-activity-card";
import {
  fetchDashboardKpis,
  fetchActivityData,
  getQuickActions,
  fetchAgentUsage,
  fetchGrowthData,
  fetchRecentActivity,
} from "../services/dashboard-service";

export async function DashboardPage() {
  const [kpis, activityData, agentUsage, growthData, recentActivity] =
    await Promise.all([
      fetchDashboardKpis(),
      fetchActivityData(),
      fetchAgentUsage(),
      fetchGrowthData(),
      fetchRecentActivity(),
    ]);

  const quickActions = getQuickActions();

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      <PageHeader
        title="Resumen"
        description="Vista general de la actividad"
        icon={LayoutDashboard}
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children" aria-label="Indicadores clave">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            context={kpi.context}
            trend={kpi.trend}
            icon={kpi.icon}
            variant={kpi.id === "kpi-users" ? "info" : kpi.id === "kpi-agents" ? "success" : kpi.id === "kpi-uptime" ? "success" : "primary"}
          />
        ))}
      </section>

      {/* Activity Chart + Quick Actions */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title="Actividad semanal"
            description="Conversaciones por día"
            icon={Activity}
            variant="primary"
          />
          <div className="p-5">
            <ActivityChart data={activityData} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card xl:w-[300px]">
          <SectionHeader
            title="Acciones rápidas"
            description="Accesos directos"
            icon={LayoutDashboard}
            variant="primary"
          />
          <div className="p-4">
            <QuickActions actions={quickActions} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Métricas detalladas">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title="Uso de agentes"
            description="Consumo por agente"
            icon={Bot}
            variant="primary"
          />
          <div className="p-5">
            <AgentUsageCard data={agentUsage} />
          </div>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title="Crecimiento"
            description="Usuarios nuevos por mes"
            icon={Users}
            variant="primary"
          />
          <div className="p-5">
            <GrowthCard data={growthData} />
          </div>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title="Actividad reciente"
            description="Últimas acciones"
            icon={MessageSquare}
            variant="primary"
          />
          <div className="p-5">
            <RecentActivityCard data={recentActivity} />
          </div>
        </div>
      </section>
    </div>
  );
}
