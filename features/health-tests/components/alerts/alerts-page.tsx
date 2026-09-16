"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  MoreHorizontal,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  XCircle,
} from "lucide-react";

import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertsInsightsRail } from "./alerts-insights";

import { useAlerts } from "../../hooks/use-health-tests";
import type { AlertSeverity, AlertStatus, HealthAlert } from "../../types";
import { formatDate, initials } from "../../lib/format";
import { severityHex, tones } from "../shared/colors";
import { chipStyle } from "../shared/depth";
import { AlertStatusBadge, SeverityBadge } from "../shared/badges";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { NotificationsTimeline } from "./notifications-timeline";
import { NotifyWizard } from "./notify-wizard";

const STATUS_LABELS: Record<AlertStatus, string> = {
  activa: "Activa",
  "en-revision": "En revisión",
  atendida: "Atendida",
  cerrada: "Cerrada",
};

const STATUS_NEXT: Record<AlertStatus, AlertStatus[]> = {
  activa: ["en-revision", "atendida"],
  "en-revision": ["atendida", "activa"],
  atendida: ["cerrada", "activa"],
  cerrada: ["activa"],
};

const ALERT_PAGE_SIZE = 14;

const PILL_ACCENT = {
  destructive: tones.red,
  warning: tones.amber,
  info: tones.emerald,
  navy: tones.slate,
} as const;

function StatusPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof PILL_ACCENT;
}) {
  const accent = PILL_ACCENT[tone];

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3.5 shadow-sm transition-shadow hover:shadow-md">
      <span
        className="flex shrink-0 items-center justify-center rounded-lg"
        style={chipStyle(accent, 26)}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: accent.deep }}
      >
        {value}
      </span>
    </div>
  );
}

