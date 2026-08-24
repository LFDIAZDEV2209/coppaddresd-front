"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Clock,
  Inbox,
  PieChart,
  UserCog,
  Users,
  Video,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RangeToggle,
  rangeOptions,
  type RangeKey,
} from "./dashboard/range-toggle";
import { useDashboardAnalytics } from "../hooks/use-dashboard-analytics";
import { useAdminSummary } from "../hooks/use-admin";
import { DashboardChartCard } from "./dashboard/dashboard-chart-card";
import { AppointmentsTrendChart } from "./dashboard/appointments-trend-chart";
import { StatusDistributionChart } from "./dashboard/status-distribution-chart";
import { ProfessionalActivityChart } from "./dashboard/professional-activity-chart";
import { HourlyDistributionChart } from "./dashboard/hourly-distribution-chart";
import { UpcomingAppointments } from "./dashboard/upcoming-appointments";
import { QuickActions, type QuickAction } from "./dashboard/quick-actions";

/**
 * Dashboard administrativo de Telemedicina: KPIs en una línea, gráficas de
 * actividad (serie temporal, distribución por estado, actividad por profesional
 * y franjas horarias), próximas citas globales y accesos rápidos. Los datos
 * vienen de /admin/analytics (extensión mínima del backend, sin stats ficticias).
 */
export function AdminDashboard() {
  const [range, setRange] = useState<RangeKey>("30d");

  const rangeDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(
      from.getDate() - rangeOptions.find((o) => o.key === range)!.days,
    );
    return { from, to };
  }, [range]);

  const { analytics, loading, error } = useDashboardAnalytics(
    "admin",
    rangeDates.from,
    rangeDates.to,
  );
  const { summary } = useAdminSummary();

  const actions: QuickAction[] = [
    {
      href: "/telemedicine/admin/citas",
      icon: CalendarDays,
      label: "Citas",
      description: "Todas las citas con filtros",
    },
    {
      href: "/telemedicine/admin/solicitudes",
      icon: Inbox,
      label: "Solicitudes",
      description: "Solicitudes de los pacientes",
    },
    {
      href: "/telemedicine/admin/profesionales",
      icon: Users,
      label: "Profesionales",
      description: "Catálogo de profesionales clínicos",
    },
    {
      href: "/telemedicine/admin/sesiones",
      icon: Video,
      label: "Sesiones",
      description: "Sesiones de video realizadas",
    },
  ];

  if (loading && !analytics) {
    return <AdminDashboardSkeleton />;
  }

  const kpis = analytics?.kpis;
  const completedRate =
    kpis && kpis.completed + kpis.noShow + kpis.cancelled > 0
      ? Math.round(
          (kpis.completed / (kpis.completed + kpis.noShow + kpis.cancelled)) *
            100,
        )
      : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Telemedicina · Administración"
        description="Resumen operativo del módulo de telemedicina"
        icon={BarChart3}
        actions={<RangeToggle value={range} onValueChange={setRange} />}
      />

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Stats cards en UNA línea (xl) — los 6 KPIs del operador. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Citas de hoy"
          value={kpis ? String(kpis.appointmentsToday) : "—"}
          icon={CalendarCheck}
          variant="primary"
          context={
            summary ? `${summary.activeSessions} sesiones activas` : undefined
          }
        />
        <StatCard
          label="Citas en el rango"
          value={kpis ? String(kpis.totalAppointments) : "—"}
          icon={CalendarDays}
          variant="info"
          context={kpis ? `${kpis.uniquePatients} pacientes únicos` : undefined}
        />
        <StatCard
          label="Próximos 7 días"
          value={kpis ? String(kpis.upcomingAppointments) : "—"}
          icon={CalendarPlus}
          variant="success"
          context={kpis ? `${kpis.pending} confirmadas pendientes` : undefined}
        />
        <StatCard
          label="Completadas"
          value={kpis ? String(kpis.completed) : "—"}
          icon={Clock}
          variant="success"
          context={
            completedRate !== null
              ? `Tasa de finalización ${completedRate}%`
              : undefined
          }
        />
        <StatCard
          label="Canceladas"
          value={kpis ? String(kpis.cancelled) : "—"}
          icon={CalendarX}
          variant="destructive"
          context={kpis ? `${kpis.noShow} no asistieron` : undefined}
        />
        <StatCard
          label="Profesionales activos"
          value={kpis ? String(kpis.activeProfessionals) : "—"}
          icon={Stethoscope}
          variant="warning"
          context={
            summary
              ? `${summary.requestsPending} solicitudes pendientes`
              : undefined
          }
        />
      </div>

      {/* Gráficas: tendencia + distribución por estado en la fila principal. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardChartCard
          title="Actividad de citas"
          description={`Serie temporal en el rango seleccionado (${rangeOptions.find((o) => o.key === range)!.label})`}
          icon={Activity}
          className="xl:col-span-2"
        >
          <AppointmentsTrendChart
            dailySeries={analytics?.dailySeries ?? []}
            loading={loading}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Distribución por estado"
          description="Citas agrupadas por estado en el rango"
          icon={PieChart}
        >
          <StatusDistributionChart
            statusDistribution={analytics?.statusDistribution ?? []}
            loading={loading}
          />
        </DashboardChartCard>
      </div>

      {/* Fila secundaria: actividad por profesional + franjas horarias. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardChartCard
          title="Actividad por profesional"
          description="Citas totales y completadas por profesional en el rango"
          icon={Users}
        >
          <ProfessionalActivityChart
            activity={analytics?.professionalActivity ?? []}
            loading={loading}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Franjas de mayor demanda"
          description="Citas por hora del día en el rango"
          icon={Clock}
        >
          <HourlyDistributionChart
            hourlyDistribution={analytics?.hourlyDistribution ?? []}
            loading={loading}
          />
        </DashboardChartCard>
      </div>

      {/* Próximas citas globales + accesos rápidos. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card xl:col-span-2">
          <SectionHeader
            title="Próximas citas"
            description="Próximas citas en el sistema"
            icon={CalendarDays}
            actions={
              <Link
                href="/telemedicine/admin/citas"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20"
              >
                Ver todas
                <ArrowRight data-icon="inline-end" />
              </Link>
            }
          />
          <div className="p-5 pt-4">
            <UpcomingAppointments
              appointments={analytics?.upcomingAppointments ?? []}
              loading={loading}
              emptyMessage="Sin citas próximas en el sistema"
              hrefBase="/telemedicine/admin/citas"
            />
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title="Accesos rápidos"
            description="Accesos directos del módulo"
            icon={UserCog}
          />
          <div className="p-5 pt-4">
            <QuickActions actions={actions} />
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-[76px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[280px] rounded-2xl" />
      </div>
    </div>
  );
}
