"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Bell,
  Stethoscope,
  Inbox,
  Clock,
  ClipboardList,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "../hooks/use-current-user";
import { useDashboardAnalytics } from "../hooks/use-dashboard-analytics";
import { useAlerts } from "../hooks/use-alerts";
import { DashboardChartCard } from "./dashboard/dashboard-chart-card";
import { AppointmentsTrendChart } from "./dashboard/appointments-trend-chart";
import { StatusDistributionChart } from "./dashboard/status-distribution-chart";
import { HourlyDistributionChart } from "./dashboard/hourly-distribution-chart";
import { UpcomingAppointments } from "./dashboard/upcoming-appointments";
import { QuickActions, type QuickAction } from "./dashboard/quick-actions";

type RangeKey = "30d" | "60d";

const rangeOptions: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "30d", label: "30 días", days: 30 },
  { key: "60d", label: "60 días", days: 60 },
];

/**
 * Dashboard del profesional clínico: KPIs propios en una línea, gráficas de su
 * actividad (serie temporal, distribución por estado y franjas horarias), sus
 * próximas citas y accesos rápidos. Los datos vienen de /me/analytics: el
 * backend resuelve el profesional del JWT (identidad), nunca de un id del cliente.
 */
export function ProfessionalDashboard() {
  const { context, loading: userLoading } = useCurrentUser();
  const { unread } = useAlerts();
  const [range, setRange] = useState<RangeKey>("30d");

  const rangeDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - rangeOptions.find((o) => o.key === range)!.days);
    return { from, to };
  }, [range]);

  const professionalId = context?.professional?.id ?? null;
  const { analytics, loading, error } = useDashboardAnalytics(
    "me",
    professionalId ? rangeDates.from : null,
    professionalId ? rangeDates.to : null,
    Boolean(professionalId)
  );

  if (userLoading) {
    return <DashboardSkeleton />;
  }

  const professional = context?.professional;
  if (!professional) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Telemedicina"
          description="Dashboard del profesional"
          icon={Stethoscope}
        />
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Stethoscope className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            El usuario autenticado no es un profesional clínico
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            El dashboard de Telemedicina está disponible para profesionales con
            asignación clínica en el ERP.
          </p>
        </div>
      </div>
    );
  }

  const kpis = analytics?.kpis;
  const completedRate =
    kpis && kpis.completed + kpis.noShow + kpis.cancelled > 0
      ? Math.round((kpis.completed / (kpis.completed + kpis.noShow + kpis.cancelled)) * 100)
      : null;

  const actions: QuickAction[] = [
    { href: "/telemedicine/agenda", icon: CalendarDays, label: "Mi agenda", description: "Agenda y calendario" },
    { href: "/telemedicine/solicitudes", icon: Inbox, label: "Solicitudes", description: "Solicitudes de los pacientes" },
    { href: "/telemedicine/alertas", icon: Bell, label: "Alertas", description: unread > 0 ? `${unread} sin leer` : "Bandeja de notificaciones" },
    { href: "/telemedicine/citas", icon: ClipboardList, label: "Citas", description: "Historial de mis citas" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Telemedicina"
        description={`Bienvenido, ${professional.fullName}`}
        icon={Stethoscope}
        actions={
          <>
            <ToggleGroup
                    value={[range]}
              onValueChange={(values) => {
                const next = values[0] as RangeKey | undefined;
                if (next) setRange(next);
              }}
              size="sm"
            >
              {rangeOptions.map((option) => (
                <ToggleGroupItem key={option.key} value={option.key}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Link href="/telemedicine/agenda" className={buttonVariants({ size: "sm" })}>
              <CalendarDays className="size-4" />
              Mi agenda
            </Link>
          </>
        }
      />

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Stats cards en UNA línea (xl) — mis KPIs. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mis citas de hoy"
          value={kpis ? String(kpis.appointmentsToday) : "—"}
          icon={CalendarCheck}
          variant="primary"
          context={new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
        />
        <StatCard
          label="Próximos 7 días"
          value={kpis ? String(kpis.upcomingAppointments) : "—"}
          icon={CalendarPlus}
          variant="info"
          context={kpis ? `${kpis.pending} confirmadas pendientes` : undefined}
        />
        <StatCard
          label="Completadas (rango)"
          value={kpis ? String(kpis.completed) : "—"}
          icon={Clock}
          variant="success"
          context={completedRate !== null ? `Tasa de finalización ${completedRate}%` : undefined}
        />
        <StatCard
          label="Canceladas / No asistieron"
          value={kpis ? String(kpis.cancelled + kpis.noShow) : "—"}
          icon={CalendarX}
          variant={kpis && kpis.cancelled + kpis.noShow > 0 ? "destructive" : "default"}
          context={kpis ? `${kpis.uniquePatients} pacientes atendidos` : undefined}
        />
      </div>

      {/* Gráficas: mi tendencia + mi distribución por estado. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardChartCard
          title="Mi actividad"
          description={`Mis citas en el rango seleccionado (${rangeOptions.find((o) => o.key === range)!.label})`}
          className="xl:col-span-2"
        >
          <AppointmentsTrendChart
            dailySeries={analytics?.dailySeries ?? []}
            loading={loading}
          />
        </DashboardChartCard>

        <DashboardChartCard title="Distribución por estado" description="Mis citas por estado en el rango">
          <StatusDistributionChart
            statusDistribution={analytics?.statusDistribution ?? []}
            loading={loading}
          />
        </DashboardChartCard>
      </div>

      {/* Franjas horarias + próximas citas + accesos rápidos. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardChartCard
          title="Franjas de mayor demanda"
          description="Mis citas por hora del día en el rango"
          className="xl:col-span-1"
        >
          <HourlyDistributionChart
            hourlyDistribution={analytics?.hourlyDistribution ?? []}
            loading={loading}
          />
        </DashboardChartCard>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Mis próximas citas</h2>
            <Link
              href="/telemedicine/agenda"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ver agenda
            </Link>
          </div>
          <UpcomingAppointments
            appointments={analytics?.upcomingAppointments ?? []}
            loading={loading}
            emptyMessage="Sin citas próximas en tu agenda"
            hrefBase="/telemedicine/citas"
          />
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">Accesos rápidos</h2>
          <Users className="size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <QuickActions actions={actions.slice(0, 2)} />
          <QuickActions actions={actions.slice(2)} />
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