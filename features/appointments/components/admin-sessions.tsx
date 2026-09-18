"use client";

import Link from "next/link";
import {
  Video,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
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
import { useAdminSessions } from "../hooks/use-admin";
import { sessionStatusColor, sessionStatusLabel, formatDateTime } from "../utils/format";

export function AdminSessions() {
  const t = useT();
  const { items, total, page, totalPages, loading, error, setPage } =
    useAdminSessions();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('Sesiones')}
        description={t('Sesiones de video realizadas en el módulo de citas')}
        icon={Video}
      />

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {t(error)}
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
            <Video className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t('No hay sesiones')}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('Las sesiones de video aparecerán cuando se realicen consultas.')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Paciente')}</TableHead>
                <TableHead>{t('Profesional')}</TableHead>
                <TableHead>{t('Inicio')}</TableHead>
                <TableHead>{t('Fin')}</TableHead>
                <TableHead>{t('Duración')}</TableHead>
                <TableHead>{t('Estado')}</TableHead>
                <TableHead className="text-right">{t('Acción')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.patientName ?? "—"}</TableCell>
                  <TableCell>{session.professionalName ?? "—"}</TableCell>
                  <TableCell>{session.startedAt ? formatDateTime(session.startedAt) : "—"}</TableCell>
                  <TableCell>{session.endedAt ? formatDateTime(session.endedAt) : "—"}</TableCell>
                  <TableCell>
                    {session.durationSeconds != null
                      ? t("{minutes} min", {
                          minutes: String(
                            Math.round(session.durationSeconds / 60),
                          ),
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={t(sessionStatusLabel[session.status])}
                      color={sessionStatusColor(session.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/appointments/citas/${session.appointmentId}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      {t('Ver cita')}
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
            {t('Anterior')}
          </Button>
          <span className="text-[12px] text-muted-foreground">
            {t('Página {page} de {totalPages} · {total} sesiones', { page: String(page), totalPages: String(totalPages), total: String(total) })}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t('Siguiente')}
          </Button>
        </div>
      )}
    </div>
  );
}
