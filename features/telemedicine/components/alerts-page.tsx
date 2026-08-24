"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "../hooks/use-alerts";
import { formatDateTime } from "../utils/format";
import type { AlertSeverity, AlertType } from "../types";

const severityStyles: Record<
  AlertSeverity,
  {
    label: string;
    className: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Info: { label: "Info", className: "bg-[#DBEAFE] text-[#1D4ED8]", icon: Info },
  Warning: {
    label: "Advertencia",
    className: "bg-[#FDF2E3] text-[#9A6A0A]",
    icon: AlertTriangle,
  },
  Critical: {
    label: "Crítica",
    className: "bg-[#FCEBEC] text-[#B42318]",
    icon: AlertOctagon,
  },
};

const typeLabels: Record<AlertType, string> = {
  NewRequest: "Nueva solicitud",
  RequestApproved: "Solicitud aprobada",
  NewAppointment: "Nueva cita",
  UpcomingAppointment: "Cita próxima",
  AppointmentRescheduled: "Cita reprogramada",
  AppointmentCancelled: "Cita cancelada",
  PatientWaiting: "Paciente esperando",
  PatientJoined: "Paciente en la sala",
  ParticipantLeft: "Participante salió",
  SessionEnded: "Sesión finalizada",
  NoShow: "No asistió",
  System: "Sistema",
};

export function AlertsPage() {
  const {
    alerts,
    unread,
    total,
    loading,
    error,
    page,
    setPage,
    handleRead,
    handleReadAll,
  } = useAlerts();

  const [busy, setBusy] = useState(false);

  const readAll = async () => {
    setBusy(true);
    try {
      await handleReadAll();
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Alertas"
        description={
          unread > 0 ? `${unread} sin leer` : "Todas las alertas leídas"
        }
        icon={Bell}
        actions={
          unread > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-white"
              onClick={readAll}
              disabled={busy}
            >
              <CheckCheck className="size-4" />
              Marcar todas como leídas
            </Button>
          ) : undefined
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

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Bell className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No hay alertas</p>
          <p className="text-[12.5px] text-muted-foreground">
            Los eventos de tus citas y solicitudes aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const severity = severityStyles[alert.severity];
            const SeverityIcon = severity.icon;
            const unreadAlert = alert.readAt === null;
            return (
              <li
                key={alert.id}
                className={
                  unreadAlert
                    ? "flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft/30 p-4"
                    : "flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                }
              >
                <button
                  onClick={() => void handleRead(alert.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  aria-label={
                    unreadAlert
                      ? `Marcar como leída: ${alert.title}`
                      : `Alerta: ${alert.title}`
                  }
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <SeverityIcon className="size-4.5 text-muted-foreground" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground">
                        {alert.title}
                      </span>
                      {unreadAlert && (
                        <Badge className="bg-primary text-primary-foreground">
                          Nueva
                        </Badge>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${severity.className}`}
                      >
                        {severity.label}
                      </span>
                    </div>
                    {alert.body && (
                      <p className="line-clamp-2 text-[12.5px] text-muted-foreground">
                        {alert.body}
                      </p>
                    )}
                    <span className="text-[11px] text-muted-foreground/70">
                      {typeLabels[alert.type] ?? alert.type} ·{" "}
                      {formatDateTime(alert.createdAt)}
                    </span>
                  </div>
                </button>
                {alert.relatedAppointmentId && (
                  <Link
                    href={`/telemedicine/citas/${alert.relatedAppointmentId}`}
                    className="shrink-0 rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Ver cita relacionada"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-[12px] text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
