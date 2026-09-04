"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { ActivityChart } from "./activity-chart";
import { QuickActions } from "./quick-actions";
import { AgentUsageCard } from "./agent-usage-card";
import { GrowthCard } from "./growth-card";
import { RecentActivityCard } from "./recent-activity-card";
import { useT } from "@/providers/i18n-provider";
import {
  fetchDashboardKpis,
  fetchActivityData,
  getQuickActions,
  fetchAgentUsage,
  fetchGrowthData,
  fetchRecentActivity,
} from "../services/dashboard-service";
import type {
  KpiData,
  ActivityDataPoint,
  AgentUsage,
  GrowthDataPoint,
  ActivityEvent,
  QuickAction,
} from "../types";

export function DashboardPage() {
  const t = useT();
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([]);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [
        kpisData,
        activityDataResult,
        agentUsageData,
        growthDataResult,
        recentActivityResult,
      ] = await Promise.all([
        fetchDashboardKpis(),
        fetchActivityData(),
        fetchAgentUsage(),
        fetchGrowthData(),
        fetchRecentActivity(),
      ]);
      setKpis(kpisData);
      setActivityData(activityDataResult);
      setAgentUsage(agentUsageData);
      setGrowthData(growthDataResult);
      setRecentActivity(recentActivityResult);
      setQuickActions(getQuickActions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      <PageHeader
        title={t("Resumen")}
        description={t("Vista general de la actividad")}
        icon={LayoutDashboard}
      />

      {/* KPI Cards */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children"
        aria-label={t("Indicadores clave")}
      >
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            context={kpi.context}
            trend={kpi.trend}
            icon={kpi.icon}
            variant={
              kpi.id === "kpi-users"
                ? "info"
                : kpi.id === "kpi-agents"
                  ? "success"
                  : kpi.id === "kpi-uptime"
                    ? "success"
                    : "primary"
            }
          />
        ))}
      </section>

      {/* Activity Chart + Quick Actions */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Actividad semanal")}
            description={t("Conversaciones por día")}
            icon={Activity}
            variant="primary"
          />
          <div className="p-5">
            <ActivityChart data={activityData} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card xl:w-[300px]">
          <SectionHeader
            title={t("Acciones rápidas")}
            description={t("Accesos directos")}
            icon={LayoutDashboard}
            variant="primary"
          />
          <div className="p-4">
            <QuickActions actions={quickActions} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-label={t("Métricas detalladas")}
      >
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Uso de agentes")}
            description={t("Consumo por agente")}
            icon={Bot}
            variant="primary"
          />
          <div className="p-5">
            <AgentUsageCard data={agentUsage} />
          </div>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Crecimiento")}
            description={t("Usuarios nuevos por mes")}
            icon={Users}
            variant="primary"
          />
          <div className="p-5">
            <GrowthCard data={growthData} />
          </div>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Actividad reciente")}
            description={t("Últimas acciones")}
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