export function AlertsPage() {
  const t = useT();
  const { hasPermission } = useAuth();
  const canReview = hasPermission("HealthTests.Review");
  const { data, loading, error, reload, changeStatus } = useAlerts();

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all");
  const [status, setStatus] = useState<AlertStatus | "all">("all");
  const [indicator, setIndicator] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageState, setPageState] = useState({ key: "", page: 1 });

  const alerts = data?.alerts;

  const indicators = useMemo(() => {
    const unique = new Set<string>();
    (alerts ?? []).forEach((alert) => {
      if (alert.indicatorName) {
        unique.add(alert.indicatorName);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [alerts]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;

    return (alerts ?? [])
      .filter((alert) => {
        if (severity !== "all" && alert.severity !== severity) {
          return false;
        }
        if (status !== "all" && alert.status !== status) {
          return false;
        }
        if (indicator !== "all" && alert.indicatorName !== indicator) {
          return false;
        }
        if (fromTime !== null || toTime !== null) {
          const created = new Date(alert.createdAt).getTime();
          if (fromTime !== null && created < fromTime) {
            return false;
          }
          if (toTime !== null && created > toTime) {
            return false;
          }
        }
        if (term) {
          const patient = data?.patients.find((item) => item.id === alert.patientId);
          const haystack =
            `${patient?.firstName ?? ""} ${patient?.lastName ?? ""} ${alert.indicatorName}`.toLowerCase();
          if (!haystack.includes(term)) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [alerts, data?.patients, search, severity, status, indicator, from, to]);

  const filterKey = [search, severity, status, indicator, from, to].join("\u0000");
  const pageCount = Math.max(1, Math.ceil(filtered.length / ALERT_PAGE_SIZE));
  const alertPage = pageState.key === filterKey ? pageState.page : 1;
  const currentPage = Math.min(alertPage, pageCount);
  const pagedAlerts = useMemo(() => {
    const start = (currentPage - 1) * ALERT_PAGE_SIZE;
    return filtered.slice(start, start + ALERT_PAGE_SIZE);
  }, [currentPage, filtered]);

  const counts = useMemo(() => {
    const result: Record<AlertStatus, number> = {
      activa: 0,
      "en-revision": 0,
      atendida: 0,
      cerrada: 0,
    };
    (alerts ?? []).forEach((alert) => {
      result[alert.status] += 1;
    });
    return result;
  }, [alerts]);

  const selectedAlerts = useMemo(
    () => (alerts ?? []).filter((alert) => selectedIds.includes(alert.id)),
    [alerts, selectedIds],
  );

  // Permite cobrar TODOS los resultados del filtro, no solo la página visible.
  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((alert) => selectedIds.includes(alert.id));

  function selectAllFiltered() {
    setSelectedIds(filtered.map((alert) => alert.id));
  }

  const isFiltered =
    search.trim() !== "" ||
    severity !== "all" ||
    status !== "all" ||
    indicator !== "all" ||
    from !== "" ||
    to !== "";

  const additionalFilterCount = [
    indicator !== "all",
    from !== "",
    to !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setSeverity("all");
    setStatus("all");
    setIndicator("all");
    setFrom("");
    setTo("");
    setFiltersOpen(false);
  }

  function clearAdditionalFilters() {
    setIndicator("all");
    setFrom("");
    setTo("");
    setFiltersOpen(false);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    const pageIds = pagedAlerts.map((alert) => alert.id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds])),
    );
  }

  const header = (
    <PageHeader
      title={t("Alertas de tests")}
      description={t(
        "Resultados alarmantes que requieren atención: revisa, gestiona y cierra cada alerta",
      )}
      icon={BellRing}
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <TableSkeleton rows={7} />
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

  if (!data || !counts) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            icon={ShieldAlert}
            label={t("Activas")}
            value={counts.activa}
            tone="destructive"
          />
          <StatusPill
            icon={Eye}
            label={t("En revisión")}
            value={counts["en-revision"]}
            tone="warning"
          />
          <StatusPill
            icon={CheckCircle2}
            label={t("Atendidas")}
            value={counts.atendida}
            tone="info"
          />
          <StatusPill
            icon={XCircle}
            label={t("Cerradas")}
            value={counts.cerrada}
            tone="navy"
          />
        </div>

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

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
        <div className="order-2 flex flex-col gap-5 xl:order-1 xl:col-span-8">
          <section className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <SectionHeader
              title={t("Gestión de alertas")}
              description={t("Filtra por severidad, estado o paciente")}
              icon={Filter}
              variant="primary"
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 w-full pl-8"
                  placeholder={t("Buscar...")}
                  aria-label={t("Buscar alertas")}
                />
              </div>
              <Select
                value={severity}
                onValueChange={(value) => setSeverity(value as AlertSeverity | "all")}
                items={{
                  all: t("Toda severidad"),
                  critica: t("Crítica"),
                  alta: t("Alta"),
                  media: t("Media"),
                  baja: t("Baja"),
                }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Toda severidad")}</SelectItem>
                  <SelectItem value="critica">{t("Crítica")}</SelectItem>
                  <SelectItem value="alta">{t("Alta")}</SelectItem>
                  <SelectItem value="media">{t("Media")}</SelectItem>
                  <SelectItem value="baja">{t("Baja")}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as AlertStatus | "all")}
                items={{ all: t("Todo estado"), ...STATUS_LABELS }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todo estado")}</SelectItem>
                  {(Object.keys(STATUS_LABELS) as AlertStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" size="sm">
                      <SlidersHorizontal className="size-3.5" />
                      {t("Más filtros")}
                      {additionalFilterCount > 0 && (
                        <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {additionalFilterCount}
                        </span>
                      )}
                    </Button>
                  }
                />
                <PopoverContent align="end" className="w-80 p-4">
                  <PopoverHeader>
                    <PopoverTitle>{t("Más filtros")}</PopoverTitle>
                    <PopoverDescription>
                      {t("Refina la lista de alertas")}
                    </PopoverDescription>
                  </PopoverHeader>
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-foreground">
                        {t("Indicador")}
                      </span>
                      <Select
                        value={indicator}
                        onValueChange={(value) => setIndicator(value ?? "all")}
                        items={{
                          all: t("Todo indicador"),
                          ...Object.fromEntries(indicators.map((item) => [item, item])),
                        }}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("Todo indicador")}</SelectItem>
                          {indicators.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {t("Desde")}
                        </span>
                        <Input
                          type="date"
                          value={from}
                          onChange={(event) => setFrom(event.target.value)}
                          aria-label={t("Desde")}
                          className="h-9 w-full"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {t("Hasta")}
                        </span>
                        <Input
                          type="date"
                          value={to}
                          onChange={(event) => setTo(event.target.value)}
                          aria-label={t("Hasta")}
                          className="h-9 w-full"
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="text-[11px] text-muted-foreground">
                        {additionalFilterCount > 0
                          ? `${additionalFilterCount} ${t("filtros activos")}`
                          : t("Sin filtros adicionales")}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={additionalFilterCount === 0}
                        onClick={clearAdditionalFilters}
                      >
                        {t("Limpiar filtros")}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {selectedAlerts.length > 0 ? (
                <div className="ml-auto flex flex-wrap items-center gap-1.5 rounded-full bg-brand-gradient py-1 pl-3 pr-1 text-white shadow-sm">
                  <span className="text-[11.5px] font-medium">
                    {selectedAlerts.length} {t("seleccionadas")}
                  </span>
                  {!allFilteredSelected && filtered.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11.5px] text-white/85 hover:bg-white/15 hover:text-white"
                      onClick={selectAllFiltered}
                    >
                      {t("Seleccionar los")} {filtered.length}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 border border-white/35 bg-white/15 px-2.5 text-[11.5px] text-white hover:bg-white/25 hover:text-white"
                    onClick={() => setNotifyOpen(true)}
                  >
                    <Send className="size-3.5" />
                    {t("Notificar")} {selectedAlerts.length}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11.5px] text-white/85 hover:bg-white/15 hover:text-white"
                    onClick={() => setSelectedIds([])}
                  >
                    {t("Quitar selección")}
                  </Button>
                </div>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11.5px] text-muted-foreground">
                    {filtered.length} {t("alertas")}
                  </span>
                  {filtered.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11.5px]"
                      onClick={selectAllFiltered}
                    >
                      {t("Seleccionar los")} {filtered.length}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <ModuleEmptyState
                title={t("Sin alertas que mostrar")}
                description={
                  isFiltered
                    ? t("Ninguna alerta coincide con los filtros aplicados.")
                    : t("No hay alertas generadas por resultados de tests.")
                }
                filtered={isFiltered}
                onClear={clearFilters}
              />
            ) : (
              <>
                <AlertsTable
                  alerts={pagedAlerts}
                  patients={data.patients}
                  onChangeStatus={changeStatus}
                  canReview={canReview}
                  selectedIds={selectedIds}
                  onToggle={toggleSelected}
                  onToggleAll={toggleAll}
                />
                {pageCount > 1 && (
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                    <span className="text-[11.5px] text-muted-foreground">
                      {t("Página")} {currentPage} {t("de")} {pageCount} · {filtered.length} {t("alertas")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("Anterior")}
                        disabled={currentPage === 1}
                        onClick={() =>
                          setPageState({
                            key: filterKey,
                            page: Math.max(1, currentPage - 1),
                          })
                        }
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("Siguiente")}
                        disabled={currentPage === pageCount}
                        onClick={() =>
                          setPageState({
                            key: filterKey,
                            page: Math.min(pageCount, currentPage + 1),
                          })
                        }
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-auto flex items-center gap-2 border-t border-border px-5 py-3 text-[11.5px] text-muted-foreground">
              <Stethoscope className="size-3.5" />
              {t("Las transiciones de estado se aplican en esta sesión (mock)")}
            </div>
          </section>
        </div>

        <div className="order-1 flex flex-col gap-5 xl:order-2 xl:col-span-4">
          <AlertsInsightsRail />
          <NotificationsTimeline className="flex-1" />
        </div>
      </div>

      <NotifyWizard
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        alerts={selectedAlerts}
        patients={data.patients}
        onCompleted={() => setSelectedIds([])}
      />
    </div>
  );
}

interface AlertsTableProps {
  alerts: HealthAlert[];
  patients: { id: string; firstName: string; lastName: string }[];
  onChangeStatus: (id: string, status: AlertStatus) => void;
  canReview?: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

function AlertsTable({
  alerts,
  patients,
  onChangeStatus,
  canReview = true,
  selectedIds,
  onToggle,
  onToggleAll,
}: AlertsTableProps) {
  const t = useT();
  const allSelected =
    alerts.length > 0 && alerts.every((alert) => selectedIds.includes(alert.id));

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader
          className="[&_th]:text-[var(--brand-navy)]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, color-mix(in srgb, var(--brand-navy) 9%, transparent), color-mix(in srgb, var(--brand-teal) 12%, transparent))",
          }}
        >
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={t("Seleccionar alertas de esta página")}
                className="size-4 rounded border-border"
              />
            </TableHead>
            <TableHead>{t("Paciente")}</TableHead>
            <TableHead className="whitespace-nowrap">{t("Resultado")}</TableHead>
            <TableHead className="whitespace-nowrap">{t("Severidad")}</TableHead>
            <TableHead className="whitespace-nowrap">{t("Fecha")}</TableHead>
            <TableHead className="whitespace-nowrap">{t("Estado")}</TableHead>
            <TableHead className="whitespace-nowrap text-right">{t("Acciones")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const patient = patients.find((item) => item.id === alert.patientId);
            const selected = selectedIds.includes(alert.id);

            return (
              <TableRow key={alert.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(alert.id)}
                    aria-label={t("Seleccionar alerta")}
                    className="size-4 rounded border-border"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/health-tests/pacientes/${alert.patientId}`}
                    className="flex items-center gap-2.5"
                    title={alert.message}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: `${severityHex(alert.severity)}1A`,
                        color: severityHex(alert.severity),
                      }}
                    >
                      {initials(patient?.firstName ?? "", patient?.lastName ?? "")}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[12.5px] font-medium text-foreground">
                        {patient ? `${patient.firstName} ${patient.lastName}` : "—"}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {alert.indicatorName}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-[12.5px] text-foreground">
                  {alert.resultValue ? `${alert.resultValue}%` : "—"}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                  {formatDate(alert.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <AlertStatusBadge
                    status={alert.status}
                    label={STATUS_LABELS[alert.status]}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      nativeButton={false}
                      aria-label={t("Ver perfil del paciente")}
                      title={t("Perfil")}
                      render={<Link href={`/health-tests/pacientes/${alert.patientId}`} />}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                    {canReview && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label={t("Cambiar estado de la alerta")}
                            />
                          }
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("Cambiar estado")}</DropdownMenuLabel>
                          {STATUS_NEXT[alert.status].map((next) => (
                            <DropdownMenuItem
                              key={next}
                              onClick={() => onChangeStatus(alert.id, next)}
                            >
                              {STATUS_LABELS[next]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
