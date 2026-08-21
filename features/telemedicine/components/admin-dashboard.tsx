"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CalendarCheck,
  Inbox,
  Video,
  Bell,
  Users,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSummary } from "../hooks/use-admin";

export function AdminDashboard() {
  const { summary, loading, error } = useAdminSummary();

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Telemedicina · Administración"
        description="Resumen operativo del módulo de telemedicina"
        icon={BarChart3}
      />

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Citas de hoy" value={String(summary.appointmentsToday)} icon={CalendarDays} variant="primary" />
            <StatCard label="Citas pendientes" value={String(summary.appointmentsPending)} icon={CalendarCheck} variant="info" context="Confirmadas sin iniciar" />
            <StatCard label="Citas completadas" value={String(summary.appointmentsCompleted)} icon={CalendarCheck} variant="success" />
            <StatCard label="Solicitudes pendientes" value={String(summary.requestsPending)} icon={Inbox} variant="warning" />
            <StatCard label="Sesiones activas" value={String(summary.activeSessions)} icon={Video} variant="info" context="En consulta en este momento" />
            <StatCard label="Alertas sin leer" value={String(summary.alertsUnread)} icon={Bell} variant={summary.alertsUnread > 0 ? "warning" : "default"} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminLink href="/telemedicine/admin/citas" icon={CalendarDays} label="Citas" description="Todas las citas con filtros" />
            <AdminLink href="/telemedicine/admin/solicitudes" icon={Inbox} label="Solicitudes" description="Solicitudes de los pacientes" />
            <AdminLink href="/telemedicine/admin/profesionales" icon={Users} label="Profesionales" description="Catálogo de profesionales clínicos" />
            <AdminLink href="/telemedicine/admin/sesiones" icon={Video} label="Sesiones" description="Sesiones de video realizadas" />
          </div>
        </>
      )}
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[13.5px] font-semibold text-foreground">{label}</span>
        <span className="truncate text-[11.5px] text-muted-foreground">{description}</span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
