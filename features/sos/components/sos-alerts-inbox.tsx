"use client";

import { createElement, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSosAlerts } from "../hooks/use-sos-alerts";
import { formatDateTime, timeAgo } from "../utils/format";
import type {
  SosAlertListItemDto,
  SosAlertStatus,
  SosChannelStatus,
} from "../types";

/** Permiso granular que creará el backend (design D5/D8 del change sos-panic). */
const SOS_MANAGE_PERMISSION = "Sos.Alerts.Manage";

type StatusVisual = {
  label: string;
  rail: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
};

/** Identidad visual por estado del ciclo de vida (Activa es el caso crítico). */
const statusVisual: Record<SosAlertStatus, StatusVisual> = {
  Activa: {
    label: "Activa",
    rail: "#EF4444",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    badgeBg: "#FCEBEC",
    badgeText: "#B42318",
  },
  Atendida: {
    label: "Atendida",
    rail: "#10B981",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    badgeBg: "#E6F7EF",
    badgeText: "#0E7A4D",
  },
  Cancelada: {
    label: "Cancelada",
    rail: "#9CA3AF",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    badgeBg: "#F1F3F5",
    badgeText: "#4B5563",
  },
};

/** Resultado por canal con color semántico (sin PII: solo estado de canal). */
const channelStatusVisual: Record<
  SosChannelStatus,
  { label: string; color: string; background: string }
> = {
  Pendiente: { label: "Pendiente", color: "#4B5563", background: "#F1F3F5" },
  Enviado: { label: "Enviado", color: "#0E7A4D", background: "#E6F7EF" },
  Fallido: { label: "Fallido", color: "#B42318", background: "#FCEBEC" },
  Timeout: { label: "Timeout", color: "#92400E", background: "#FDF2E3" },
  NoConfigurado: {
    label: "No configurado",
    color: "#4B5563",
    background: "#F1F3F5",
  },
};

const statusChips: Array<{ value: SosAlertStatus | null; label: string }> = [
  { value: null, label: "Todas" },
  { value: "Activa", label: "Activas" },
  { value: "Atendida", label: "Atendidas" },
  { value: "Cancelada", label: "Canceladas" },
];

