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
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPanel } from "./dashboard-panel";
import { DashboardMetric } from "./dashboard-metric";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityChart } from "./activity-chart";
import { QuickActions } from "./quick-actions";
import { AgentUsageCard } from "./agent-usage-card";
import { GrowthCard } from "./growth-card";
import { RecentActivityCard } from "./recent-activity-card";
import { useI18n } from "@/providers/i18n-provider";
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

export function DashboardPage() {
  const { t, lang } = useI18n();
  const formatCount = (value: number) =>
    value.toLocaleString(lang === "en" ? "en-US" : "es-CO");

  // KPIs reales del Home (GET /api/v1/dashboard/kpis). Ante fallo del backend
  // degrada a null + error: la página muestra "—" y el banner, sin romperse.
  const {
    data: kpis,
    loading: kpisLoading,
    error,
    refetch,
  } = useDashboardKpis();

  // Tarjetas conectadas a analytics de pacientes y ejecuciones reales de agentes.
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([]);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    try {
      const [agentUsageData, growthDataResult, recentActivityResult] =
        await Promise.allSettled([
          fetchAgentUsage(),
          fetchGrowthData(),
          fetchRecentActivity(),
        ]);
      setAgentUsage(
        agentUsageData.status === "fulfilled" ? agentUsageData.value : [],
      );
      setGrowthData(
        growthDataResult.status === "fulfilled" ? growthDataResult.value : [],
      );
      setRecentActivity(
        recentActivityResult.status === "fulfilled"
          ? recentActivityResult.value
          : [],
      );
      setDetailsError(
        [agentUsageData, growthDataResult, recentActivityResult].some(
          (result) => result.status === "rejected",
        ),
      );
      setQuickActions(getQuickActions());
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const refresh = async () => {
    setRefreshing(true);
    refetch();
    try {
      await loadDetails();
    } finally {
      setRefreshing(false);
    }
  };
  const isRefreshing = refreshing || kpisLoading;

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

  if ((kpisLoading && !kpis) || detailsLoading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="@container/dashboard flex min-w-0 flex-col gap-5 p-4 sm:p-6">
      <header className="bg-brand-gradient flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4 text-white shadow-sm">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10"
        >
          <LayoutDashboard className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight">
            {t("Resumen")}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {t("Vista general de la actividad")}
          </p>
        </div>
        <Button
          variant="secondary"
          size="comfortable"
          className="w-full @min-[500px]/dashboard:w-auto"
          onClick={() => void refresh()}
          disabled={isRefreshing}
        >
          <RefreshCw
            aria-hidden="true"
            className={
              isRefreshing
                ? "size-4 animate-spin motion-reduce:animate-none"
                : "size-4"
            }
          />
          {isRefreshing ? t("Actualizando...") : t("Actualizar")}
        </Button>
      </header>

      {(error || detailsError) && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {(error && t(error)) ||
            t("No se pudieron cargar todas las métricas. Intenta de nuevo.")}
        </p>
      )}

      <section
        className="grid grid-cols-1 gap-3 @min-[460px]/dashboard:grid-cols-2 @min-[1000px]/dashboard:grid-cols-4"
        aria-label={t("Indicadores clave")}
      >
        <DashboardMetric
          label={t("Total de pacientes")}
          value={kpis ? formatCount(kpis.totalPatients) : "—"}
          icon={Users}
          tone="blue"
        />
        <DashboardMetric
          label={t("Pacientes nuevos (30 días)")}
          value={kpis ? formatCount(kpis.newPatients30d) : "—"}
          icon={UserPlus}
          tone="teal"
        />
        <DashboardMetric
          label={t("Tests de salud (30 días)")}
          value={kpis ? formatCount(kpis.healthTests30d) : "—"}
          icon={Activity}
          tone="navy"
        />
        <DashboardMetric
          label={t("Movimientos de inventario (30 días)")}
          value={
            kpis
              ? formatCount(kpis.inventoryEntries30d + kpis.inventoryExits30d)
              : "—"
          }
          icon={Package}
          tone="warm"
          context={
            kpis
              ? t("{entradas} entradas · {salidas} salidas", {
                  entradas: formatCount(kpis.inventoryEntries30d),
                  salidas: formatCount(kpis.inventoryExits30d),
                })
              : undefined
          }
        />
      </section>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-brand-blue-soft/30 bg-card px-4 py-3">
        <div className="flex w-full items-center gap-2 @min-[700px]/dashboard:w-auto">
          <div>
            <h2 className="text-xs font-semibold text-primary-soft-foreground">
              {t("Acciones rápidas")}
            </h2>
          </div>
        </div>
        <QuickActions actions={quickActions} />
      </section>

      <div className="grid grid-cols-1 items-stretch gap-5 @min-[950px]/dashboard:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DashboardPanel
          accent="sky"
          title={t("Actividad (30 días)")}
          description={t("Registros diarios del equipo")}
          icon={Activity}
          actions={
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/90">
              {t("Total")}{" "}
              <b className="ml-1 tabular-nums text-white">
                {formatCount(
                  activityData.reduce((sum, point) => sum + point.value, 0),
                )}
              </b>
            </span>
          }
        >
          <ActivityChart data={activityData} />
        </DashboardPanel>
        <DashboardPanel
          accent="violet"
          title={t("Uso de agentes")}
          description={t("Ejecuciones por agente (30 días)")}
          icon={Bot}
        >
          <AgentUsageCard data={agentUsage} />
        </DashboardPanel>
      </div>

      <section
        aria-label={t("Métricas detalladas")}
        className="flex min-w-0 flex-col gap-5"
      >
        <DashboardPanel
          accent="teal"
          title={t("Crecimiento")}
          description={t("Pacientes nuevos por mes")}
          icon={Users}
        >
          <GrowthCard data={growthData} height={220} />
          {growthData.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-2 @min-[600px]/dashboard:grid-cols-3">
              {[
                {
                  label: t("Pacientes nuevos (6 meses)"),
                  value: growthData.reduce(
                    (sum, point) => sum + point.value,
                    0,
                  ),
                },
                { label: t("Último mes"), value: growthData.at(-1)!.value },
                {
                  label: t("Mes anterior"),
                  value: growthData.at(-2)?.value ?? null,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/70 bg-background/35 px-3 py-2"
                >
                  <dt className="text-xs text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold tabular-nums text-primary-soft-foreground">
                    {item.value === null ? "—" : formatCount(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DashboardPanel>
        <DashboardPanel
          accent="amber"
          title={t("Ejecuciones recientes de IA")}
          description={t("Últimas acciones")}
          icon={MessageSquare}
        >
          <RecentActivityCard data={recentActivity} />
        </DashboardPanel>
      </section>
    </div>
  );
}

function DashboardPageSkeleton() {
  return (
    <div
      className="@container/dashboard flex min-w-0 flex-col gap-5 p-4 sm:p-6"
      aria-busy="true"
    >
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 @min-[460px]/dashboard:grid-cols-2 @min-[1000px]/dashboard:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[66px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 @min-[950px]/dashboard:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[400px] rounded-2xl" />
        <Skeleton className="h-[380px] rounded-2xl" />
      </div>
      <Skeleton className="h-[440px] w-full rounded-2xl" />
      <Skeleton className="h-[340px] w-full rounded-2xl" />
    </div>
  );
}
