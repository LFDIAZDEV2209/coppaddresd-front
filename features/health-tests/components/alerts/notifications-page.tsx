"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  MailWarning,
  Search,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
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
import { useNotificationCharts, useNotifications } from "../../hooks/use-notifications";
import type {
  HealthNotification,
  NotificationChannel,
  NotificationStatus,
} from "../../types";
import { formatDate } from "../../lib/format";
import { DeliveryStatusBadge } from "../shared/badges";
import { ChartCard, ChartCardSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<NotificationStatus, string> = {
  sent: "Enviada",
  queued: "En cola",
  failed: "Fallida",
  skipped: "Omitida",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  community: "Comunidad",
  sms: "SMS",
};

const CHANNEL_COLORS: Record<string, string> = {
  community: "#8B5CF6",
  sms: "#0EA5E9",
};

const KPI_TONES: Record<string, { accent: string; soft: string }> = {
  sent: { accent: "#047857", soft: "#D1FAE5" },
  queued: { accent: "#475569", soft: "#F1F5F9" },
  failed: { accent: "#B91C1C", soft: "#FEE2E2" },
  skipped: { accent: "#92400E", soft: "#FEF3C7" },
};

function toPoints(record: Record<string, number> | undefined) {
  return Object.entries(record ?? {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, value }));
}

