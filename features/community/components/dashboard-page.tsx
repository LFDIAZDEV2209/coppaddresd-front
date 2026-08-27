"use client";

import {
  LayoutDashboard,
  AlertTriangle,
  Image as ImageIcon,
  Trophy,
  MessageCircle,
  Users,
  Pill,
  Send,
  Flame,
  MessageSquare,
  Activity,
  PieChart,
  Clock,
  Radar,
  Video,
  Award,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
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
import { ActivityLineChart, PostTypesDoughnut, PeakHoursBar, DiagnosisRadar, ChartLegend } from "./charts";
import { MemberAvatar, profileName } from "./member-avatar";
import { RiskBadge } from "./risk-badge";
import { PostDialog } from "./post-dialog";
import { AwardDialog } from "./award-dialog";
import type { FeedKind } from "../types";

const FEED_ICON: Record<FeedKind, typeof ImageIcon> = {
  foto: ImageIcon,
  hito: Trophy,
  comentario: MessageCircle,
  grupo: Users,
  nutriobiotico: Pill,
  publicacion: Send,
  racha: Flame,
  video: Video,
  logro: Award,
};

export function DashboardPage() {
  const t = useT();
  const {
    feed,
    members,
    sendBulkInactive,
    sendMessage,
    dashboardKpis,
    dashboardActivitySeries,
    dashboardPostTypeData,
    dashboardPeakHoursData,
    dashboardDiagnosisParticipation,
    dashboardInactiveOver7Days,
    dashboardInactiveAtRisk,
    dashboardLoading,
  } = useErp();
  const inactive = members.filter((m) => m.status === "Inactivo");
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

      {/* Banner de alerta — solo si hay inactivos (umbral > 0) */}
      {dashboardInactiveOver7Days > 0 && (
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning text-white shadow-lg shadow-warning/30">
              <AlertTriangle className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-warning-foreground">
                {dashboardLoading
                  ? "..."
                  : t("8 miembros inactivos por más de 7 días", { n: String(dashboardInactiveOver7Days) })}
              </p>
              <p className="text-xs text-muted-foreground">
                {dashboardLoading
                  ? "..."
                  : t("3 de ellos están en riesgo de abandono. Envía un mensaje antes de 14 días.", { n: String(dashboardInactiveAtRisk) })}
              </p>
            </div>
          </div>
          <Button size="sm" className="relative" onClick={() => sendBulkInactive(t("¡Hola! Nos gustaría saber de ti 💙"))}>
            <Send data-icon="inline-start" />
            {t("Enviar ahora")}
          </Button>
        </div>
      )}

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

      {/* Gráficos fila 1 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
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
          <SectionHeader title={t("Tipos de publicaciones")} description={t("Distribución del mes")} icon={PieChart} variant="primary" />
          <div className="p-4">
            <PostTypesDoughnut data={dashboardPostTypeData} loading={dashboardLoading} />
            <ChartLegend items={dashboardPostTypeData.map((d) => ({ label: `${d.name} ${d.value}%`, color: "var(--chart-1)" }))} />
          </div>
        </div>
      </section>

      {/* Hora pico · Diagnóstico · Top rachas en una sola fila */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader title={t("Horario pico de actividad")} description={t("Actividad por hora (24h)")} icon={Clock} variant="primary" />
          <div className="p-4">
            <PeakHoursBar data={dashboardPeakHoursData} loading={dashboardLoading} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader title={t("Diagnóstico vs Participación")} description={t("Nivel de participación por diagnóstico")} icon={Radar} variant="primary" />
          <div className="p-4">
            <DiagnosisRadar data={dashboardDiagnosisParticipation} loading={dashboardLoading} />
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

      {/* Feed reciente + Miembros inactivos en una fila */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Feed reciente")}
          description={t("Actividad en tiempo real")}
          icon={MessageCircle}
          variant="primary"
          actions={
            <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
              <span className="size-2 animate-pulse rounded-full bg-success" />
              {t("En vivo")}
            </span>
          }
        />
        <div className="flex flex-col divide-y divide-border">
          {feed.slice(0, 6).map((item) => {
            const Icon = FEED_ICON[item.kind];
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 ${item.isNew ? "animate-feed-slide bg-primary-soft/40" : ""}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm">
                    <span className="font-semibold">{profileName(item.member, item.isSystem, t)}</span>{" "}
                    <span className="text-muted-foreground">{item.description}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
                {item.xp ? (
                  <StatusBadge status={`+${item.xp} XP`} color={{ bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }} />
                ) : null}
              </div>
            );
          })}
          {feed.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("Sin actividad reciente")}</div>
          ) : null}
        </div>
      </div>

      {/* Panel inactivos — columnas compactas para caber en mitad de ancho */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Miembros inactivos · acción requerida")}
          description={t("Envía un mensaje para reactivarlos")}
          icon={AlertTriangle}
          variant="primary"
          actions={
            <Button size="sm" onClick={() => sendBulkInactive(t("Mensaje de reactivación"))}>
              <MessageSquare data-icon="inline-start" />
              {t("Mensaje grupal")}
            </Button>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Miembro")}</TableHead>
              <TableHead className="w-[92px] text-right">{t("Días sin publicar")}</TableHead>
              <TableHead className="w-[88px] text-right">{t("Riesgo")}</TableHead>
              <TableHead className="w-[88px] text-right"><span className="sr-only">{t("Acciones")}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inactive.slice(0, 5).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="py-2">
                  <MemberAvatar member={m} subtitle={`${m.region} · ${m.diagnosis} · ${m.lastPost}`} />
                </TableCell>
                <TableCell className="py-2 text-right text-sm font-semibold text-destructive whitespace-nowrap">{m.daysSincePost} d</TableCell>
                <TableCell className="py-2 text-right">
                  <RiskBadge risk={m.risk ?? "Bajo"} />
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => sendMessage(m.id, t("¡Extrañamos tus publicaciones!"))}>
                      <Send data-icon="inline-start" />
                      {t("Enviar")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </section>
    </div>
  );
}
