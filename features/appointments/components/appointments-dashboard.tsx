"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Inbox,
  Video,
} from "lucide-react";
import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "../hooks/use-current-user";
import { AdminDashboard } from "./admin-dashboard";
import { ProfessionalDashboard } from "./professional-dashboard";

/**
 * Router del dashboard de Citas por capacidades (extensible para roles
 * futuros): el administrador ve la vista global (KPIs + listados admin), el
 * profesional clínico su agenda, y el staff una vista con los módulos que su
 * rol le permite. La decisión es declarativa (permisos del contexto), nunca
 * por nombre de rol.
 */
export function AppointmentsDashboard() {
  const { can } = useAppContext();
  const { context: me, loading: meLoading } = useCurrentUser();

  const view = useMemo(() => {
    if (hasAppointmentPermission(can, "Appointments.AdminView")) return "admin";
    if (me?.professional) return "professional";
    return "staff";
  }, [can, me]);

  if (view === "admin") {
    return <AdminDashboard />;
  }

  if (view === "professional") {
    return <ProfessionalDashboard />;
  }

  if (meLoading) {
    return null;
  }

  return <StaffDashboard />;
}

/**
 * Vista del staff sin perfil clínico (recepción, coordinación, dirección):
 * accesos a los módulos de citas que su rol permite. Cada enlace se muestra
 * según el permiso del contexto; agregar un módulo futuro = una entrada más
 * (declarativo, sin condicionales por rol).
 */
function StaffDashboard() {
  const { can } = useAppContext();

  const links = [
    hasAppointmentPermission(can, "Appointments.AgendaView") && {
      href: "/appointments/agenda",
      icon: CalendarDays,
      label: "Agenda",
      description: "Agenda de los profesionales",
    },
    hasAppointmentPermission(can, "Appointments.RequestsView") && {
      href: "/appointments/solicitudes",
      icon: Inbox,
      label: "Solicitudes",
      description: "Solicitudes de los pacientes",
    },
    hasAppointmentPermission(can, "Appointments.AlertsView") && {
      href: "/appointments/alertas",
      icon: Bell,
      label: "Alertas",
      description: "Bandeja de notificaciones",
    },
    hasAppointmentPermission(can, "Appointments.View") && {
      href: "/appointments/citas",
      icon: ClipboardList,
      label: "Citas",
      description: "Citas del módulo",
    },
  ].filter(Boolean) as Array<{
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
  }>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Citas"
        description="Módulos disponibles para tu rol"
        icon={Video}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="text-[13.5px] font-semibold text-foreground">
                  {link.label}
                </span>
                <span className="truncate text-[11.5px] text-muted-foreground">
                  {link.description}
                </span>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}