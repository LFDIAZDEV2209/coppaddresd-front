"use client";

import {
  LayoutDashboard,
  Flame,
  Activity,
  PieChart,
  Clock,
  Radar,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { ActivityLineChart, PostTypesDoughnut, PeakHoursBar, DiagnosisRadar, ChartLegend, CHART_COLORS } from "./charts";
import { MemberAvatar } from "./member-avatar";
import { PostDialog } from "./post-dialog";
import { AwardDialog } from "./award-dialog";

export function DashboardPage() {
  const t = useT();
  const {
    members,
    dashboardKpis,
    dashboardActivitySeries,
    dashboardPostTypeData,
    dashboardPeakHoursData,
    dashboardDiagnosisParticipation,
    dashboardLoading,
  } = useErp();
  const topStreaks = [...members].sort((a, b) => b.streak - a.streak).slice(0, 5);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Panel de comunidad")}
        description={t("Visión general de la actividad de ANTARES Comunidad ADRED")}
        icon={LayoutDashboard}
        actions={
          <>
            <PostDialog />
            <AwardDialog />
          </>
        }
      />

      {/* KPIs — datos reales del dashboard */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
                <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))
          : dashboardKpis.map((kpi) => (
              <StatCard
                key={kpi.label}
                label={t(kpi.label)}
                value={kpi.value}
                context={kpi.context ? t(kpi.context) : undefined}
                trend={kpi.trend}
                icon={LayoutDashboard}
                variant="info"
              />
            ))}
      </section>

      {/* Gráficos fila 1 — 50/25/25 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
          <SectionHeader title={t("Actividad (30 días)")} description={t("Posts, comentarios y reacciones")} icon={Activity} variant="primary" />
          <div className="p-4">
            <ActivityLineChart data={dashboardActivitySeries} loading={dashboardLoading} />
            <ChartLegend
              items={[
                { label: t("Posts"), color: "var(--chart-1)" },
                { label: t("Comentarios"), color: "var(--chart-2)" },
                { label: t("Reacciones"), color: "var(--chart-3)" },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader title={t("Diagnóstico vs Participación")} description={t("Nivel de participación por diagnóstico")} icon={Radar} variant="primary" />
          <div className="p-4">
            <DiagnosisRadar data={dashboardDiagnosisParticipation} loading={dashboardLoading} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader title={t("Tipos de publicaciones")} description={t("Distribución del mes")} icon={PieChart} variant="primary" />
          <div className="p-4">
            <PostTypesDoughnut data={dashboardPostTypeData} loading={dashboardLoading} />
            <ChartLegend items={dashboardPostTypeData.map((d, i) => ({ label: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }))} />
          </div>
        </div>
      </section>

      {/* Hora pico · Top rachas */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader title={t("Horario pico de actividad")} description={t("Actividad por hora (24h)")} icon={Clock} variant="primary" />
          <div className="px-4 pt-4 pb-1">
            <PeakHoursBar data={dashboardPeakHoursData} loading={dashboardLoading} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader title={t("Top rachas activas")} description={t("Miembros con mayor racha")} icon={Flame} variant="primary" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-0">{t("Miembro")}</TableHead>
                <TableHead className="w-[72px] text-right">{t("Racha")}</TableHead>
                <TableHead className="w-[92px] text-right">{t("XP")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStreaks.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className="py-2">
                    <MemberAvatar member={m} showStreak subtitle={`${m.region} · ${m.diagnosis}`} />
                  </TableCell>
                  <TableCell className="py-2 text-right text-sm font-semibold whitespace-nowrap">🔥 {m.streak}</TableCell>
                  <TableCell className="py-2 text-right text-sm whitespace-nowrap">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""} {m.xp.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
