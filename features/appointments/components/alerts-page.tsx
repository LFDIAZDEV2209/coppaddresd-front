"use client";

import { useT } from "@/providers/i18n-provider";
import { createElement, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownUp,
  Bell,
  BellOff,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarSync,
  CalendarX,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Hourglass,
  Info,
  Inbox,
  LayoutList,
  RefreshCw,
  Search,
  Settings,
  UserMinus,
  UserPlus,
  UserX,
  Video,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAlerts } from "../hooks/use-alerts";
import { formatDateTime, timeAgo } from "../utils/format";
import type { AlertSeverity, AlertType, AppointmentAlertDto } from "../types";

const ALL = "__all__";

/** Identidad visual por tipo de alerta: icono + etiqueta. */
const alertTypeMeta: Record<AlertType, { icon: LucideIcon; label: string }> = {
  NewRequest: { icon: FileText, label: "Nueva solicitud" },
  RequestApproved: { icon: CheckCheck, label: "Solicitud aprobada" },
  RequestRejected: { icon: XCircle, label: "Solicitud rechazada" },
  NewAppointment: { icon: CalendarPlus, label: "Nueva cita" },
  UpcomingAppointment: { icon: CalendarClock, label: "Cita próxima" },
  AppointmentRescheduled: { icon: CalendarSync, label: "Cita reprogramada" },
  AppointmentCancelled: { icon: CalendarX, label: "Cita cancelada" },
  PatientWaiting: { icon: Hourglass, label: "Paciente esperando" },
  PatientJoined: { icon: UserPlus, label: "Paciente en la sala" },
  ParticipantLeft: { icon: UserMinus, label: "Participante salió" },
  SessionEnded: { icon: Video, label: "Sesión finalizada" },
  NoShow: { icon: UserX, label: "No asistió" },
  System: { icon: Settings, label: "Sistema" },
};

/** Identidad visual por severidad: colores semánticos y fondos suaves. */
const severityMeta: Record<
  AlertSeverity,
  {
    label: string;
    accent: string;
    textColor: string;
    iconBg: string;
    iconColor: string;
    softBg: string;
  }
> = {
  Info: {
    label: "Info",
    accent: "#0EA5E9",
    textColor: "#0369A1",
    iconBg: "bg-info/10",
    iconColor: "text-info",
    softBg: "bg-info-soft",
  },
  Warning: {
    label: "Advertencia",
    accent: "#F59E0B",
    textColor: "#92400E",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    softBg: "bg-warning-soft",
  },
  Critical: {
    label: "Crítica",
    accent: "#EF4444",
    textColor: "#B91C1C",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    softBg: "bg-destructive-soft",
  },
};

const severityChips: Array<{
  value: AlertSeverity | typeof ALL;
  label: string;
}> = [
  { value: ALL, label: "Todas" },
  { value: "Critical", label: "Críticas" },
  { value: "Warning", label: "Advertencias" },
  { value: "Info", label: "Informativas" },
];

type OrderBy = "recent" | "oldest" | "severity";

