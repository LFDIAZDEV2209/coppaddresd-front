"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  Search,
  ShieldAlert,
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
import { useAlerts } from "../../hooks/use-health-tests";
import type { AlertSeverity, AlertStatus, HealthAlert } from "../../types";
import { formatDate, initials } from "../../lib/format";
import { severityHex } from "../shared/colors";
import { SeverityBadge } from "../shared/badges";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

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
  const map: Record<AlertStatus, string> = {
    activa: "var(--destructive)",
    "en-revision": "var(--warning)",
    atendida: "var(--info)",
    cerrada: "var(--muted-foreground)",
  };
  return map[status];
}

/**
 * Alertas generadas por resultados alarmantes de los tests. UX de gestión
 * completa (estados y transiciones) con datos mock.
 */
export function AlertsPage() {
  const t = useT();
  const { hasPermission } = useAuth();
  const canReview = hasPermission("HealthTests.Review");
  const { data, loading, error, reload, changeStatus } = useAlerts();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all");
  const [status, setStatus] = useState<AlertStatus | "all">("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.alerts
      .filter((alert) => {
        if (severity !== "all" && alert.severity !== severity) return false;
        if (status !== "all" && alert.status !== status) return false;
        if (!term) return true;
        const patient = data.patients.find((p) => p.id === alert.patientId);
        const name = patient
          ? `${patient.firstName} ${patient.lastName}`.toLowerCase()
          : "";
        return (
          name.includes(term) ||
          alert.indicatorName.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data, search, severity, status]);

  const counts = useMemo(() => {
    if (!data) return null;
    const byStatus: Record<AlertStatus, number> = {
      activa: 0,
      "en-revision": 0,
      atendida: 0,
      cerrada: 0,
    };
    for (const alert of data.alerts) {
      byStatus[alert.status] += 1;
    }
    return byStatus;
  }, [data]);

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

  if (!data || !counts) return null;

  const isFiltered =
    search.trim() !== "" || severity !== "all" || status !== "all";

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

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Gestión de alertas")}
          description={t("Filtra por severidad, estado o paciente")}
          icon={Filter}
          variant="primary"
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-white/60" />
                <Input
                  className="h-8 w-44 border-white/25 bg-white/15 pl-8 text-white placeholder:text-white/60 [&::placeholder]:text-white/60"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Buscar...")}
                  aria-label={t("Buscar alertas")}
                />
              </div>
              <Select
                value={severity}
                onValueChange={(value) =>
                  setSeverity((value ?? "all") as AlertSeverity | "all")
                }
              >
                <SelectTrigger
                  className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
                  aria-label={t("Filtrar por severidad")}
                >
                  <SelectValue>
                    {severity === "all" ? t("Toda severidad") : severity}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Toda severidad")}</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus((value ?? "all") as AlertStatus | "all")
                }
              >
                <SelectTrigger
                  className="h-8 w-36 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
                  aria-label={t("Filtrar por estado")}
                >
                  <SelectValue>
                    {status === "all"
                      ? t("Todo estado")
                      : STATUS_LABELS[status]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todo estado")}</SelectItem>
                  {(Object.keys(STATUS_LABELS) as AlertStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin alertas que mostrar")}
            description={
              isFiltered
                ? t("Ninguna alerta coincide con los filtros aplicados.")
                : t("No hay alertas generadas por resultados de tests.")
            }
            filtered={isFiltered}
            onClear={() => {
              setSearch("");
              setSeverity("all");
              setStatus("all");
            }}
          />
        ) : (
          <AlertsTable
            alerts={filtered}
            patients={data.patients}
            tests={data.tests}
            onChangeStatus={changeStatus}
            canReview={canReview}
          />
        )}
      </section>
    </div>
  );
}

function AlertsTable({
  alerts,
  patients,
  tests,
  onChangeStatus,
  canReview = true,
}: {
  alerts: HealthAlert[];
  patients: { id: string; firstName: string; lastName: string }[];
  tests: { id: string; name: string; icon: string }[];
  onChangeStatus: (alertId: string, status: AlertStatus) => void;
  canReview?: boolean;
}) {
  const t = useT();
  void tests;
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t("Paciente")}</TableHead>
            <TableHead>{t("Indicador")}</TableHead>
            <TableHead>{t("Resultado")}</TableHead>
            <TableHead>{t("Severidad")}</TableHead>
            <TableHead>{t("Fecha")}</TableHead>
            <TableHead>{t("Estado")}</TableHead>
            <TableHead>{t("Acciones")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const patient = patients.find((p) => p.id === alert.patientId);
            return (
              <TableRow key={alert.id}>
                <TableCell>
                  {patient ? (
                    <Link
                      href={`/health-tests/pacientes/${patient.id}`}
                      className="flex items-center gap-3 text-left"
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                        style={{
                          backgroundColor: `${severityHex(alert.severity)}1A`,
                          color: severityHex(alert.severity),
                        }}
                      >
                        {initials(patient.firstName, patient.lastName)}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold text-foreground hover:underline">
                          {patient.firstName} {patient.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {alert.indicatorName}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="block max-w-52 truncate text-[12.5px] font-medium text-foreground">
                    {alert.indicatorName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {alert.message}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[11.5px] font-semibold">
                    {alert.resultValue ? `${alert.resultValue}%` : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell>
                  <span className="text-[12.5px] text-muted-foreground">
                    {formatDate(alert.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${statusColor(alert.status)}1A`,
                      color: statusColor(alert.status),
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: statusColor(alert.status) }}
                    />
                    {STATUS_LABELS[alert.status]}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {patient && (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link
                            href={`/health-tests/pacientes/${patient.id}`}
                          />
                        }
                      >
                        <Eye data-icon="inline-start" />
                        {t("Perfil")}
                      </Button>
                    )}
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
                          <ClipboardList />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <span className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("Cambiar estado")}
                          </span>
                          {STATUS_NEXT[alert.status].map((next) => (
                            <DropdownMenuItem
                              key={next}
                              onClick={() => onChangeStatus(alert.id, next)}
                            >
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: statusColor(next) }}
                              />
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
      <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-[11.5px] text-muted-foreground">
        <Stethoscope className="size-3.5" />
        {t("Las transiciones de estado se aplican en esta sesión (mock)")}
      </div>
    </div>
  );
}
