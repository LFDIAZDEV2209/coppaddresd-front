"use client";

import Link from "next/link";
import {
  CalendarDays,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAppointments } from "../hooks/use-admin";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatDateTime,
} from "../utils/format";

export function AdminAppointments() {
  const { items, total, page, totalPages, loading, error, setPage } =
    useAdminAppointments();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Citas"
        description="Todas las citas del módulo"
        icon={CalendarDays}
      />

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <CalendarDays className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No hay citas</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">{appointment.patientName ?? "—"}</TableCell>
                  <TableCell>{appointment.professionalName ?? "—"}</TableCell>
                  <TableCell>{appointment.specialtyName ?? "—"}</TableCell>
                  <TableCell>{formatDateTime(appointment.scheduledStart)}</TableCell>
                  <TableCell>{appointment.locationName ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={appointmentStatusLabel[appointment.status]}
                      color={appointmentStatusColor(appointment.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/appointments/citas/${appointment.id}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      <Video className="size-3.5" /> Ver
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-[12px] text-muted-foreground">
            Página {page} de {totalPages} · {total} citas
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
