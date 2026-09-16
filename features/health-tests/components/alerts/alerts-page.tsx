"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  Search,
  Send,
  ShieldAlert,
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
import { StatCard } from "@/components/feedback/stat-card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAlerts } from "../../hooks/use-health-tests";
import type { AlertSeverity, AlertStatus, HealthAlert } from "../../types";
import { formatDate, initials } from "../../lib/format";
import { severityHex } from "../shared/colors";
import { SeverityBadge } from "../shared/badges";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { AlertsCharts } from "./alerts-charts";
import { NotificationsHistory } from "./notifications-history";
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

function statusColor(status: AlertStatus): string {
  switch (status) {
    case "activa":
      return "var(--destructive)";
    case "en-revision":
      return "var(--warning)";
    case "atendida":
      return "var(--info)";
    default:
      return "var(--muted-foreground)";
  }
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

  const isFiltered =
    search.trim() !== "" ||
    severity !== "all" ||
    status !== "all" ||
    indicator !== "all" ||
    from !== "" ||
    to !== "";

  function clearFilters() {
    setSearch("");
    setSeverity("all");
    setStatus("all");
    setIndicator("all");
    setFrom("");
    setTo("");
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.length === filtered.length ? [] : filtered.map((alert) => alert.id),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Activas")}
          value={String(counts.activa)}
          icon={ShieldAlert}
          variant="destructive"
          context={t("Requieren revisión")}
        />
        <StatCard
          label={t("En revisión")}
          value={String(counts["en-revision"])}
          icon={Eye}
          variant="warning"
          context={t("Siendo atendidas")}
        />
        <StatCard
          label={t("Atendidas")}
          value={String(counts.atendida)}
          icon={CheckCircle2}
          variant="info"
          context={t("Con acción realizada")}
        />
        <StatCard
          label={t("Cerradas")}
          value={String(counts.cerrada)}
          icon={XCircle}
          variant="navy"
          context={t("Histórico resuelto")}
        />
      </div>

      <Tabs defaultValue="alerts" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="line">
            <TabsTrigger value="alerts">
              <BellRing className="size-3.5" />
              {t("Alertas")}
            </TabsTrigger>
            <TabsTrigger value="charts">
              <BarChart3 className="size-3.5" />
              {t("Gráficos")}
            </TabsTrigger>
            <TabsTrigger value="history">
              <ClipboardList className="size-3.5" />
              {t("Notificaciones enviadas")}
            </TabsTrigger>
          </TabsList>

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

        <TabsContent value="alerts">
          <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Gestión de alertas")}
              description={t("Filtra por severidad, estado o paciente")}
              icon={Filter}
              variant="primary"
              actions={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/70" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="h-8 w-44 border-white/25 bg-white/15 pl-8 text-white placeholder:text-white/60 [&::placeholder]:text-white/60"
                      placeholder={t("Buscar...")}
                      aria-label={t("Buscar alertas")}
                    />
                  </div>
                  <Select
                    value={severity}
                    onValueChange={(value) => setSeverity(value as AlertSeverity | "all")}
                  >
                    <SelectTrigger className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("Toda severidad")}</SelectItem>
                      <SelectItem value="critica">critica</SelectItem>
                      <SelectItem value="alta">alta</SelectItem>
                      <SelectItem value="media">media</SelectItem>
                      <SelectItem value="baja">baja</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as AlertStatus | "all")}
                  >
                    <SelectTrigger className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70">
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
                  <Select
                    value={indicator}
                    onValueChange={(value) => setIndicator(value ?? "all")}
                  >
                    <SelectTrigger className="h-8 w-40 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70">
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
              }
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
              <span className="text-[11.5px] font-medium text-muted-foreground">
                {t("Rango de fechas")}
              </span>
              <Input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                aria-label={t("Desde")}
                className="h-8 w-36"
              />
              <Input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                aria-label={t("Hasta")}
                className="h-8 w-36"
              />
              {(from || to) && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                  }}
                >
                  {t("Limpiar fechas")}
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                {selectedAlerts.length > 0 && (
                  <>
                    <span className="text-[11.5px] text-muted-foreground">
                      {selectedAlerts.length} {t("seleccionadas")}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setNotifyOpen(true)}
                    >
                      <Send className="size-3.5" />
                      {t("Notificar")} {selectedAlerts.length}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedIds([])}
                    >
                      {t("Quitar selección")}
                    </Button>
                  </>
                )}
              </div>
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
              <AlertsTable
                alerts={filtered}
                patients={data.patients}
                onChangeStatus={changeStatus}
                canReview={canReview}
                selectedIds={selectedIds}
                onToggle={toggleSelected}
                onToggleAll={toggleAll}
              />
            )}

            <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-[11.5px] text-muted-foreground">
              <Stethoscope className="size-3.5" />
              {t("Las transiciones de estado se aplican en esta sesión (mock)")}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="charts">
          <AlertsCharts />
        </TabsContent>

        <TabsContent value="history">
          <NotificationsHistory />
        </TabsContent>
      </Tabs>

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
  const allSelected = alerts.length > 0 && selectedIds.length === alerts.length;

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={t("Seleccionar todas las alertas")}
                className="size-4 rounded border-border"
              />
            </TableHead>
            <TableHead>{t("Paciente")}</TableHead>
            <TableHead>{t("Indicador")}</TableHead>
            <TableHead>{t("Resultado")}</TableHead>
            <TableHead>{t("Severidad")}</TableHead>
            <TableHead>{t("Fecha")}</TableHead>
            <TableHead>{t("Estado")}</TableHead>
            <TableHead className="text-right">{t("Acciones")}</TableHead>
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
                <TableCell>
                  <div className="max-w-[240px]">
                    <p className="truncate text-[12.5px] font-medium text-foreground">
                      {alert.indicatorName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {alert.message}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-[12.5px] text-foreground">
                  {alert.resultValue ? `${alert.resultValue}%` : "—"}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {formatDate(alert.createdAt)}
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${statusColor(alert.status)}1A`,
                      color: statusColor(alert.status),
                    }}
                  >
                    {STATUS_LABELS[alert.status]}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/health-tests/pacientes/${alert.patientId}`} />}
                    >
                      <Eye className="size-3.5" />
                      {t("Perfil")}
                    </Button>
                    {canReview && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={t("Cambiar estado de la alerta")}
                            />
                          }
                        >
                          {t("Estado")}
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
