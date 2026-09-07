"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  Activity,
  UserPlus,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityChart } from "./activity-chart";
import { QuickActions } from "./quick-actions";
import { AgentUsageCard } from "./agent-usage-card";
import { GrowthCard } from "./growth-card";
import { RecentActivityCard } from "./recent-activity-card";
import { useT } from "@/providers/i18n-provider";
import { useDashboardKpis } from "../hooks/use-dashboard-kpis";
import {
  getQuickActions,
  fetchAgentUsage,
  fetchGrowthData,
  fetchRecentActivity,
} from "../services/dashboard-service";
import type {
  ActivityDataPoint,
  AgentUsage,
  GrowthDataPoint,
  ActivityEvent,
  QuickAction,
} from "../types";

// Formato de conteos con separador de miles del español ("1.284").
function formatCount(value: number): string {
  return value.toLocaleString("es-AR");
}

export function DashboardPage() {
  const t = useT();

  // KPIs reales del Home (GET /api/v1/dashboard/kpis). Ante fallo del backend
  // degrada a null + error: la página muestra "—" y el banner, sin romperse.
  const { data: kpis, loading: kpisLoading, error } = useDashboardKpis();

  // Tarjetas inferiores (uso de agentes, crecimiento, actividad reciente y
  // accesos rápidos) siguen siendo mock — fuera de alcance de esta iteración.
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([]);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [mocksLoading, setMocksLoading] = useState(true);

  const loadMockData = useCallback(async () => {
    try {
      const [agentUsageData, growthDataResult, recentActivityResult] =
        await Promise.all([
          fetchAgentUsage(),
          fetchGrowthData(),
          fetchRecentActivity(),
        ]);
      setAgentUsage(agentUsageData);
      setGrowthData(growthDataResult);
      setRecentActivity(recentActivityResult);
      setQuickActions(getQuickActions());
    } finally {
      setMocksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMockData();
  }, [loadMockData]);

  // Serie diaria para la gráfica: el backend trae una entrada por día con los
  // conteos por módulo; se agregan en "registros del día" (pacientes, tests,
  // entradas/salidas de inventario y tareas de programa).
  const activityData = useMemo<ActivityDataPoint[]>(
    () =>
      (kpis?.activitySeries30d ?? []).map((point) => ({
        day: point.date,
        value:
          point.newPatients +
          point.tests +
          point.entries +
          point.exits +
          point.programTasks,
      })),
    [kpis],
  );

  if ((kpisLoading && !kpis) || mocksLoading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      <PageHeader
        title={t("Resumen")}
        description={t("Vista general de la actividad")}
        icon={LayoutDashboard}
      />

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* KPI Cards — valores reales del endpoint de KPIs */}
      {/* Nota i18n: los labels de datos siguen el patrón legado del módulo
          (strings en español directos, como los del mock anterior). */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children"
        aria-label={t("Indicadores clave")}
      >
        <StatCard
          label="Total de pacientes"
          value={kpis ? formatCount(kpis.totalPatients) : "—"}
          icon={Users}
          variant="info"
        />
        <StatCard
          label="Pacientes nuevos (30 días)"
          value={kpis ? formatCount(kpis.newPatients30d) : "—"}
          icon={UserPlus}
          variant="success"
        />
        <StatCard
          label="Tests de salud (30 días)"
          value={kpis ? formatCount(kpis.healthTests30d) : "—"}
          icon={Activity}
          variant="primary"
        />
        <StatCard
          label="Movimientos de inventario (30 días)"
          value={
            kpis
              ? formatCount(kpis.inventoryEntries30d + kpis.inventoryExits30d)
              : "—"
          }
          icon={Package}
          variant="warning"
          context={
            kpis
              ? `${formatCount(kpis.inventoryEntries30d)} entradas · ${formatCount(kpis.inventoryExits30d)} salidas`
              : undefined
          }
        />
      </section>

      {/* Activity Chart (serie real) + Quick Actions (mock) */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Actividad (30 días)")}
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
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label={t("Métricas detalladas")}>
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

function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-[76px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-4 xl:flex-row">
        <Skeleton className="h-[320px] flex-1 rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl xl:w-[300px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
