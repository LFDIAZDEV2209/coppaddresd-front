import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "./kpi-card";
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
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Resumen"
        description="Vista general de la actividad"
        icon={LayoutDashboard}
      />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores clave"
      >
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} data={kpi} />
        ))}
      </section>

      <section className="flex flex-col gap-4 xl:flex-row" aria-label="Actividad y acciones">
        <div className="flex flex-1 flex-col gap-4">
          <ActivityChart data={activityData} />
        </div>
        <QuickActions actions={quickActions} />
      </section>

      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-label="Métricas detalladas"
      >
        <AgentUsageCard data={agentUsage} />
        <GrowthCard data={growthData} />
        <RecentActivityCard data={recentActivity} />
      </section>
    </div>
  );
}
