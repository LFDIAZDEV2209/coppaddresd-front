"use client";

import Link from "next/link";
import { BellRing, History, MailWarning, Send } from "lucide-react";

import { cn } from "@/lib/utils";

import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { useNotifications } from "../../hooks/use-notifications";
import type { NotificationStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { notificationStatusTones, tones } from "../shared/colors";
import { chipStyle, dotStyle } from "../shared/depth";
import { DeliveryStatusBadge } from "../shared/badges";
import { TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

const STATUS_LABELS: Record<NotificationStatus, string> = {
  sent: "Enviada",
  queued: "En cola",
  failed: "Fallida",
  skipped: "Omitida",
};

/** Punto de estado de entrega con brillo (verde/neutro/rojo/ámbar). */
function statusDotStyle(status: NotificationStatus) {
  return dotStyle(
    notificationStatusTones[status] ?? notificationStatusTones.queued,
  );
}

const RECENT_SIZE = 3;

/**
 * Actividad reciente del rail: últimas entregas en formato línea de tiempo.
 * El registro completo vive en la vista /health-tests/alertas/notificaciones.
 */
export function NotificationsTimeline({
  className,
}: {
  className?: string;
} = {}) {
  const t = useT();
  const { data, loading, error, reload } = useNotifications({
    page: 1,
    pageSize: RECENT_SIZE,
  });

  const items = data?.items ?? [];

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Cabecera compacta del rail: el título corto evita el truncado
          y el botón queda legible sobre el degradado de marca. */}
      <div className="flex items-center gap-3 bg-brand-gradient px-4 py-3 text-white">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={chipStyle(tones.sky, 32)}
        >
          <BellRing className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-bold text-white">
            {t("Notificaciones")}
          </h2>
          <p className="truncate text-[11px] text-white/75">
            {t("Actividad reciente")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          nativeButton={false}
          render={<Link href="/health-tests/alertas/notificaciones" />}
          aria-label={t("Ver historial completo")}
          title={t("Ver historial completo")}
        >
          <History className="size-3.5" />
          <span className="hidden sm:inline">{t("Ver historial completo")}</span>
        </Button>
      </div>

      {loading && !data ? (
        <div className="p-5">
          <TableSkeleton rows={4} />
        </div>
      ) : error && !data ? (
        <div className="p-5">
          <ModuleErrorState message={error} onRetry={reload} />
        </div>
      ) : items.length === 0 ? (
        <ModuleEmptyState
          title={t("Sin notificaciones")}
          description={t("Aún no se han enviado notificaciones a pacientes.")}
          className="m-5"
        />
      ) : (
        <ol className="relative flex flex-1 flex-col justify-between gap-5 px-5 py-5 sm:pl-9">
          <span
            className="absolute left-6 top-8 bottom-8 hidden w-px bg-border sm:block"
            aria-hidden
          />
          {items.map((item) => (
            <li key={item.id} className="relative flex gap-4 sm:pl-7">
              <span
                className="absolute -left-3 top-1 hidden size-4 items-center justify-center rounded-full border border-border bg-card sm:flex"
                aria-hidden
              >
                <span
                  className="size-2 rounded-full"
                  style={statusDotStyle(item.status)}
                />
              </span>
              <div className="flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: (
                          item.channel === "sms" ? tones.sky : tones.slate
                        ).soft,
                        color: (item.channel === "sms" ? tones.sky : tones.slate)
                          .softText,
                      }}
                      aria-hidden
                    >
                      {item.channel === "sms" ? (
                        <Send className="size-3" />
                      ) : (
                        <MailWarning className="size-3" />
                      )}
                    </span>
                    {item.channel === "sms" ? t("SMS") : t("Comunidad")}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate text-muted-foreground">
                    {item.patientName ?? "—"}
                  </span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {formatDate(item.sentAt ?? item.createdAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-foreground">
                  {item.renderedBody}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                  <span>
                    {item.templateName ?? t("Sin plantilla (texto libre)")}
                  </span>
                  <span>·</span>
                  <DeliveryStatusBadge
                    status={item.status}
                    label={t(STATUS_LABELS[item.status])}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
