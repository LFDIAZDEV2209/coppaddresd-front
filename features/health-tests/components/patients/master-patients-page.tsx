"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  FilterX,
  HeartPulse,
  Hourglass,
  Layers,
  LayoutGrid,
  MoreHorizontal,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Timer,
  UserCheck,
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
import { CATEGORY_LABELS, RISK_LABELS } from "../../lib/domain";
import { formatDate, initials } from "../../lib/format";
import { RiskBadge } from "../shared/badges";
import { TestStateBadge } from "../shared/badges";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { categoryAccent, riskHex, scoreBarColor } from "../shared/colors";
import { ScoreBar } from "../shared/progress";

const VIEW_KEY = "health-tests-view-mode";
type ViewMode = "table" | "cards";
type SortKey = "name" | "risk" | "progress" | "alerts" | "lastEvaluation";
type RiskFilter =
  "all" | "bajo" | "moderado" | "alto" | "critico" | "sin-evaluar";

const PAGE_SIZE = 8;

/**
 * Fecha relativa compacta para la tabla: hoy / ayer / «hace N días».
 * A partir de 30 días (o fecha futura) usa la fecha absoluta.
 */
function formatRelativeDate(
  value: string | null,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);
  const days = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );
  if (days <= 0) return t("hoy");
  if (days === 1) return t("ayer");
  if (days <= 30) return t("hace {days} días", { days: String(days) });
  return formatDate(value);
}

/**
 * Bandeja maestra de pacientes — centro de gestión de Health Tests.
 * Filtros data-driven: batería → tests. Fila expandible con resultados
 * filtrados + análisis IA sin cambiar de página (menos navegación, más contexto).
 */
