"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellRing,
  ClipboardCheck,
  Eye,
  HeartPulse,
  LayoutGrid,
  MoreHorizontal,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMasterPatients } from "../../hooks/use-health-tests";
import type { PatientMasterRow, RiskLevel } from "../../types";
import { RISK_LABELS } from "../../lib/domain";
import { formatDate, initials } from "../../lib/format";
import { RiskBadge } from "../shared/badges";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";

const VIEW_KEY = "health-tests-view-mode";
type ViewMode = "table" | "cards";
type SortKey = "name" | "risk" | "progress" | "alerts" | "lastEvaluation";
type RiskFilter =
  "all" | "bajo" | "moderado" | "alto" | "critico" | "sin-evaluar";

const PAGE_SIZE = 8;

/**
 * Tabla maestra de pacientes y tests: centro operativo del módulo.
 * Búsqueda, filtros, orden, paginación y toggle tabla ↔ cards.
 */
export function MasterPatientsPage() {
  const t = useT();
  const { data, loading, error, reload } = useMasterPatients();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [professionalId, setProfessionalId] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "table";
    return window.localStorage.getItem(VIEW_KEY) === "cards"
      ? "cards"
      : "table";
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (risk !== "all" && row.risk !== risk) return false;
      if (
        professionalId !== "all" &&
        row.patient.professionalId !== professionalId
      )
        return false;
      if (!term) return true;
      const name =
        `${row.patient.firstName} ${row.patient.lastName}`.toLowerCase();
      const doc = row.patient.documentNumber.toLowerCase();
      return name.includes(term) || doc.includes(term);
    });
  }, [data, search, risk, professionalId]);

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (
            `${a.patient.firstName} ${a.patient.lastName}`.localeCompare(
              `${b.patient.firstName} ${b.patient.lastName}`,
            ) * factor
          );
        case "risk":
          return (riskOrder(a.risk) - riskOrder(b.risk)) * factor;
        case "progress":
          return (a.progressPercent - b.progressPercent) * factor;
        case "alerts":
          return (a.alertCount - b.alertCount) * factor;
        case "lastEvaluation":
          return (
            (a.lastEvaluation ?? "").localeCompare(b.lastEvaluation ?? "") *
            factor
          );
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totals = useMemo(() => {
    if (!data) return null;
    const evaluated = data.rows.filter((r) => r.completedCount >= 5).length;
    const atRisk = data.rows.filter(
      (r) => r.risk === "alto" || r.risk === "critico",
    ).length;
    const withAlerts = data.rows.reduce((acc, r) => acc + r.alertCount, 0);
    return { total: data.rows.length, evaluated, atRisk, withAlerts };
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const isFiltered =
    search.trim() !== "" || risk !== "all" || professionalId !== "all";

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const header = (
    <PageHeader
      title={t("Tabla maestra")}
      description={t(
        "Progreso, riesgo y alertas de cada paciente frente a su batería de evaluación",
      )}
      icon={UserRound}
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <TableSkeleton rows={8} />
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

  if (!data || !totals) return null;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Pacientes en la batería")}
          value={String(totals.total)}
          icon={Users}
          variant="primary"
          context={t("Con evaluación asignada")}
        />
        <StatCard
          label={t("Evaluados (≥5 tests)")}
          value={String(totals.evaluated)}
          icon={UserCheck}
          variant="success"
          context={t("Batería avanzada o completa")}
        />
        <StatCard
          label={t("Riesgo alto o crítico")}
          value={String(totals.atRisk)}
          icon={HeartPulse}
          variant="destructive"
          context={t("Requieren intervención")}
        />
        <StatCard
          label={t("Alertas asociadas")}
          value={String(totals.withAlerts)}
          icon={BellRing}
          variant="warning"
          context={t("Activas o en revisión")}
        />
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Pacientes y tests")}
          description={t(
            "Busca, filtra y ordena el directorio de evaluaciones",
          )}
          icon={SlidersHorizontal}
          variant="primary"
          actions={
            <>
              <ToggleGroup
                value={[view]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (next === "table" || next === "cards") changeView(next);
                  else changeView(view);
                }}
                aria-label={t("Cambiar vista de los registros")}
              >
                <ToggleGroupItem
                  value="table"
                  aria-label={t("Vista tabla")}
                  className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                >
                  <Rows3 />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="cards"
                  aria-label={t("Vista tarjetas")}
                  className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                >
                  <LayoutGrid />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button
                variant="outline"
                size="sm"
                onClick={reload}
                disabled={loading}
                className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={loading ? "animate-spin" : undefined}
                />
                Actualizar
              </Button>
            </>
          }
        />
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_170px_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("Buscar paciente o documento...")}
              aria-label={t("Buscar pacientes")}
            />
          </div>
          <Select
            value={risk}
            onValueChange={(value) => {
              setRisk((value ?? "all") as RiskFilter);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por riesgo")}
            >
              <SelectValue>
                {risk === "all" ? t("Todo riesgo") : RISK_LABELS[risk]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todo riesgo")}</SelectItem>
              {(Object.keys(RISK_LABELS) as RiskLevel[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {RISK_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={professionalId}
            onValueChange={(value) => {
              setProfessionalId(value ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por profesional")}
            >
              <SelectValue>
                {professionalId === "all"
                  ? t("Todos los profesionales")
                  : (data.professionals.find((p) => p.id === professionalId)
                      ?.firstName ?? t("Todos los profesionales"))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("Todos los profesionales")}
              </SelectItem>
              {data.professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pageRows.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin pacientes que mostrar")}
            description={
              isFiltered
                ? t("Ningún paciente coincide con los filtros aplicados.")
                : t("Aún no hay pacientes con evaluación asignada.")
            }
            filtered={isFiltered}
            onClear={() => {
              setSearch("");
              setRisk("all");
              setProfessionalId("all");
            }}
          />
        ) : view === "table" ? (
          <MasterTable
            rows={pageRows}
            professionals={data.professionals}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        ) : (
          <MasterCards rows={pageRows} professionals={data.professionals} />
        )}
      </section>

      {sorted.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function riskOrder(risk: string): number {
  const order: Record<string, number> = {
    critico: 4,
    alto: 3,
    moderado: 2,
    bajo: 1,
    "sin-evaluar": 0,
  };
  return order[risk] ?? 0;
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Ordenar por ${label}`}
        title={`Ordenar por ${label}`}
        className={cn(
          "inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wider transition-colors",
          active ? "text-white" : "text-white/80 hover:text-white",
        )}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}

function MasterTable({
  rows,
  professionals,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: PatientMasterRow[];
  professionals: { id: string; firstName: string; lastName: string }[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const t = useT();
  const nameOf = (id: string) => {
    const p = professionals.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "Sin asignar";
  };
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <SortableHead
              label={t("Paciente")}
              sortKey="name"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <TableHead>{t("Profesional")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("Tests")}</TableHead>
            <SortableHead
              label={t("Progreso")}
              sortKey="progress"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHead
              label={t("Riesgo")}
              sortKey="risk"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHead
              label={t("Alertas")}
              sortKey="alerts"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <TableHead className="hidden xl:table-cell">
              {t("Última evaluación")}
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">{t("Acciones")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.patient.id}>
              <TableCell>
                <a
                  href={`/health-tests/pacientes/${row.patient.id}`}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {initials(row.patient.firstName, row.patient.lastName)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground hover:underline">
                      {row.patient.firstName} {row.patient.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.patient.documentNumber} · {row.patient.gender} ·{" "}
                      {row.patient.age} años
                    </span>
                  </span>
                </a>
              </TableCell>
              <TableCell>
                <span className="text-[12.5px] text-muted-foreground">
                  {nameOf(row.patient.professionalId)}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <ClipboardCheck className="size-3.5 text-success" />
                  <span className="font-semibold text-foreground">
                    {row.completedCount}
                  </span>
                  <span className="text-muted-foreground">
                    / {row.assignedCount}
                  </span>
                  {row.inProgressCount > 0 && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-info-soft px-2 py-0.5 text-[10.5px] font-semibold text-info-foreground">
                      {row.inProgressCount} {t("en curso")}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex min-w-28 items-center gap-2">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--muted)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${row.progressPercent}%`,
                        backgroundColor: "var(--primary)",
                      }}
                    />
                  </div>
                  <span className="w-9 text-right text-[12px] font-semibold text-foreground">
                    {row.progressPercent}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <RiskBadge risk={row.risk} label={RISK_LABELS[row.risk]} />
              </TableCell>
              <TableCell>
                {row.alertCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive-soft px-2.5 py-1 text-[11px] font-bold text-destructive">
                    <BellRing className="size-3" />
                    {row.alertCount}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <span className="text-[12.5px] text-muted-foreground">
                  {formatDate(row.lastEvaluation)}
                </span>
              </TableCell>
              <TableCell>
                <RowActions row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MasterCards({
  rows,
  professionals,
}: {
  rows: PatientMasterRow[];
  professionals: { id: string; firstName: string; lastName: string }[];
}) {
  const t = useT();
  const nameOf = (id: string) => {
    const p = professionals.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "Sin asignar";
  };
  return (
    <div className="grid grid-cols-1 gap-4 p-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <article
          key={row.patient.id}
          className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <a
              href={`/health-tests/pacientes/${row.patient.id}`}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {initials(row.patient.firstName, row.patient.lastName)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-foreground hover:underline">
                  {row.patient.firstName} {row.patient.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.patient.documentNumber} · {row.patient.age} años
                </span>
              </span>
            </a>
            <RiskBadge risk={row.risk} label={RISK_LABELS[row.risk]} />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <span className="flex flex-col gap-px">
              <span className="text-muted-foreground">{t("Profesional")}</span>
              <span className="truncate font-medium">
                {nameOf(row.patient.professionalId)}
              </span>
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-muted-foreground">
                {t("Última evaluación")}
              </span>
              <span className="font-medium">
                {formatDate(row.lastEvaluation)}
              </span>
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-muted-foreground">{t("Tests")}</span>
              <span className="font-medium">
                {row.completedCount}/{row.assignedCount}{" "}
                <span className="text-muted-foreground">
                  {t("completados")}
                </span>
              </span>
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-muted-foreground">{t("Alertas")}</span>
              <span className="font-medium">
                {row.alertCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive-soft px-2 py-0.5 text-[11px] font-bold text-destructive">
                    <BellRing className="size-3" />
                    {row.alertCount}
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{t("Progreso")}</span>
              <span className="font-semibold text-foreground">
                {row.progressPercent}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--muted)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${row.progressPercent}%`,
                  backgroundColor: "var(--primary)",
                }}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function RowActions({ row }: { row: PatientMasterRow }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${row.patient.firstName} ${row.patient.lastName}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<a href={`/health-tests/pacientes/${row.patient.id}`} />}
        >
          <Eye />
          {t("Ver perfil")}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`/health-tests/pacientes/${row.patient.id}`} />}
        >
          <ClipboardCheck />
          {t("Ver evaluaciones")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const t = useT();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {t("Mostrando {from}–{to} de {total} pacientes", {
          from: String(from),
          to: String(to),
          total: String(total),
        })}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("Anterior")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("Siguiente")}
        </Button>
      </div>
    </div>
  );
}
