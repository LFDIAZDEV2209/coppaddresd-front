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
import { DeliveryStatusBadge } from "../shared/badges";
import { TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

const PAGE_SIZE = 20;
/** En el diálogo se muestran más filas por página (vista amplia). */
const DIALOG_PAGE_SIZE = 25;

const STATUS_LABELS: Record<NotificationStatus, string> = {
  sent: "Enviada",
  queued: "En cola",
  failed: "Fallida",
  skipped: "Omitida",
};

/**
 * Registro de notificaciones enviadas a pacientes (SPEC A13): canal,
 * destinatario, plantilla, estado de entrega y fechas. Read-only y paginado.
 *
 * <paramref name="variant"/>:
 * <list type="bullet">
 *   <item><c>card</c>: tarjeta con cabecera de marca (uso embebido).</item>
 *   <item><c>dialog</c>: vista amplia dentro del diálogo de historial — sin
 *   cabecera propia, más filas por página y encabezado de tabla fijo.</item>
 * </list>
 */
export function NotificationsHistory({
  variant = "card",
}: {
  variant?: "card" | "dialog";
} = {}) {
  const t = useT();
  const isDialog = variant === "dialog";
  const pageSize = isDialog ? DIALOG_PAGE_SIZE : PAGE_SIZE;
  const [channel, setChannel] = useState<NotificationChannel | "all">("all");
  const [status, setStatus] = useState<NotificationStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useNotifications({
    channel: channel === "all" ? undefined : channel,
    status: status === "all" ? undefined : status,
    page,
    pageSize,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const isFiltered = channel !== "all" || status !== "all";

  // El banner de marca es blanco-sobre-azul; dentro del diálogo los filtros
  // viven en una fila neutra, así que el estilo del disparador cambia.
  const triggerClass = isDialog
    ? "h-8 w-40"
    : "h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70";

  const filters = (
    <div className="flex items-center gap-2">
      <Select
        value={channel}
        onValueChange={(value) => {
          setChannel((value ?? "all") as NotificationChannel | "all");
          setPage(1);
        }}
      >
        <SelectTrigger className={triggerClass} aria-label={t("Filtrar por canal")}>
          <SelectValue>
            {channel === "all"
              ? t("Todo canal")
              : channel === "sms"
                ? "SMS"
                : t("Comunidad")}
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
          className={triggerClass}
          aria-label={t("Filtrar por estado de entrega")}
        >
          <SelectValue>
            {status === "all" ? t("Todo estado") : t(STATUS_LABELS[status])}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Todo estado")}</SelectItem>
          {(Object.keys(STATUS_LABELS) as NotificationStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {t(STATUS_LABELS[s])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const header = (
    <SectionHeader
      title={t("Notificaciones enviadas")}
      description={t("Historial de entregas por canal y estado")}
      icon={History}
      variant="primary"
      actions={filters}
    />
  );

  return (
    <section
      className={
        isDialog
          ? "flex flex-col overflow-hidden rounded-xl border border-border"
          : "flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      }
    >
      {isDialog ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
          <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Filtros")}
          </span>
          {filters}
        </div>
      ) : (
        header
      )}

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
            <Table className={isDialog ? "w-full" : "min-w-[900px]"}>
              <TableHeader
                className={isDialog ? "sticky top-0 z-10 bg-card" : undefined}
              >
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
                      <DeliveryStatusBadge
                        status={notification.status}
                        label={t(STATUS_LABELS[notification.status])}
                      />
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
