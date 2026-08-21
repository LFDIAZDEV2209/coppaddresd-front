"use client";

import {
  Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminRequests } from "../hooks/use-admin";
import {
  requestStatusColor,
  requestStatusLabel,
  formatDateTime,
} from "../utils/format";

export function AdminRequests() {
  const { items, total, page, totalPages, loading, error, setPage } =
    useAdminRequests();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Solicitudes"
        description="Solicitudes de telemedicina de los pacientes"
        icon={Inbox}
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
            <Inbox className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No hay solicitudes</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Fecha preferida</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.patientName ?? "—"}</TableCell>
                  <TableCell>{request.specialtyName ?? "—"}</TableCell>
                  <TableCell>
                    {request.preferredStart ? formatDateTime(request.preferredStart) : "Sin preferencia"}
                  </TableCell>
                  <TableCell className="max-w-64 truncate">{request.reason ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={requestStatusLabel[request.status]}
                      color={requestStatusColor(request.status)}
                    />
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
            Página {page} de {totalPages} · {total} solicitudes
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
