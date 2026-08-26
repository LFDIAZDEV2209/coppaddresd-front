"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Bell,
  Stethoscope,
  Inbox,
  Clock,
  ClipboardList,
  PieChart,
  UserCog,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  RangeToggle,
  rangeOptions,
  type RangeKey,
} from "./dashboard/range-toggle";
import { useCurrentUser } from "../hooks/use-current-user";
import { useDashboardAnalytics } from "../hooks/use-dashboard-analytics";
import { useAlerts } from "../hooks/use-alerts";
import { DashboardChartCard } from "./dashboard/dashboard-chart-card";
import { AppointmentsTrendChart } from "./dashboard/appointments-trend-chart";
import { StatusDistributionChart } from "./dashboard/status-distribution-chart";
import { HourlyDistributionChart } from "./dashboard/hourly-distribution-chart";
import { UpcomingAppointments } from "./dashboard/upcoming-appointments";
import { QuickActions, type QuickAction } from "./dashboard/quick-actions";

/**
 * Dashboard del profesional clínico: KPIs propios en una línea, gráficas de su
 * actividad (serie temporal, distribución por estado y franjas horarias), sus
 * próximas citas y accesos rápidos. Los datos vienen de /me/analytics: el
 * backend resuelve el profesional del JWT (identidad), nunca de un id del cliente.
 */
export function ProfessionalDashboard() {
  const t = useT();
  const { context, loading: userLoading } = useCurrentUser();
  const { unread } = useAlerts();
  const [range, setRange] = useState<RangeKey>("30d");

  const rangeDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(
      from.getDate() - rangeOptions.find((o) => o.key === range)!.days,
    );
    return { from, to };
  }, [range]);

  const professionalId = context?.professional?.id ?? null;
  const { analytics, loading, error } = useDashboardAnalytics(
    "me",
    professionalId ? rangeDates.from : null,
    professionalId ? rangeDates.to : null,
    Boolean(professionalId),
  );

  if (userLoading) {
    return <DashboardSkeleton />;
  }

  const professional = context?.professional;
  if (!professional) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title={t('Citas')}
          description={t('Dashboard del profesional')}
          icon={Stethoscope}
        />
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Stethoscope className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t('El usuario autenticado no es un profesional clínico')}
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('El dashboard de Citas está disponible para profesionales con asignación clínica en el ERP.')}
          </p>
        </div>
      </div>
    );
  }

  const kpis = analytics?.kpis;
  const completedRate =
    kpis && kpis.completed + kpis.noShow + kpis.cancelled > 0
      ? Math.round(
          (kpis.completed / (kpis.completed + kpis.noShow + kpis.cancelled)) *
            100,
        )
      : null;

  const actions: QuickAction[] = [
    {
      href: "/appointments/agenda",
      icon: CalendarDays,
      label: t('Mi agenda'),
      description: t('Agenda y calendario'),
    },
    {
      href: "/appointments/solicitudes",
      icon: Inbox,
      label: t('Solicitudes'),
      description: t('Solicitudes de los pacientes'),
    },
    {
      href: "/appointments/alertas",
      icon: Bell,
      label: t('Alertas'),
      description:
        unread > 0 ? t('{count} sin leer', { count: String(unread) }) : t('Bandeja de notificaciones'),
    },
    {
      href: "/appointments/citas",
      icon: ClipboardList,
      label: t('Citas'),
      description: t('Historial de mis citas'),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('Citas')}
        description={`${t('Bienvenido')}, ${professional.fullName}`}
        icon={Stethoscope}
        actions={
          <>
            <RangeToggle
              value={range}
              onValueChange={setRange}
              options={[
                { key: "30d", label: "30 días", days: 30 },
                { key: "60d", label: "60 días", days: 60 },
              ]}
            />
            <Link
              href="/appointments/agenda"
              className={buttonVariants({ size: "sm" })}
            >
              <CalendarDays className="size-4" />
              {t('Mi agenda')}
            </Link>
          </>
        }
      />

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Stats cards en UNA línea (xl) — mis KPIs. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('Mis citas de hoy')}
          value={kpis ? String(kpis.appointmentsToday) : "—"}
          icon={CalendarCheck}
          variant="primary"
          context={new Date().toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
          })}
        />
        <StatCard
          label={t('Próximos 7 días')}
          value={kpis ? String(kpis.upcomingAppointments) : "—"}
          icon={CalendarPlus}
          variant="info"
          context={kpis ? t('{count} confirmadas pendientes', { count: String(kpis.pending) }) : undefined}
        />
        <StatCard
          label={t('Completadas (rango)')}
          value={kpis ? String(kpis.completed) : "—"}
          icon={Clock}
          variant="success"
          context={
            completedRate !== null
              ? t('Tasa de finalización {rate}%', { rate: String(completedRate) })
              : undefined
          }
        />
        <StatCard
          label={t('Canceladas / No asistieron')}
          value={kpis ? String(kpis.cancelled + kpis.noShow) : "—"}
          icon={CalendarX}
          variant={
            kpis && kpis.cancelled + kpis.noShow > 0 ? "destructive" : "default"
          }
          context={
            kpis ? t('{count} pacientes atendidos', { count: String(kpis.uniquePatients) }) : undefined
          }
        />
      </div>

      {/* Gráficas: mi tendencia + mi distribución por estado. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardChartCard
          title={t('Mi actividad')}
          description={`${t('Mis citas en el rango seleccionado')} (${rangeOptions.find((o) => o.key === range)!.label})`}
          icon={Activity}
          className="xl:col-span-2"
        >
          <AppointmentsTrendChart
            dailySeries={analytics?.dailySeries ?? []}
            loading={loading}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title={t('Distribución por estado')}
          description={t('Mis citas por estado en el rango')}
          icon={PieChart}
        >
          <StatusDistributionChart
            statusDistribution={analytics?.statusDistribution ?? []}
            loading={loading}
          />
        </DashboardChartCard>
      </div>

      {/* Franjas horarias + próximas citas + accesos rápidos. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardChartCard
          title={t('Franjas de mayor demanda')}
          description={t('Mis citas por hora del día en el rango')}
          icon={Clock}
          className="xl:col-span-1"
        >
          <HourlyDistributionChart
            hourlyDistribution={analytics?.hourlyDistribution ?? []}
            loading={loading}
          />
        </DashboardChartCard>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card xl:col-span-2">
          <SectionHeader
            title={t('Mis próximas citas')}
            description={t('Próximas citas de tu agenda')}
            icon={CalendarDays}
            actions={
              <Link
                href="/appointments/agenda"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20"
              >
                {t('Ver agenda')}
                <ArrowRight data-icon="inline-end" />
              </Link>
            }
          />
          <div className="p-5 pt-4">
            <UpcomingAppointments
              appointments={analytics?.upcomingAppointments ?? []}
              loading={loading}
              emptyMessage={t('Sin citas próximas en tu agenda')}
              hrefBase="/appointments/citas"
            />
          </div>
        </section>
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t('Accesos rápidos')}
          description={t('Accesos directos del módulo')}
          icon={UserCog}
        />
        <div className="p-5 pt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickActions actions={actions.slice(0, 2)} />
            <QuickActions actions={actions.slice(2)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-[76px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[280px] rounded-2xl xl:col-span-2" />
      </div>
    </div>
  );
}