export function AlertsPage() {
  const t = useT();
  const {
    alerts,
    unread,
    total,
    loading,
    error,
    page,
    setPage,
    refetch,
    handleRead,
    handleReadAll,
  } = useAlerts();

  const [severity, setSeverity] = useState<AlertSeverity | typeof ALL>(ALL);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [orderBy, setOrderBy] = useState<OrderBy>("recent");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const readAll = async () => {
    setBusy(true);
    try {
      await handleReadAll();
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const hasFilters =
    severity !== ALL ||
    search.trim() !== "" ||
    unreadOnly ||
    orderBy !== "recent";

  const counts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.severity === "Critical").length,
      warning: alerts.filter((a) => a.severity === "Warning").length,
      info: alerts.filter((a) => a.severity === "Info").length,
    }),
    [alerts],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = alerts.filter((alert) => {
      if (severity !== ALL && alert.severity !== severity) return false;
      if (unreadOnly && alert.readAt !== null) return false;
      if (!query) return true;
      return [alert.title, alert.body].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
    const severityRank: Record<AlertSeverity, number> = {
      Critical: 0,
      Warning: 1,
      Info: 2,
    };
    result = [...result].sort((a, b) => {
      switch (orderBy) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "severity":
          return (
            severityRank[a.severity] - severityRank[b.severity] ||
            b.createdAt.localeCompare(a.createdAt)
          );
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return result;
  }, [alerts, severity, search, unreadOnly, orderBy]);

  const resetFilters = () => {
    setSeverity(ALL);
    setSearch("");
    setUnreadOnly(false);
    setOrderBy("recent");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t("Alertas")}
        description={
          unread > 0
            ? t("{unread} alertas sin leer · {total} en total", {
                unread: String(unread),
                total: String(total),
              })
            : t("{total} alertas · todas leídas", { total: String(total) })
        }
        icon={Bell}
        actions={
          <>
            <Button
              size="sm"
              className="gap-1.5 border-transparent bg-white text-[var(--sidebar)] shadow-sm hover:bg-white/90 hover:text-[var(--sidebar)]"
              onClick={refetch}
              disabled={loading}
              aria-label={t("Actualizar alertas")}
            >
              <RefreshCw
                className={cn("size-4", loading && "animate-spin")}
                aria-hidden
              />
              {t("Actualizar")}
            </Button>
            {unread > 0 && (
              <Button
                size="sm"
                className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={readAll}
                disabled={busy}
              >
                <CheckCheck className="size-4" aria-hidden />
                {busy ? t("Marcando…") : t("Marcar todas")}
              </Button>
            )}
          </>
        }
      />

      {error && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p className="flex items-center gap-2">
            <AlertOctagon className="size-4" aria-hidden />
            {t(error)}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={refetch}
            className="shrink-0 gap-1.5"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t("Reintentar")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Sin leer")}
          value={String(unread)}
          icon={Bell}
          variant="info"
          context={t("requieren atención")}
        />
        <StatCard
          label={t("Críticas")}
          value={String(counts.critical)}
          icon={AlertOctagon}
          variant="destructive"
          context={t("atención inmediata")}
        />
        <StatCard
          label={t("Advertencias")}
          value={String(counts.warning)}
          icon={AlertTriangle}
          variant="warning"
          context={t("próximas a vencer")}
        />
        <StatCard
          label={t("En la vista")}
          value={String(alerts.length)}
          icon={LayoutList}
          variant="navy"
          context={t("página {page} · {total} en total", {
            page: String(page),
            total: String(total),
          })}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Buscar alerta por título o contenido…")}
              className="pl-9 pr-9"
              aria-label={t("Buscar alertas")}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t("Limpiar búsqueda")}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="order-by"
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
            >
              <ArrowDownUp className="size-3.5" aria-hidden />
              {t("Orden")}
            </label>
            <select
              id="order-by"
              value={orderBy}
              onChange={(event) => setOrderBy(event.target.value as OrderBy)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label={t("Ordenar alertas")}
            >
              <option value="recent">{t("Más recientes")}</option>
              <option value="oldest">{t("Más antiguas")}</option>
              <option value="severity">{t("Por severidad")}</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              <X className="size-3.5" aria-hidden />
              {t("Limpiar")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 overflow-x-auto pb-0.5"
            role="group"
            aria-label={t("Filtrar por severidad")}
          >
            {severityChips.map((chip) => {
              const active = (severity || ALL) === chip.value;
              const icon =
                chip.value === "Critical"
                  ? AlertOctagon
                  : chip.value === "Warning"
                    ? AlertTriangle
                    : chip.value === "Info"
                      ? Info
                      : Inbox;
              const count =
                chip.value === ALL
                  ? alerts.length
                  : chip.value === "Critical"
                    ? counts.critical
                    : chip.value === "Warning"
                      ? counts.warning
                      : counts.info;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() =>
                    setSeverity(chip.value === ALL ? ALL : chip.value)
                  }
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "border-transparent bg-[var(--sidebar)] text-white shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-[var(--sidebar)]/40 hover:bg-[var(--sidebar)]/5 hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {createElement(icon, {
                    className: "size-3.5",
                    "aria-hidden": true,
                  })}
                  {t(chip.label)}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10.5px] font-semibold",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setUnreadOnly((value) => !value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              unreadOnly
                ? "border-transparent bg-[var(--sidebar)] text-white shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-[var(--sidebar)]/40 hover:bg-[var(--sidebar)]/5 hover:text-foreground",
            )}
            aria-pressed={unreadOnly}
          >
            {createElement(BellOff, {
              className: "size-3.5",
              "aria-hidden": true,
            })}
            {t("Solo sin leer")}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10.5px] font-semibold",
                unreadOnly
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {alerts.filter((a) => a.readAt === null).length}
            </span>
          </button>
        </div>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[92px] w-full rounded-2xl"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            {hasFilters ? (
              <Search className="size-6 text-muted-foreground" aria-hidden />
            ) : (
              <BellOff className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {hasFilters ? t("Sin alertas que coincidan") : t("No hay alertas")}
          </p>
          <p className="max-w-sm text-[12.5px] text-muted-foreground">
            {hasFilters
              ? t("Prueba con otros filtros o limpia la búsqueda.")
              : t("Los eventos de tus citas y solicitudes aparecerán aquí.")}
          </p>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={resetFilters}
            >
              <X className="size-3.5" aria-hidden />
              {t("Limpiar filtros")}
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              index={index}
              expanded={expandedId === alert.id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === alert.id ? null : alert.id,
                )
              }
              onRead={() => void handleRead(alert.id)}
            />
          ))}
        </ul>
      )}

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("Anterior")}
          </Button>
          <span className="text-[12px] text-muted-foreground">
            {t("Página {page} de {totalPages}", {
              page: String(page),
              totalPages: String(totalPages),
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("Siguiente")}
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  index,
  expanded,
  onToggle,
  onRead,
}: {
  alert: AppointmentAlertDto;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRead: () => void;
}) {
  const t = useT();
  const severity = severityMeta[alert.severity];
  const type = alertTypeMeta[alert.type] ?? alertTypeMeta.System;
  const unreadAlert = alert.readAt === null;
  const criticalUnread = unreadAlert && alert.severity === "Critical";

  return (
    <li
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
        unreadAlert
          ? "border-border/80 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "border-border/60 hover:shadow-sm",
        unreadAlert && severity.softBg,
      )}
      style={{
        borderLeft: `4px solid ${severity.accent}`,
        animationDelay: `${Math.min(index, 10) * 45}ms`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105",
            severity.iconBg,
            severity.iconColor,
          )}
        >
          {createElement(type.icon, {
            className: "size-5",
            "aria-hidden": true,
          })}
          {criticalUnread && (
            <span className="absolute -right-1 -top-1 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-col gap-1 text-left"
          aria-expanded={expanded}
          aria-label={
            unreadAlert
              ? t("Alerta sin leer: {title}", { title: alert.title })
              : t("Alerta: {title}", { title: alert.title })
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-foreground">
              {alert.title}
            </span>
            {unreadAlert && (
              <Badge className="bg-[var(--sidebar)] text-white">{t("Nueva")}</Badge>
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{
                backgroundColor: `${severity.accent}1A`,
                color: severity.textColor,
              }}
            >
              {t(severity.label)}
            </span>
          </div>

          <p
            className={cn(
              "text-[12.5px] leading-snug text-muted-foreground",
              !expanded && "line-clamp-2",
            )}
          >
            {alert.body ?? t("Sin detalle adicional.")}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70">
            <span className="inline-flex items-center gap-1">
              {createElement(type.icon, {
                className: "size-3",
                "aria-hidden": true,
              })}
              {t(type.label)}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title={formatDateTime(alert.createdAt)}
            >
              <Clock className="size-3" aria-hidden />
              {timeAgo(alert.createdAt)}
            </span>
          </div>

          {/* Detalle expandible */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2.5 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck
                    className="size-3.5 text-[var(--sidebar)]"
                    aria-hidden
                  />
                  {formatDateTime(alert.createdAt)}
                </span>
                {alert.relatedAppointmentId && (
                  <Link
                    href={`/appointments/citas/${alert.relatedAppointmentId}`}
                    className="inline-flex items-center gap-1 font-medium text-[var(--sidebar)] underline-offset-2 hover:underline"
                    aria-label={t("Abrir cita relacionada")}
                  >
                    <Eye className="size-3.5" aria-hidden />
                    {t("Ver cita relacionada")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {unreadAlert && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-[var(--sidebar)]"
              onClick={onRead}
              aria-label={t("Marcar como leída: {title}", {
                title: alert.title,
              })}
            >
              <CheckCheck className="size-3.5" aria-hidden />
              {t("Leída")}
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onToggle}
            aria-label={
              expanded ? t("Contraer detalle") : t("Expandir detalle")
            }
            className="text-muted-foreground hover:text-[var(--sidebar)]"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </Button>
        </div>
      </div>
    </li>
  );
}