export function MasterPatientsPage() {
  const t = useT();
  const { data, loading, error, reload } = useMasterPatients();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [professionalId, setProfessionalId] = useState("all");
  const [batteryId, setBatteryId] = useState("all");
  const [testId, setTestId] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "table";
    return window.localStorage.getItem(VIEW_KEY) === "cards"
      ? "cards"
      : "table";
  });

  const batteries = useMemo(() => data?.batteries ?? [], [data?.batteries]);
  const tests = useMemo(() => data?.tests ?? [], [data?.tests]);

  const testsForBattery = useMemo(() => {
    if (batteryId === "all") return tests;
    const b = batteries.find((x) => x.id === batteryId);
    if (!b) return [];
    return tests.filter((test) => b.testIds.includes(test.id));
  }, [batteryId, batteries, tests]);

  // Cuando cambia la batería, si el test seleccionado ya no pertenece, resetearlo.
  useEffect(() => {
    if (testId !== "all" && !testsForBattery.some((x) => x.id === testId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- corrige selección inconsistente, requerido
      setTestId("all");
    }
  }, [batteryId, testId, testsForBattery]);

  // Mapa instrumentId -> code para resolver batería -> testCodes (result.testCode)
  const instrumentIdToCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tests) m.set(t.id, t.code);
    return m;
  }, [tests]);

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

      if (batteryId !== "all") {
        const b = batteries.find((x) => x.id === batteryId);
        if (!b) return false;
        const batteryCodes = b.testIds
          .map((id) => instrumentIdToCode.get(id))
          .filter(Boolean) as string[];
        const hasBattery = row.patient.results.some(
          (r) => r.testCode && batteryCodes.includes(r.testCode),
        );
        if (!hasBattery) return false;
      }

      if (testId !== "all") {
        const testCode = instrumentIdToCode.get(testId);
        if (!testCode) return false;
        const hasTest = row.patient.results.some(
          (r) => r.testCode === testCode,
        );
        if (!hasTest) return false;
      }

      if (!term) return true;
      const name =
        `${row.patient.firstName} ${row.patient.lastName}`.toLowerCase();
      const doc = row.patient.documentNumber.toLowerCase();
      return name.includes(term) || doc.includes(term);
    });
  }, [
    data,
    search,
    risk,
    professionalId,
    batteryId,
    testId,
    batteries,
    instrumentIdToCode,
  ]);

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
    const evaluated = data.rows.filter((r) => r.completedCount >= 1).length;
    const atRisk = data.rows.filter(
      (r) => r.risk === "alto" || r.risk === "critico",
    ).length;
    const withAlerts = data.rows.reduce((acc, r) => acc + r.alertCount, 0);
    return { total: data.rows.length, evaluated, atRisk, withAlerts };
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const activeFilterCount = [
    search.trim() !== "",
    risk !== "all",
    professionalId !== "all",
    batteryId !== "all",
    testId !== "all",
  ].filter(Boolean).length;
  const isFiltered = activeFilterCount > 0;

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

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const clearFilters = () => {
    setSearch("");
    setRisk("all");
    setProfessionalId("all");
    setBatteryId("all");
    setTestId("all");
    setPage(1);
    setExpandedId(null);
  };

  const header = (
    <PageHeader
      title={t("Bandeja de pacientes — Tests & Diagnóstico")}
      description={t(
        "Todos los pacientes, su riesgo y sus alertas en un solo listado",
      )}
      icon={Layers}
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {header}
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data || !totals) return null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("Pacientes en la batería")}
          value={String(totals.total)}
          icon={Users}
          variant="primary"
          align="center"
          context={
            batteries.length > 0
              ? `${batteries.length} ${batteries.length === 1 ? "batería activa" : "baterías activas"}`
              : t("Con evaluación asignada")
          }
        />
        <StatCard
          label={t("Evaluados")}
          value={String(totals.evaluated)}
          icon={UserCheck}
          variant="success"
          align="center"
          context={t("Con al menos un test completado")}
        />
        <StatCard
          label={t("Riesgo alto o crítico")}
          value={String(totals.atRisk)}
          icon={HeartPulse}
          variant="destructive"
          align="center"
          context={t("Requieren intervención")}
        />
        <StatCard
          label={t("Alertas asociadas")}
          value={String(totals.withAlerts)}
          icon={BellRing}
          variant="warning"
          align="center"
          context={t("Activas o en revisión")}
        />
      </div>

      {filtered.length > 0 && tests.length > 0 && (
        <CategorySummaryCard
          rows={filtered}
          tests={tests}
          count={filtered.length}
        />
      )}

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Listado de pacientes")}
          description={t(
            "Filtra por batería, test o profesional para acotar los resultados.",
          )}
          icon={SlidersHorizontal}
          variant="primary"
          actions={
            <>
              <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white sm:inline-flex">
                <Layers className="size-3.5" />
                {batteries.length}{" "}
                {batteries.length === 1 ? t("batería") : t("baterías")} ·{" "}
                {tests.length} {tests.length === 1 ? t("test") : t("tests")}
              </span>
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

        {/* Fila principal de filtros: búsqueda + batería + test */}
        <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_220px_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                  setExpandedId(null);
                }}
                placeholder={t("Buscar paciente o documento...")}
                aria-label={t("Buscar pacientes")}
              />
            </div>

            <Select
              value={batteryId}
              onValueChange={(value) => {
                setBatteryId(value ?? "all");
                setPage(1);
                setExpandedId(null);
              }}
            >
              <SelectTrigger
                className="w-full"
                aria-label={t("Filtrar por batería")}
              >
                <SelectValue>
                  {batteryId === "all"
                    ? t("Todas las baterías")
                    : (batteries.find((b) => b.id === batteryId)?.name ??
                      t("Batería"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Todas las baterías")}</SelectItem>
                {batteries.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} · {b.testIds.length} tests
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={testId}
              onValueChange={(value) => {
                setTestId(value ?? "all");
                setPage(1);
                setExpandedId(null);
              }}
              disabled={testsForBattery.length === 0}
            >
              <SelectTrigger
                className="w-full"
                aria-label={t("Filtrar por test")}
              >
                <SelectValue>
                  {testId === "all"
                    ? batteryId === "all"
                      ? t("Todos los tests")
                      : t("Todos los tests de la batería")
                    : (tests.find((x) => x.id === testId)?.name ?? t("Test"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {batteryId === "all"
                    ? t("Todos los tests")
                    : t("Todos los tests de la batería")}
                </SelectItem>
                {testsForBattery.map((testItem) => (
                  <SelectItem key={testItem.id} value={testItem.id}>
                    <span className="flex items-center gap-2">
                      <span>{testItem.icon}</span> {testItem.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fila secundaria: riesgo + profesional + estado activo */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={risk}
                onValueChange={(value) => {
                  setRisk((value ?? "all") as RiskFilter);
                  setPage(1);
                  setExpandedId(null);
                }}
              >
                <SelectTrigger
                  className="h-8 w-[160px] text-xs"
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
                  setExpandedId(null);
                }}
              >
                <SelectTrigger
                  className="h-8 w-[190px] text-xs"
                  aria-label={t("Filtrar por profesional")}
                >
                  <SelectValue>
                    {professionalId === "all"
                      ? t("Todos los profesionales")
                      : (data.professionals.find((p) => p.id === professionalId)
                          ?.firstName ?? t("Profesional"))}
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

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 gap-1.5 text-xs"
                >
                  <FilterX className="size-3.5" />
                  {t("Limpiar")}{" "}
                  {activeFilterCount > 0 && `(${activeFilterCount})`}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {t("{count} pacientes", { count: String(sorted.length) })}
              </span>
              {batteryId !== "all" && (
                <span className="hidden items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary sm:inline-flex">
                  <Layers className="size-3" />
                  {batteries.find((b) => b.id === batteryId)?.name}
                </span>
              )}
              {testId !== "all" && (
                <span className="hidden items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700 sm:inline-flex">
                  {tests.find((x) => x.id === testId)?.icon}{" "}
                  {tests.find((x) => x.id === testId)?.name}
                </span>
              )}
            </div>
          </div>

          {/* Chips de filtros activos (cuando hay test/batería seleccionados) */}
          {isFiltered && (batteryId !== "all" || testId !== "all") && (
            <div className="flex flex-wrap gap-1.5">
              {batteryId !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium">
                  <Layers className="size-3 text-primary" />
                  {batteries.find((b) => b.id === batteryId)?.name}
                  <button
                    type="button"
                    onClick={() => setBatteryId("all")}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    aria-label={t("Quitar filtro de batería")}
                  >
                    <FilterX className="size-3" />
                  </button>
                </span>
              )}
              {testId !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium">
                  {tests.find((x) => x.id === testId)?.icon}{" "}
                  {tests.find((x) => x.id === testId)?.name}
                  <button
                    type="button"
                    onClick={() => setTestId("all")}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    aria-label={t("Quitar filtro de test")}
                  >
                    <FilterX className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {pageRows.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin pacientes que mostrar")}
            description={
              isFiltered
                ? t(
                    "Ningún paciente coincide con los filtros de batería, test y riesgo aplicados.",
                  )
                : t("Aún no hay pacientes con evaluación asignada.")
            }
            filtered={isFiltered}
            onClear={clearFilters}
          />
        ) : view === "table" ? (
          <MasterTable
            rows={pageRows}
            professionals={data.professionals}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            batteryId={batteryId}
            testId={testId}
            tests={tests}
            batteries={batteries}
          />
        ) : (
          <MasterCards
            rows={pageRows}
            professionals={data.professionals}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            batteryId={batteryId}
            testId={testId}
            tests={tests}
            batteries={batteries}
          />
        )}
      </section>

      {sorted.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => {
            setPage(next);
            setExpandedId(null);
          }}
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
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
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
  expandedId,
  onToggleExpand,
  batteryId,
  testId,
  tests,
  batteries,
}: {
  rows: PatientMasterRow[];
  professionals: { id: string; firstName: string; lastName: string }[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  batteryId: string;
  testId: string;
  tests: import("../../types").HealthTest[];
  batteries: import("../../types").Battery[];
}) {
  const t = useT();
  const nameOf = (id: string, name?: string) => {
    const p = professionals.find((x) => x.id === id);
    if (p) return `${p.firstName} ${p.lastName}`;
    // El backend resuelve el nombre aunque el id no esté en el catálogo.
    return name?.trim() ? name : t("Sin asignar");
  };
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1120px] [&_td]:py-2 [&_td]:text-[12.5px]">
        <TableHeader>
          <TableRow>
            <SortableHead
              label={t("Paciente")}
              sortKey="name"
              activeKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <TableHead className="hidden lg:table-cell">
              {t("Profesional")}
            </TableHead>
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
            <TableHead className="w-[88px]">
              <span className="sr-only">{t("Acciones")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const expanded = expandedId === row.patient.id;
            return (
              <Fragment key={row.patient.id}>
                <TableRow
                  className={cn(
                    "group border-l-2 odd:bg-muted/20",
                    expanded && "bg-muted/30 hover:bg-muted/30",
                  )}
                  style={{ borderLeftColor: riskHex(row.risk) }}
                >
                  <TableCell>
                    <a
                      href={`/health-tests/pacientes/${row.patient.id}`}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
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
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-[12.5px] text-muted-foreground">
                      {nameOf(
                        row.patient.professionalId,
                        row.patient.professionalName,
                      )}
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
                            backgroundColor: scoreBarColor(row.risk),
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
                    <span
                      className="text-[12.5px] text-muted-foreground"
                      title={formatDate(row.lastEvaluation)}
                    >
                      {formatRelativeDate(row.lastEvaluation, t)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <RowActions row={row} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          expanded
                            ? t("Ocultar resultados")
                            : t("Ver resultados y análisis")
                        }
                        aria-expanded={expanded}
                        onClick={() => onToggleExpand(row.patient.id)}
                        className={cn(
                          "size-8 rounded-full border",
                          expanded
                            ? "border-primary bg-primary text-white hover:bg-primary/90 hover:text-white"
                            : "border-border bg-card hover:bg-muted",
                        )}
                      >
                        {expanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={8} className="p-0">
                      <ExpandedPanel
                        row={row}
                        batteryId={batteryId}
                        testId={testId}
                        tests={tests}
                        batteries={batteries}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function MasterCards({
  rows,
  professionals,
  expandedId,
  onToggleExpand,
  batteryId,
  testId,
  tests,
  batteries,
}: {
  rows: PatientMasterRow[];
  professionals: { id: string; firstName: string; lastName: string }[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  batteryId: string;
  testId: string;
  tests: import("../../types").HealthTest[];
  batteries: import("../../types").Battery[];
}) {
  const t = useT();
  const nameOf = (id: string, name?: string) => {
    const p = professionals.find((x) => x.id === id);
    if (p) return `${p.firstName} ${p.lastName}`;
    // El backend resuelve el nombre aunque el id no esté en el catálogo.
    return name?.trim() ? name : t("Sin asignar");
  };
  return (
    <div className="grid grid-cols-1 gap-4 p-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const expanded = expandedId === row.patient.id;
        return (
          <article
            key={row.patient.id}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200",
              expanded
                ? "border-primary/30 shadow-md"
                : "border-border/70 hover:-translate-y-0.5 hover:border-border hover:shadow-md",
            )}
          >
            <div className="flex flex-col gap-3 p-4">
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
                  <span className="text-muted-foreground">
                    {t("Profesional")}
                  </span>
                  <span className="truncate font-medium">
                    {nameOf(
                      row.patient.professionalId,
                      row.patient.professionalName,
                    )}
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

              <Button
                variant={expanded ? "secondary" : "outline"}
                size="sm"
                onClick={() => onToggleExpand(row.patient.id)}
                aria-expanded={expanded}
                className="mt-1 w-full justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  {expanded
                    ? t("Ocultar resultados")
                    : t("Ver resultados y análisis")}
                </span>
                {expanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>

            {expanded && (
              <div className="border-t border-border bg-muted/20">
                <ExpandedPanel
                  row={row}
                  batteryId={batteryId}
                  testId={testId}
                  tests={tests}
                  batteries={batteries}
                  compact
                />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ExpandedPanel({
  row,
  batteryId,
  testId,
  tests,
  batteries,
  compact = false,
}: {
  row: PatientMasterRow;
  batteryId: string;
  testId: string;
  tests: import("../../types").HealthTest[];
  batteries: import("../../types").Battery[];
  compact?: boolean;
}) {
  const t = useT();
  const codeToTest = useMemo(
    () => new Map(tests.map((x) => [x.code, x] as const)),
    [tests],
  );
  const idToCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const test of tests) m.set(test.id, test.code);
    return m;
  }, [tests]);
  const idToTest = useMemo(() => new Map(tests.map((x) => [x.id, x])), [tests]);

  const { displayResults, batteryName } = useMemo(() => {
    let results = [...row.patient.results];
    let name: string | null = null;
    if (batteryId !== "all") {
      const b = batteries.find((x) => x.id === batteryId);
      if (b) {
        name = b.name;
        const batteryCodes = b.testIds
          .map((id) => idToCode.get(id))
          .filter(Boolean) as string[];
        results = results.filter(
          (r) => r.testCode && batteryCodes.includes(r.testCode),
        );
      }
    }
    if (testId !== "all") {
      const code = idToCode.get(testId);
      if (code) results = results.filter((r) => r.testCode === code);
    }
    // Orden: completados primero, luego en-progreso, luego pendientes
    const order: Record<string, number> = {
      completado: 0,
      "en-progreso": 1,
      pendiente: 2,
      vencido: 3,
    };
    results.sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9));
    return { displayResults: results, batteryName: name };
  }, [row.patient.results, batteryId, testId, batteries, idToCode]);

  const completed = displayResults.filter(
    (r) => r.state === "completado",
  ).length;
  const total = displayResults.length;

  return (
    <div className={cn("flex flex-col gap-4", compact ? "p-4" : "p-5")}>
      {batteryName && (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary">
            <Layers className="size-3.5" />
            {batteryName}
          </span>
          <span className="text-muted-foreground">
            {completed}/{total} {t("completados")}
          </span>
          {testId !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700">
              {idToTest.get(testId)?.icon} {idToTest.get(testId)?.name}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid gap-2.5",
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {displayResults.map((result) => {
          const test = result.testCode
            ? codeToTest.get(result.testCode)
            : undefined;
          const accent = test ? categoryAccent(test.category) : "#64748B";
          return (
            <div
              key={result.testId}
              className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm"
                    style={{
                      backgroundColor: `${accent}1A`,
                      color: accent,
                    }}
                  >
                    {test?.icon ?? "🧪"}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {test?.name ?? result.testCode ?? "Test"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {test?.code ?? result.testCode}
                      {test?.category
                        ? ` · ${CATEGORY_LABELS[test.category] ?? test.category}`
                        : ""}
                    </span>
                  </div>
                </div>
                <TestStateBadge
                  state={result.state}
                  className="shrink-0 px-2 py-0.5 text-[10.5px]"
                />
              </div>

              {result.score !== null ? (
                <div className="flex flex-col gap-2">
                  <ScoreBar
                    value={result.score}
                    color={scoreBarColor(result.risk)}
                    label={t("Score")}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {result.interpretation || "—"}
                    </span>
                    <RiskBadge
                      risk={result.risk}
                      label={RISK_LABELS[result.risk] ?? result.risk}
                      className="shrink-0 px-2 py-0.5 text-[10.5px]"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {result.completedAt
                      ? `${t("Completado")} ${formatDate(result.completedAt)}`
                      : `${t("Actualizado")} ${formatDate(result.updatedAt)}`}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {result.state === "en-progreso"
                    ? t("Guardado a medias — pendiente de envío")
                    : t("Pendiente de aplicación")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {displayResults.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {t("Sin tests para los filtros aplicados.")}
        </p>
      )}

      <IaSummary
        row={row}
        displayResults={displayResults}
        batteryName={batteryName}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/health-tests/pacientes/${row.patient.id}`} />}
        >
          <Eye data-icon="inline-start" />
          {t("Ver perfil completo")}
        </Button>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <Timer className="size-3.5" />
          {t("Última evaluación")} {formatDate(row.lastEvaluation)}
        </span>
      </div>
    </div>
  );
}

function IaSummary({
  row,
  displayResults,
  batteryName,
}: {
  row: PatientMasterRow;
  displayResults: import("../../types").PatientTestResult[];
  batteryName: string | null;
}) {
  const t = useT();
  const completed = displayResults.filter(
    (r) => r.state === "completado",
  ).length;
  const total = displayResults.length;
  const pending = total - completed;
  const hasAnalysis = completed >= Math.max(3, Math.ceil(total * 0.45));
  const riskLabel = RISK_LABELS[row.risk] ?? row.risk;

  const insight = hasAnalysis
    ? row.risk === "alto" || row.risk === "critico"
      ? t(
          "Perfil con riesgo elevado. Priorizar intervención en los dominios con severidad alta y revisar las alertas activas antes de la próxima sesión.",
        )
      : row.risk === "moderado"
        ? t(
            "Perfil en construcción. Buen avance en la batería; reforzar adherencia y seguimiento quincenal para consolidar los dominios pendientes.",
          )
        : t(
            "Perfil estable. Mantener adherencia y programar control de seguimiento según la batería activa.",
          )
    : t(
        "Aún sin análisis consolidado. Completar al menos 5 de los 9 tests de la batería para generar el análisis integral automático.",
      );

  return (
    <div className="flex gap-3 rounded-xl border border-violet-200/70 bg-gradient-to-r from-violet-50/80 via-card to-emerald-50/40 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
        <Sparkles className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold text-foreground">
            {t("Análisis IA")} — {batteryName ?? t("Perfil integral")}
          </h4>
          {hasAnalysis ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10.5px] font-bold text-white">
              <CheckCircle2 className="size-3" />
              {t("Disponible")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
              <Hourglass className="size-3" />
              {t("En espera")}
            </span>
          )}
          {row.lastEvaluation && (
            <span className="text-xs text-muted-foreground">
              · {formatDate(row.lastEvaluation)}
            </span>
          )}
        </div>

        <p className="text-[12.5px] leading-relaxed text-foreground/80">
          {insight}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium">
            <HeartPulse className="size-3 text-primary" />
            {t("Riesgo")}: {riskLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium">
            <ClipboardCheck className="size-3 text-success" />
            {completed}/{total} {t("tests completados")}
          </span>
          {row.alertCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive-soft px-2.5 py-1 text-xs font-bold text-destructive">
              <BellRing className="size-3" />
              {row.alertCount} {t("alertas")}
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground">
              <Hourglass className="size-3" />
              {pending} {t("pendientes")}
            </span>
          )}
        </div>

        {!hasAnalysis && total > 0 && (
          <p className="pt-1 text-[11px] text-muted-foreground">
            {t("Faltan {n} evaluaciones para el análisis automático.", {
              n: String(Math.max(0, 5 - completed)),
            })}
          </p>
        )}
      </div>
    </div>
  );
}

function CategorySummaryCard({
  rows,
  tests,
  count,
}: {
  rows: PatientMasterRow[];
  tests: import("../../types").HealthTest[];
  count: number;
}) {
  const t = useT();
  const data = useMemo(() => {
    const byCat = new Map<
      string,
      { total: number; cnt: number; color: string; label: string }
    >();
    for (const test of tests) {
      byCat.set(test.category, {
        total: 0,
        cnt: 0,
        color: categoryAccent(test.category),
        label: CATEGORY_LABELS[test.category] ?? test.category,
      });
    }
    for (const row of rows) {
      for (const r of row.patient.results) {
        const pct = r.scorePercentage ?? r.score;
        if (pct === null || !r.testCode) continue;
        const test = tests.find((x) => x.code === r.testCode);
        if (!test) continue;
        const entry = byCat.get(test.category);
        if (!entry) continue;
        entry.total += pct;
        entry.cnt += 1;
      }
    }
    return [...byCat.entries()]
      .map(([cat, v]) => ({
        category: cat,
        label: v.label,
        avg: v.cnt === 0 ? 0 : Math.round(v.total / v.cnt),
        cnt: v.cnt,
        color: v.color,
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [rows, tests]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={t("Estado por categoría — pacientes filtrados")}
        description={t(
          "Promedio de severidad (0–100) por dominio clínico · {count} pacientes en filtro",
          { count: String(count) },
        )}
        icon={Activity}
        variant="primary"
      />
      <div className="grid gap-x-8 gap-y-3 p-5 xl:grid-cols-2">
        {data.map((d) => {
          const risk: RiskLevel =
            d.avg >= 70
              ? "alto"
              : d.avg >= 40
                ? "moderado"
                : d.avg > 0
                  ? "bajo"
                  : "sin-evaluar";
          return (
            <div key={d.category} className="flex items-center gap-3">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs"
                style={{ backgroundColor: `${d.color}1A`, color: d.color }}
              >
                {tests.find((x) => x.category === d.category)?.icon ?? "●"}
              </span>
              <span className="w-28 shrink-0 truncate text-xs font-medium">
                {d.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${d.avg}%`, backgroundColor: d.color }}
                />
              </div>
              <span
                className="w-9 text-right text-xs font-bold"
                style={{ color: d.color }}
              >
                {d.avg}
              </span>
              <RiskBadge
                risk={risk}
                label={RISK_LABELS[risk] ?? risk}
                className="hidden px-2 py-0.5 text-[10.5px] sm:inline-flex"
              />
              <span className="hidden w-16 text-right text-xs text-muted-foreground lg:block">
                {d.cnt} evals
              </span>
            </div>
          );
        })}
      </div>
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
          render={
            <a href={`/health-tests/pacientes/${row.patient.id}#historial`} />
          }
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
