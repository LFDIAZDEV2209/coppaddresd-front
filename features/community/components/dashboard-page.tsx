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
import { dashboardKpis, activitySeries, postTypeData, peakHoursData, diagnosisParticipation } from "../mock-data";
import { ActivityLineChart, PostTypesDoughnut, PeakHoursBar, DiagnosisRadar, ChartLegend } from "./charts";
import { MemberAvatar } from "./member-avatar";
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
  const { feed, members, sendBulkInactive, sendMessage } = useErp();
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

      {/* Banner de alerta */}
      <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning text-white">
            <AlertTriangle className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-warning-foreground">
              {t("8 miembros inactivos por más de 7 días")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("3 de ellos están en riesgo de abandono. Envía un mensaje antes de 14 días.")}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => sendBulkInactive(t("¡Hola! Nos gustaría saber de ti 💙"))}>
          <Send data-icon="inline-start" />
          {t("Enviar ahora")}
        </Button>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi) => (
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
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader title={t("Actividad (30 días)")} description={t("Posts, comentarios y reacciones")} icon={Activity} variant="primary" />
          <div className="p-4">
            <ActivityLineChart data={activitySeries} />
            <ChartLegend
              items={[
                { label: t("Posts"), color: "var(--chart-1)" },
                { label: t("Comentarios"), color: "var(--chart-2)" },
                { label: t("Reacciones"), color: "var(--chart-3)" },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader title={t("Tipos de publicaciones")} description={t("Distribución del mes")} icon={PieChart} variant="primary" />
          <div className="p-4">
            <PostTypesDoughnut data={postTypeData} />
            <ChartLegend items={postTypeData.map((d) => ({ label: `${d.name} ${d.value}%`, color: "var(--chart-1)" }))} />
          </div>
        </div>
      </section>

      {/* Hora pico · Diagnóstico · Top rachas en una sola fila */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader title={t("Horario pico de actividad")} description={t("Actividad por hora (24h)")} icon={Clock} variant="primary" />
          <div className="p-4">
            <PeakHoursBar data={peakHoursData} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader title={t("Diagnóstico vs Participación")} description={t("Nivel de participación por diagnóstico")} icon={Radar} variant="primary" />
          <div className="p-4">
            <DiagnosisRadar data={diagnosisParticipation} />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader title={t("Top rachas activas")} description={t("Miembros con mayor racha")} icon={Flame} variant="primary" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Miembro")}</TableHead>
                <TableHead className="text-right">{t("Racha")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("XP")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStreaks.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <MemberAvatar member={m} showStreak subtitle={m.diagnosis} />
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">🔥 {m.streak}</TableCell>
                  <TableCell className="hidden text-right text-sm sm:table-cell">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""} {m.xp.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Feed reciente + Miembros inactivos en una fila */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader title={t("Feed reciente")} description={t("Actividad en tiempo real")} icon={MessageCircle} variant="primary" />
        <div className="flex flex-col divide-y divide-border">
          {feed.map((item) => {
            const Icon = FEED_ICON[item.kind];
            return (
              <div key={item.id} className="flex items-center gap-3 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm">
                    <span className="font-semibold">{item.member}</span>{" "}
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
        </div>
      </div>

      {/* Panel inactivos */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Miembros inactivos · acción requerida")}
          description={t("Envía un mensaje para reactivarlos")}
          icon={AlertTriangle}
          variant="primary"
          actions={
            <Button size="sm" variant="outline" onClick={() => sendBulkInactive(t("Mensaje de reactivación"))}>
              <MessageSquare data-icon="inline-start" />
              {t("Mensaje grupal")}
            </Button>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Miembro")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Diagnóstico")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Ciudad")}</TableHead>
              <TableHead className="text-right">{t("Días sin publicar")}</TableHead>
              <TableHead className="hidden text-right lg:table-cell">{t("Riesgo")}</TableHead>
              <TableHead className="w-40 text-right"><span className="sr-only">{t("Acciones")}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inactive.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <MemberAvatar member={m} subtitle={m.lastPost} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{m.diagnosis}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">{m.region}</TableCell>
                <TableCell className="text-right text-sm font-semibold text-destructive">{m.daysSincePost} d</TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <RiskBadge risk={m.risk ?? "Bajo"} />
                </TableCell>
                <TableCell>
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
