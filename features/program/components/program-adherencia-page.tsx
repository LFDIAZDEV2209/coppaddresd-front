"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Search,
  ArrowUpDown,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Flame,
  Trophy,
  BarChart3,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgramAdherencia } from "../hooks/use-program-adherencia";
import {
  MISSION_COLORS,
  MISSION_LABELS,
  MISSION_ORDER,
  adherenceChipClass,
  CHART_TOOLTIP,
} from "../services/program-erp-constants";
import { PagedListFooter } from "./paged-list-footer";

const SORT_OPTIONS = [
  { value: "global_pct", label: "Adherencia global" },
  { value: "xp", label: "XP total" },
  { value: "current_streak", label: "Racha actual" },
  { value: "patient_name", label: "Nombre" },
] as const;

// --- Componente principal ---

export function ProgramAdherenciaPage() {
  const {
    data,
    loading,
    error,
    page,
    pageSize,
    search,
    setPage,
    setPageSize,
    setFilters,
    retry,
  } = useProgramAdherencia(1, 5);

  const [searchInput, setSearchInput] = useState(search);
  const [sortBy, setSortBy] = useState<string>("global_pct");
  const [sortDir, setSortDir] = useState<string>("desc");

  const handleSearch = () => {
    setFilters({ search: searchInput, sortBy, sortDir });
  };

  const handleSort = (field: string) => {
    const newDir = sortBy === field && sortDir === "desc" ? "asc" : "desc";
    setSortBy(field);
    setSortDir(newDir);
    setFilters({ sortBy: field, sortDir: newDir });
  };

  const handleExportCsv = () => {
    if (!data?.tabla.data) return;
    const headers = [
      "Paciente",
      "Global %",
      ...MISSION_ORDER.map((c) => MISSION_LABELS[c]),
      "XP",
      "Racha",
      "Tendencia",
    ];
    const rows = data.tabla.data.map((r) => [
      r.patient_name,
      r.global_pct,
      ...MISSION_ORDER.map((c) => r[`${c}_pct` as keyof typeof r] ?? 0),
      r.xp,
      r.current_streak,
      r.trend,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "adherencia_rachas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = data?.tabla.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Adherencia & Rachas"
        description="Tendencia semanal, ranking de rachas y tabla detallada por paciente"
        icon={TrendingUp}
        actions={
          <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        }
      />

      {loading && !data ? (
        <AdherenciaSkeleton />
      ) : error ? (
        <AdherenciaError message={error} onRetry={retry} />
      ) : data ? (
        <div className="flex flex-col gap-6">
          {/* KPI Summary Cards */}
          <AdherenciaKpiCards data={data} />

          {/* Charts Row: Tendencia (standalone) + Rachas (tabbed) */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Tendencia 8 semanas — standalone */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionHeader
                title="Tendencia 8 semanas"
                description="Evolución por misión"
                icon={TrendingUp}
                variant="secondary"
              />
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buildWeeklyChart(data.tendencia_8_semanas)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, ""]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {MISSION_ORDER.map((code) => (
                      <Line
                        key={code}
                        type="monotone"
                        dataKey={code}
                        name={MISSION_LABELS[code]}
                        stroke={MISSION_COLORS[code]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking / Tabla — tabbed card */}
            <AdherenciaRachasCard data={data} />
          </section>

          <AdherenciaTablaSection
            data={data}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortDir={sortDir}
            setSortDir={setSortDir}
            setFilters={setFilters}
            handleSearch={handleSearch}
            handleSort={handleSort}
            handleExportCsv={handleExportCsv}
            page={page}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      ) : null}
    </div>
  );
}

// --- Helpers ---

function buildWeeklyChart(
  data: import("../types/erp").ErpWeeklyMissionPct[],
): Record<string, string | number>[] {
  const weeks = [...new Set(data.map((d) => d.week_start))].sort();
  return weeks.map((week) => {
    const row: Record<string, string | number> = {
      week: new Date(week).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      }),
    };
    for (const code of MISSION_ORDER) {
      const match = data.find(
        (d) => d.week_start === week && d.task_code === code,
      );
      row[code] = match?.pct ?? 0;
    }
    return row;
  });
}

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case "up":
      return <ArrowUp className="inline size-4 text-success" />;
    case "down":
      return <ArrowDown className="inline size-4 text-destructive" />;
    default:
      return <Minus className="inline size-4 text-muted-foreground" />;
  }
}

// --- KPI Summary Cards ---

function AdherenciaKpiCards({
  data,
}: {
  data: import("../types/erp").ProgramErpAdherenciaDto;
}) {
  // Compute KPIs from available data
  const maxStreak = useMemo(() => {
    const rankingMax = data.ranking_rachas.length > 0
      ? Math.max(...data.ranking_rachas.map((r) => r.current_streak))
      : 0;
    const tablaMax = data.tabla.data.length > 0
      ? Math.max(...data.tabla.data.map((r) => r.current_streak))
      : 0;
    return Math.max(rankingMax, tablaMax);
  }, [data.ranking_rachas, data.tabla.data]);

  const globalPctAvg = useMemo(() => {
    if (data.tabla.data.length === 0) return null;
    const sum = data.tabla.data.reduce((acc, r) => acc + r.global_pct, 0);
    return Math.round(sum / data.tabla.data.length);
  }, [data.tabla.data]);

  // Trend: compare last week avg vs second-last week from tendencia_8_semanas
  const trendDelta = useMemo(() => {
    const weeks = [...new Set(data.tendencia_8_semanas.map((d) => d.week_start))].sort();
    if (weeks.length < 2) return null;
    const getWeekAvg = (weekStart: string) => {
      const entries = data.tendencia_8_semanas.filter((d) => d.week_start === weekStart);
      if (entries.length === 0) return 0;
      return entries.reduce((sum, e) => sum + e.pct, 0) / entries.length;
    };
    const last = getWeekAvg(weeks[weeks.length - 1]);
    const prev = getWeekAvg(weeks[weeks.length - 2]);
    return last - prev;
  }, [data.tendencia_8_semanas]);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Racha más larga activa"
        value={maxStreak > 0 ? String(maxStreak) : "—"}
        icon={Flame}
        variant="warning"
        context={maxStreak > 0 ? "Días consecutivos" : "Sin datos de racha"}
      />
      <StatCard
        label="Adherencia global"
        value={globalPctAvg !== null ? `${globalPctAvg}%` : "—"}
        icon={BarChart3}
        variant="info"
        context="Promedio global pacientes"
        trend={
          trendDelta !== null
            ? {
                value: `${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}%`,
                direction: trendDelta >= 0 ? "up" : "down",
              }
            : undefined
        }
      />
      <StatCard
        label="Rachas rotas"
        value="—"
        icon={Lock}
        variant="default"
        context="No disponible"
      />
      <StatCard
        label="Cofres desbloqueados esta semana"
        value="—"
        icon={CheckCircle2}
        variant="success"
        context="No disponible"
      />
    </section>
  );
}