/** Historial completo de notificaciones enviadas a pacientes. */
export function NotificationsPage() {
  const t = useT();
  const [channel, setChannel] = useState<NotificationChannel | "all">("all");
  const [status, setStatus] = useState<NotificationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: "",
    page: 1,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filterKey = [channel, status, search, from, to].join("\u0000");
  const page = pageState.key === filterKey ? pageState.page : 1;

  const { data, loading, error, reload } = useNotifications({
    channel: channel === "all" ? undefined : channel,
    status: status === "all" ? undefined : status,
    search: search.trim() === "" ? undefined : search.trim(),
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const charts = useNotificationCharts(30);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered =
    channel !== "all" ||
    status !== "all" ||
    search.trim() !== "" ||
    from !== "" ||
    to !== "";

  const statusCounts = useMemo(() => {
    const entries = Object.entries(charts.data?.notificationsByStatus ?? {});
    const byKey = new Map(entries);
    return (Object.keys(STATUS_LABELS) as NotificationStatus[]).map((key) => ({
      key,
      value: byKey.get(key) ?? 0,
    }));
  }, [charts.data]);

  const channelPoints = useMemo(
    () => toPoints(charts.data?.notificationsByChannel),
    [charts.data],
  );
  const dayPoints = useMemo(
    () =>
      (charts.data?.notificationsByDay ?? []).map((point) => ({
        label: point.label.slice(5),
        value: point.value,
      })),
    [charts.data],
  );

  function clearFilters() {
    setChannel("all");
    setStatus("all");
    setSearch("");
    setFrom("");
    setTo("");
  }

  function downloadCsv() {
    const header = [
      t("Paciente"),
      t("Canal"),
      t("Idioma"),
      t("Destinatario"),
      t("Plantilla"),
      t("Estado"),
      t("Enviada"),
      t("Detalle"),
    ];
    const rows = items.map((item) => [
      item.patientName ?? "—",
      t(CHANNEL_LABELS[item.channel]),
      item.language === "en" ? "English" : "Español",
      item.recipient,
      item.templateName ?? t("Sin plantilla (texto libre)"),
      t(STATUS_LABELS[item.status]),
      formatDate(item.sentAt ?? item.createdAt),
      item.error ?? item.renderedBody,
    ]);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escape(String(cell))).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "notificaciones.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const header = (
    <PageHeader
      title={t("Notificaciones enviadas")}
      description={t("Historial de entregas por canal y estado")}
      icon={History}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/health-tests/alertas/notificar" />}
          >
            <Send className="size-3.5" />
            {t("Notificar a pacientes")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/health-tests/alertas/plantillas" />}
          >
            <Sparkles className="size-3.5" />
            {t("Estudio de plantillas")}
          </Button>
        </div>
      }
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {header}
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      {/* KPIs + gráficos */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-4">
          <div className="grid grid-cols-2 gap-3">
            {statusCounts.map((entry) => {
              const tone = KPI_TONES[entry.key];
              return (
                <div
                  key={entry.key}
                  className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t(STATUS_LABELS[entry.key])}
                  </span>
                  <span
                    className="text-xl font-bold tabular-nums"
                    style={{ color: tone.accent }}
                  >
                    {entry.value}
                  </span>
                </div>
              );
            })}
          </div>
          {channelPoints.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
              {channelPoints.map((point) => (
                <span
                  key={point.key}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: CHANNEL_COLORS[point.key] ?? "#94A3B8",
                    color: CHANNEL_COLORS[point.key] ?? "#94A3B8",
                  }}
                >
                  {t(CHANNEL_LABELS[point.key as NotificationChannel] ?? point.key)}
                  <strong className="tabular-nums">{point.value}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:col-span-8 xl:grid-cols-2">
          {charts.loading && !charts.data ? (
            <>
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </>
          ) : (
            <>
              <ChartCard
                title={t("Envíos por día (30 días)")}
                description={t("Notificaciones entregadas en el periodo")}
                icon={TrendingUp}
              >
                {dayPoints.length === 0 ? (
                  <p className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
                    {t("Sin actividad en el periodo")}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={dayPoints}>
                      <defs>
                        <linearGradient id="notif-day-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        width={28}
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#0EA5E9"
                        strokeWidth={2}
                        fill="url(#notif-day-fill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard
                title={t("Por canal")}
                description={t("Distribución de entregas por canal")}
                icon={Send}
              >
                {channelPoints.length === 0 ? (
                  <p className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
                    {t("Sin actividad en el periodo")}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={channelPoints}
                        dataKey="value"
                        nameKey="key"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        stroke="#FFFFFF"
                        strokeWidth={1}
                      >
                        {channelPoints.map((point) => (
                          <Cell
                            key={point.key}
                            fill={CHANNEL_COLORS[point.key] ?? "#94A3B8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </>
          )}
        </div>
      </div>

      {/* Registro completo */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Registro de entregas")}
          description={t("Filtra por canal, estado o paciente")}
          icon={BellRing}
          variant="primary"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/70" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("Buscar paciente...")}
                  aria-label={t("Buscar por paciente")}
                  className="h-8 w-44 border-white/25 bg-white/15 pl-8 text-white placeholder:text-white/60 [&::placeholder]:text-white/60"
                />
              </div>
              <Select
                value={channel}
                onValueChange={(value) =>
                  setChannel(value as NotificationChannel | "all")
                }
                items={{ all: t("Todo canal"), community: t("Comunidad"), sms: "SMS" }}
              >
                <SelectTrigger className="h-8 w-32 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todo canal")}</SelectItem>
                  <SelectItem value="community">{t("Comunidad")}</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as NotificationStatus | "all")}
                items={{
                  all: t("Todo estado"),
                  ...Object.fromEntries(
                    (Object.keys(STATUS_LABELS) as NotificationStatus[]).map((key) => [
                      key,
                      t(STATUS_LABELS[key]),
                    ]),
                  ),
                }}
              >
                <SelectTrigger className="h-8 w-32 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todo estado")}</SelectItem>
                  {(Object.keys(STATUS_LABELS) as NotificationStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(STATUS_LABELS[key])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                aria-label={t("Desde")}
                className="h-8 w-36 border-white/25 bg-white/15 text-white [&>svg]:text-white/70"
              />
              <Input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                aria-label={t("Hasta")}
                className="h-8 w-36 border-white/25 bg-white/15 text-white [&>svg]:text-white/70"
              />
              {isFiltered && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/15 hover:text-white"
                  onClick={clearFilters}
                >
                  {t("Limpiar filtros")}
                </Button>
              )}
            </div>
          }
        />

        {items.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin notificaciones")}
            description={
              isFiltered
                ? t("Ninguna notificación coincide con los filtros aplicados.")
                : t("Aún no se han enviado notificaciones a pacientes.")
            }
            filtered={isFiltered}
            onClear={clearFilters}
            className="m-5"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="[&_th]:text-[var(--brand-navy)]">
                  <TableRow>
                    <TableHead>{t("Paciente")}</TableHead>
                    <TableHead>{t("Canal")}</TableHead>
                    <TableHead>{t("Idioma")}</TableHead>
                    <TableHead>{t("Destinatario")}</TableHead>
                    <TableHead>{t("Plantilla")}</TableHead>
                    <TableHead>{t("Estado")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("Enviada")}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      {t("Detalle")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: HealthNotification) => {
                    const expanded = expandedId === item.id;
                    return (
                      <>
                        <TableRow key={item.id}>
                          <TableCell className="text-[12.5px]">
                            {item.patientName ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              {item.channel === "sms" ? (
                                <Send className="size-3.5" />
                              ) : (
                                <MailWarning className="size-3.5" />
                              )}
                              {t(CHANNEL_LABELS[item.channel])}
                            </span>
                          </TableCell>
                          <TableCell className="text-[12px] text-muted-foreground">
                            {item.language === "en" ? "English" : "Español"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-[12px] text-muted-foreground">
                            {item.recipient}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-[12.5px]">
                            {item.templateName ?? t("Sin plantilla (texto libre)")}
                          </TableCell>
                          <TableCell>
                            <DeliveryStatusBadge
                              status={item.status}
                              label={t(STATUS_LABELS[item.status])}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                            {formatDate(item.sentAt ?? item.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={t("Ver detalle de la entrega")}
                              onClick={() => setExpandedId(expanded ? null : item.id)}
                            >
                              <ChevronDown
                                className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                              />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`${item.id}-detail`} className="bg-muted/30">
                            <TableCell colSpan={8} className="whitespace-normal">
                              <div className="flex flex-col gap-2 py-1 text-[12px]">
                                <p className="text-foreground">{item.renderedBody}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
                                  <span>
                                    {t("Proveedor")}: {item.provider}
                                  </span>
                                  {item.providerMessageId && (
                                    <span>
                                      {t("Id del proveedor")}: {item.providerMessageId}
                                    </span>
                                  )}
                                  <span>
                                    {t("Idioma")}:{" "}
                                    {item.language === "en" ? "English" : "Español"}
                                  </span>
                                  {item.error && (
                                    <span className="text-destructive">
                                      {t("Error")}: {item.error}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
              <span className="text-[11.5px] text-muted-foreground">
                {t("Página")} {page} {t("de")} {totalPages} · {total} {t("registros")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadCsv()}
                >
                  <Download className="size-3.5" />
                  {t("Descargar CSV")}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("Anterior")}
                  disabled={page <= 1}
                  onClick={() =>
                    setPageState({ key: filterKey, page: Math.max(1, page - 1) })
                  }
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("Siguiente")}
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPageState({
                      key: filterKey,
                      page: Math.min(totalPages, page + 1),
                    })
                  }
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
