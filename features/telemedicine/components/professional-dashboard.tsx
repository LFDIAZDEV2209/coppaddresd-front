"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Bell,
  Video,
  ChevronRight,
  Stethoscope,
  Inbox,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "../hooks/use-current-user";
import { useAgenda } from "../hooks/use-agenda";
import { useAlerts } from "../hooks/use-alerts";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatTime,
  formatDate,
} from "../utils/format";

export function ProfessionalDashboard() {
  const { context, loading: userLoading } = useCurrentUser();

  // Rango: de hoy 00:00 local a +14 días (agenda próxima).
  const { from, to } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    return { from: start, to: end };
  }, []);

  const professionalId = context?.professional?.id ?? null;
  const { appointments, loading: agendaLoading } = useAgenda(professionalId, from, to);
  const { unread, loading: alertsLoading } = useAlerts();

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

  const today = new Date();
  const todayAppointments = appointments.filter((a) => {
    const start = new Date(a.scheduledStart);
    return start.toDateString() === today.toDateString();
  });
  const next = appointments.find((a) => new Date(a.scheduledStart) >= today);
  const confirmed = appointments.filter((a) => a.status === "Confirmed").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Telemedicina"
        description={`Bienvenido, ${professional.fullName}`}
        icon={Stethoscope}
        actions={
          <Link
            href="/telemedicine/agenda"
            className={buttonVariants({ size: "sm" })}
          >
            <CalendarDays className="size-4" />
            Mi agenda
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Citas de hoy"
          value={String(todayAppointments.length)}
          icon={CalendarDays}
          variant="primary"
          context={today.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
        />
        <StatCard
          label="Próxima cita"
          value={next ? formatTime(next.scheduledStart) : "—"}
          icon={Clock}
          variant="info"
          context={next ? formatDate(next.scheduledStart) : "Sin citas próximas"}
        />
        <StatCard
          label="Citas confirmadas (14 días)"
          value={String(confirmed)}
          icon={CalendarPlus}
          variant="success"
          context={`${appointments.length} en total`}
        />
        <StatCard
          label="Alertas sin leer"
          value={String(unread)}
          icon={Bell}
          variant={unread > 0 ? "warning" : "default"}
          context={alertsLoading ? "Cargando..." : "Bandeja de notificaciones"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Próximas citas</h2>
            <Link
              href="/telemedicine/agenda"
              className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              Ver agenda <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {agendaLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <CalendarDays className="size-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-foreground">
                Sin citas en los próximos 14 días
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {appointments.slice(0, 6).map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    href={`/telemedicine/citas/${appointment.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Video className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {appointment.patientName ?? "Paciente"}
                        </span>
                        <span className="truncate text-[11.5px] text-muted-foreground">
                          {appointment.specialtyName ?? "Especialidad"} ·{" "}
                          {appointment.locationName ?? "Sede"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[12px] font-medium text-muted-foreground">
                        {formatDate(appointment.scheduledStart)} ·{" "}
                        {formatTime(appointment.scheduledStart)}
                      </span>
                      <StatusBadge
                        status={appointmentStatusLabel[appointment.status]}
                        color={appointmentStatusColor(appointment.status)}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Accesos rápidos</h2>
          </div>
          <div className="flex flex-col gap-2">
            <QuickLink href="/telemedicine/agenda" icon={CalendarDays} label="Mi agenda" />
            <QuickLink href="/telemedicine/solicitudes" icon={Inbox} label="Solicitudes" />
            <QuickLink href="/telemedicine/alertas" icon={Bell} label="Alertas" />
            <QuickLink href="/telemedicine/citas" icon={ClipboardList} label="Citas" />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <span className="flex-1 text-[13px] font-medium text-foreground">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-[76px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