// --- Rachas Card (Top 10, lista en 2 columnas) ---

function AdherenciaRachasCard({
  data,
}: {
  data: import("../types/erp").ProgramErpAdherenciaDto;
}) {
  const top10 = data.ranking_rachas.slice(0, 10);

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title="Rachas"
        description="Top 10 pacientes por racha actual"
        icon={Trophy}
        variant="secondary"
      />
      {top10.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">
            Sin datos de ranking de rachas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          {top10.map((r, idx) => (
            <div
              key={r.patient_id}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-background/50 px-3 py-2"
            >
              <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {r.rank ?? idx + 1}
              </span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {r.patient_name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {r.patient_id ? (
                  <Link
                    href={`/program/patients/${r.patient_id}`}
                    className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                  >
                    {r.patient_name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium">
                    {r.patient_name}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  Racha actual {r.current_streak} · más larga {r.longest_streak}
                </span>
              </div>
              <Badge className="shrink-0 bg-warning-soft text-warning">
                <Flame className="size-3" /> {r.current_streak}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Tabla Section (filters + table + pagination) ---

function AdherenciaTablaSection({
  data,
  searchInput,
  setSearchInput,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  setFilters,
  handleSearch,
  handleSort,
  handleExportCsv,
  page,
  pageSize,
  setPage,
  setPageSize,
}: {
  data: import("../types/erp").ProgramErpAdherenciaDto;
  searchInput: string;
  setSearchInput: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortDir: string;
  setSortDir: (v: string) => void;
  setFilters: (filters: { search?: string; sortBy?: string; sortDir?: string }) => void;
  handleSearch: () => void;
  handleSort: (field: string) => void;
  handleExportCsv: () => void;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}) {
  const totalPages = data.tabla.totalPages;

  return (
    <>
      {/* Filters */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Tabla de adherencia</h2>
            <p className="text-xs text-muted-foreground">
              {data.tabla.total} pacientes · Página {data.tabla.page} de{" "}
              {data.tabla.totalPages}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
            >
              <Download data-icon="inline-start" />
              CSV
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar paciente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Buscar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSortBy("global_pct");
                setSortDir("desc");
                setFilters({ search: "", sortBy: "global_pct", sortDir: "desc" });
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {/* Table */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("global_pct")}>
                Global %
                <ArrowUpDown className="ml-1 inline size-3" />
              </TableHead>
              {MISSION_ORDER.map((code) => (
                <TableHead key={code} className="hidden text-center lg:table-cell">
                  <span style={{ color: MISSION_COLORS[code] }}>
                    {MISSION_LABELS[code]?.slice(0, 3)}
                  </span>
                </TableHead>
              ))}
              <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort("xp")}>
                XP
                <ArrowUpDown className="ml-1 inline size-3" />
              </TableHead>
              <TableHead className="hidden cursor-pointer select-none text-right md:table-cell" onClick={() => handleSort("current_streak")}>
                Racha
                <ArrowUpDown className="ml-1 inline size-3" />
              </TableHead>
              <TableHead className="text-center">Tendencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.tabla.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                  No se encontraron pacientes con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              data.tabla.data.map((row) => (
                <TableRow key={row.patient_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {row.patient_name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {row.patient_id ? (
                          <Link
                            href={`/program/patients/${row.patient_id}`}
                            className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                          >
                            {row.patient_name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-medium">
                            {row.patient_name}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          Semana {row.current_week}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={adherenceChipClass(row.global_pct)}>
                      {row.global_pct}%
                    </span>
                  </TableCell>
                  {MISSION_ORDER.map((code) => (
                    <TableCell
                      key={code}
                      className="hidden text-center lg:table-cell"
                    >
                      <span
                        className={adherenceChipClass(row[`${code}_pct` as keyof typeof row] as number ?? 0)}
                      >
                        {row[`${code}_pct` as keyof typeof row] as number ?? 0}%
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums font-medium">
                    {row.xp.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    <Badge className="bg-warning-soft text-warning">
                      <Flame className="size-3" /> {row.current_streak}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendIcon trend={row.trend} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PagedListFooter
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </>
  );
}

// --- Skeleton & Error ---

function AdherenciaSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-[280px] w-full rounded" />
          </div>
        ))}
      </section>
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-48 mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <div className="flex-1" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdherenciaError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        Error al cargar adherencia
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