export function SosAlertsInbox() {
  const t = useT();
  const { hasPermission } = useAuth();
  const [status, setStatus] = useState<SosAlertStatus | null>(null);
  const [search, setSearch] = useState("");
  const [attending, setAttending] = useState<SosAlertListItemDto | null>(null);

  const authorized = hasPermission(SOS_MANAGE_PERMISSION);

  const {
    alerts,
    total,
    totalPages,
    loading,
    error,
    page,
    setPage,
    refetch,
    counts,
    attendingId,
    attendError,
    attend,
  } = useSosAlerts({ status: authorized ? status : null });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts;
    return alerts.filter((alert) =>
      [alert.patientName, alert.patientId].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [alerts, search]);

  const hasFilters = status !== null || search.trim() !== "";
  const activeCount = counts.Activa;

  const resetFilters = () => {
    setStatus(null);
    setSearch("");
  };

  const handleAttend = async () => {
    if (!attending) return;
    const succeeded = await attend(attending.id);
    if (succeeded) setAttending(null);
  };

  if (!authorized) {
    // Autorización real siempre en el backend: esto solo oculta la navegación.
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <ShieldAlert className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {t("Acceso denegado")}
        </p>
        <p className="max-w-sm text-[12.5px] text-muted-foreground">
          {t("Necesitás el permiso")}{" "}
          <code className="rounded bg-muted px-1">{SOS_MANAGE_PERMISSION}</code>{" "}
          {t("para ver esta sección.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t("Alertas SOS")}
        description={
          activeCount > 0
            ? t("{active} activas por atender · {total} en total", {
                active: String(activeCount),
                total: String(total),
              })
            : t("{total} alertas · ninguna activa", { total: String(total) })
        }
        icon={Siren}
        actions={
          <Button
            size="sm"
            className="gap-1.5 border-transparent bg-white text-[var(--sidebar)] shadow-sm hover:bg-white/90 hover:text-[var(--sidebar)]"
            onClick={refetch}
            disabled={loading}
            aria-label={t("Actualizar alertas SOS")}
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("Actualizar")}
          </Button>
        }
      />

      {error && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p className="flex items-center gap-2">
            <Siren className="size-4" aria-hidden />
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
          label={t("Activas")}
          value={String(counts.Activa)}
          icon={Siren}
          variant="destructive"
          context={t("atención inmediata")}
        />
        <StatCard
          label={t("Atendidas")}
          value={String(counts.Atendida)}
          icon={CheckCheck}
          variant="success"
          context={t("gestionadas por el equipo")}
        />
        <StatCard
          label={t("Canceladas")}
          value={String(counts.Cancelada)}
          icon={X}
          variant="info"
          context={t("cerradas por el paciente")}
        />
        <StatCard
          label={t("En la vista")}
          value={String(alerts.length)}
          icon={Bell}
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
              placeholder={t("Buscar alerta por paciente…")}
              className="pl-9 pr-9"
              aria-label={t("Buscar alertas SOS")}
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

        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label={t("Filtrar por estado")}
        >
          {statusChips.map((chip) => {
            const active = status === chip.value;
            const count =
              chip.value === null
                ? counts.Activa + counts.Atendida + counts.Cancelada
                : counts[chip.value];
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setStatus(chip.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-transparent bg-[var(--sidebar)] text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-[var(--sidebar)]/40 hover:bg-[var(--sidebar)]/5 hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                {t(chip.label)}
                <span
                  className={`rounded-full px-1.5 text-[10.5px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            {hasFilters ? (
              <Search className="size-6 text-muted-foreground" aria-hidden />
            ) : (
              <Siren className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {hasFilters
              ? t("Sin alertas que coincidan")
              : t("No hay alertas SOS")}
          </p>
          <p className="max-w-sm text-[12.5px] text-muted-foreground">
            {hasFilters
              ? t("Prueba con otros filtros o limpia la búsqueda.")
              : t("Las alertas de pánico de tus pacientes aparecerán aquí.")}
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
          {filtered.map((alert) => (
            <SosAlertCard
              key={alert.id}
              alert={alert}
              busy={attendingId === alert.id}
              onAttend={() => setAttending(alert)}
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

      {/* Confirmación de atención (transición terminal del backend) */}
      <Dialog
        open={attending !== null}
        onOpenChange={(open) => {
          if (!open) setAttending(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[var(--sidebar)] to-[color-mix(in_srgb,var(--sidebar)_94%,var(--primary))] px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-destructive shadow-sm">
              <Siren className="size-4" aria-hidden />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="text-[14px] font-semibold text-white">
                {t("Atender alerta SOS")}
              </DialogTitle>
              <DialogDescription className="text-[11.5px] leading-snug text-white/75">
                {attending?.patientName
                  ? t(
                      "Marca la alerta de {name} como atendida. Esta acción es definitiva.",
                      { name: attending.patientName },
                    )
                  : t(
                      "Marca la alerta como atendida. Esta acción es definitiva.",
                    )}
              </DialogDescription>
            </div>
          </div>
          {attendError && (
            <p
              role="alert"
              className="rounded-lg bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
            >
              {t(attendError)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttending(null)}>
              {t("Cancelar")}
            </Button>
            <Button
              onClick={handleAttend}
              disabled={attendingId !== null}
              className="gap-1.5"
            >
              <Siren className="size-4" aria-hidden />
              {attendingId ? t("Atendiendo…") : t("Atender")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SosAlertCard({
  alert,
  busy,
  onAttend,
}: {
  alert: SosAlertListItemDto;
  busy: boolean;
  onAttend: () => void;
}) {
  const t = useT();
  const visual = statusVisual[alert.status];
  const isActive = alert.status === "Activa";

  return (
    <li
      className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeft: `4px solid ${visual.rail}` }}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${visual.iconBg} ${visual.iconColor}`}
        >
          <Siren className="size-5" aria-hidden />
          {isActive && (
            <span className="absolute -right-1 -top-1 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-foreground">
              {alert.patientName ?? t("Paciente")}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{
                backgroundColor: visual.badgeBg,
                color: visual.badgeText,
              }}
            >
              {t(visual.label)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            <span
              className="inline-flex items-center gap-1"
              title={formatDateTime(alert.createdAt)}
            >
              <CalendarClock className="size-3" aria-hidden />
              {t("Activada")} {timeAgo(alert.createdAt)}
            </span>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label={t("Canales de notificación")}
          >
            <ChannelChip label="SMS" status={alert.smsChannelStatus} />
            <ChannelChip label={t("Push")} status={alert.pushChannelStatus} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isActive && (
            <Button
              size="sm"
              onClick={onAttend}
              disabled={busy}
              className="gap-1.5 bg-[var(--sidebar)] text-white shadow-sm hover:bg-[var(--sidebar)]/90"
              aria-label={t("Atender alerta de {name}", {
                name: alert.patientName ?? t("el paciente"),
              })}
            >
              <Siren className="size-3.5" aria-hidden />
              {busy ? t("Atendiendo…") : t("Atender")}
            </Button>
          )}
          <span
            className="text-[11px] text-muted-foreground/70"
            title={formatDateTime(alert.createdAt)}
          >
            {formatDateTime(alert.createdAt)}
          </span>
        </div>
      </div>
    </li>
  );
}

function ChannelChip({
  label,
  status,
}: {
  label: string;
  status: SosChannelStatus;
}) {
  const t = useT();
  const visual = channelStatusVisual[status];
  const Icon: LucideIcon = label === "SMS" ? MessageSquare : Bell;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ backgroundColor: visual.background, color: visual.color }}
      title={`${label} · ${t(visual.label)}`}
    >
      {createElement(Icon, { className: "size-3", "aria-hidden": true })}
      {label}: {t(visual.label)}
    </span>
  );
}
