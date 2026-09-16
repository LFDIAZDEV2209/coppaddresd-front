"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, History, MailWarning, Send } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/section-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNotifications } from "../../hooks/use-notifications";
import type { NotificationChannel, NotificationStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<NotificationStatus, string> = {
  sent: "Enviada",
  queued: "En cola",
  failed: "Fallida",
  skipped: "Omitida",
};

const STATUS_CLASSES: Record<NotificationStatus, string> = {
  sent: "bg-success-soft text-success",
  queued: "bg-muted text-muted-foreground",
  failed: "bg-destructive-soft text-destructive",
  skipped: "bg-warning-soft text-warning",
};

/**
 * Registro de notificaciones enviadas a pacientes (SPEC A13): canal,
 * destinatario, plantilla, estado de entrega y fechas. Read-only y paginado.
 */
export function NotificationsHistory() {
  const t = useT();
  const [channel, setChannel] = useState<NotificationChannel | "all">("all");
  const [status, setStatus] = useState<NotificationStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useNotifications({
    channel: channel === "all" ? undefined : channel,
    status: status === "all" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const isFiltered = channel !== "all" || status !== "all";

  const header = (
    <SectionHeader
      title={t("Notificaciones enviadas")}
      description={t("Historial de entregas por canal y estado")}
      icon={History}
      variant="primary"
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={channel}
            onValueChange={(value) => {
              setChannel((value ?? "all") as NotificationChannel | "all");
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
              aria-label={t("Filtrar por canal")}
            >
              <SelectValue>
                {channel === "all" ? t("Todo canal") : channel === "sms" ? "SMS" : t("Comunidad")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todo canal")}</SelectItem>
              <SelectItem value="community">{t("Comunidad")}</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus((value ?? "all") as NotificationStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
              aria-label={t("Filtrar por estado de entrega")}
            >
              <SelectValue>
                {status === "all" ? t("Todo estado") : STATUS_LABELS[status]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todo estado")}</SelectItem>
              {(Object.keys(STATUS_LABELS) as NotificationStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {header}

      {loading && !data ? (
        <div className="p-5">
          <TableSkeleton rows={5} />
        </div>
      ) : error && !data ? (
        <div className="p-5">
          <ModuleErrorState message={error} onRetry={reload} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <ModuleEmptyState
          title={t("Sin notificaciones")}
          description={
            isFiltered
              ? t("Ninguna notificación coincide con los filtros aplicados.")
              : t("Aún no se han enviado notificaciones a pacientes.")
          }
          filtered={isFiltered}
          onClear={() => {
            setChannel("all");
            setStatus("all");
            setPage(1);
          }}
          className="m-5"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Paciente")}</TableHead>
                  <TableHead>{t("Canal")}</TableHead>
                  <TableHead>{t("Destinatario")}</TableHead>
                  <TableHead>{t("Plantilla")}</TableHead>
                  <TableHead>{t("Estado")}</TableHead>
                  <TableHead>{t("Enviada")}</TableHead>
                  <TableHead>{t("Detalle")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="text-sm font-medium text-foreground">
                      {notification.patientName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {notification.channel === "sms" ? (
                          <Send className="size-3" />
                        ) : (
                          <MailWarning className="size-3" />
                        )}
                        {notification.channel === "sms" ? "SMS" : t("Comunidad")}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-[12.5px] text-muted-foreground">
                      {notification.recipient}
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">
                      {notification.templateName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[notification.status]}`}
                      >
                        {STATUS_LABELS[notification.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">
                      {formatDate(notification.sentAt ?? notification.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-[12px] text-muted-foreground">
                      {notification.error ?? notification.renderedBody}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-[11.5px] text-muted-foreground">
              {t("Página")} {page} {t("de")} {totalPages} · {data.total}{" "}
              {t("registros")}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft data-icon="inline-start" />
                {t("Anterior")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                {t("Siguiente")}
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
