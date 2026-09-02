"use client";

import { useState } from "react";
import {
  BarChart3,
  Trophy,
  Flame,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { PagedListFooter } from "./paged-list-footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgramDashboard } from "../hooks/use-program-dashboard";
import {
  MISSION_COLORS,
  MISSION_LABELS,
  MISSION_ORDER,
  CLINICAL_COLORS,
  CHART_TOOLTIP,
  xpCategoryLabel,
  xpCategoryColor,
} from "../services/program-erp-constants";
import { ChartTabs, usePersistedTab } from "./chart-tabs";
import type {
  ErpMissionAdherence,
  ErpStreakBucket,
  ErpDailyAdherence,
  ErpLeaderboardEntry,
  ErpPatientTrend,
} from "../types/erp";

// --- Componente principal ---

export function ProgramDashboardPage() {
  const { data, loading, error, retry } = useProgramDashboard();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Dashboard General"
        description="Vista consolidada del programa ANTARES: adherencia, XP y pacientes"
        icon={BarChart3}
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

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <DashboardError message={error} onRetry={retry} />
      ) : data ? (
        <DashboardContent data={data} />
      ) : null}
    </div>
  );
}

// --- Contenido principal ---

function DashboardContent({
  data,
}: {
  data: import("../types/erp").ProgramErpDashboardDto;
}) {
  const { kpis, adherencia_por_mision_hoy, distribucion_rachas, xp_por_categoria, evolucion_30d, top5, mejoraron, empeoraron } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Adherencia global hoy"
          value={`${kpis.adherence_global_hoy}%`}
          icon={BarChart3}
          variant="info"
          context={`${kpis.total_active} pacientes activos`}
        />
        <StatCard
          label="XP esta semana"
          value={kpis.xp_semana.toLocaleString()}
          icon={Trophy}
          variant="success"
          context="Misiones + cofres + clínico"
        />
        <StatCard
          label="Pacientes con racha > 7"
          value={String(kpis.pacientes_racha_gt7)}
          icon={Flame}
          variant="warning"
          context={`${kpis.total_active} pacientes en el programa`}
        />
        <StatCard
          label="En riesgo"
          value={String(kpis.en_riesgo)}
          icon={AlertTriangle}
          variant="destructive"
          context="Requieren seguimiento"
        />
      </section>

      {/* Charts Row 1: Adherencia (tabbed) + XP donut */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card A: Adherencia — tabs: misión / rachas / fase */}
        <DashboardAdherenciaCard
          adherenciaPorMision={adherencia_por_mision_hoy}
          distribucionRachas={distribucion_rachas}
          distribucionSemanas={data.distribucion_semanas ?? []}
        />

        {/* Card C: XP por categoría (donut, standalone) */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="XP por categoría"
            description="Distribución de XP por origen (misiones, cofres, bonus)"
            icon={Trophy}
            variant="secondary"
          />
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={xp_por_categoria.map((x) => ({
                    name: xpCategoryLabel(x.category),
                    value: x.total,
                    color: xpCategoryColor(x.category),
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {xp_por_categoria.map((x) => (
                    <Cell key={x.category} fill={xpCategoryColor(x.category)} />
                  ))}
                </Pie>
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value) => [String(value ?? 0), "XP"]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Charts Row 2: Tendencias (tabbed) + Pacientes (tabbed) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card B: Tendencias — tabs: adherencia 30d / xp 30d / clínico */}
        <DashboardTendenciasCard
          evolucion30d={evolucion_30d}
          evolucionXp30d={data.evolucion_xp_30d ?? []}
          evolucionClinica30d={data.evolucion_clinica_30d ?? []}
        />

        {/* Card D: Pacientes — tabs: top5 / mejoraron / enriesgo */}
        <DashboardPacientesCard
          top5={top5}
          mejoraron={mejoraron}
          empeoraron={empeoraron}
        />
      </section>
    </div>
  );
}

// --- Sub-componentes ---

/** Card A: Adherencia — tabs for mission / streaks / phase. */
function DashboardAdherenciaCard({
  adherenciaPorMision,
  distribucionRachas,
  distribucionSemanas,
}: {
  adherenciaPorMision: ErpMissionAdherence[];
  distribucionRachas: ErpStreakBucket[];
  distribucionSemanas: { label: string; count: number }[];
}) {
  const [tab, setTab] = usePersistedTab("dashboard-adherencia", "mision");

  return (
    <ChartTabs
      tabs={[
        { key: "mision", label: "Por misión hoy" },
        { key: "rachas", label: "Distribución de rachas" },
        { key: "fase", label: "Por fase/semana" },
      ]}
      value={tab}
      onChange={setTab}
      title="Adherencia"
      description="Tendencia y distribución de adherencia"
      icon={BarChart3}
    >
      <div className="h-[280px]">
        {tab === "mision" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MISSION_ORDER.map((code) => {
                const m = adherenciaPorMision.find(
                  (a) => a.task_code === code,
                );
                return {
                  name: MISSION_LABELS[code] ?? code,
                  pct: m?.pct ?? 0,
                  color: MISSION_COLORS[code],
                };
              })}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                {...CHART_TOOLTIP}
                cursor={{ fill: "var(--muted)" }}
                formatter={(value) => [`${value}%`, "Adherencia"]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {MISSION_ORDER.map((code) => (
                  <Cell key={code} fill={MISSION_COLORS[code]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === "rachas" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribucionRachas}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip {...CHART_TOOLTIP} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === "fase" && (
          distribucionSemanas.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribucionSemanas}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip {...CHART_TOOLTIP} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Sin datos de distribución por fase.
              </p>
            </div>
          )
        )}
      </div>
    </ChartTabs>
  );
}

/** Card B: Tendencias — tabs for adherence / XP / clinical lines. */
function DashboardTendenciasCard({
  evolucion30d,
  evolucionXp30d,
  evolucionClinica30d,
}: {
  evolucion30d: ErpDailyAdherence[];
  evolucionXp30d: { date: string; value: number }[];
  evolucionClinica30d: {
    date: string;
    bmi_avg: number | null;
    hba1c_avg: number | null;
    body_fat_avg: number | null;
  }[];
}) {
  const [tab, setTab] = usePersistedTab("dashboard-tendencias", "adherencia");

  return (
    <ChartTabs
      tabs={[
        { key: "adherencia", label: "Adherencia 30d" },
        { key: "xp", label: "XP 30d" },
        { key: "clinico", label: "Mediciones clínicas" },
      ]}
      value={tab}
      onChange={setTab}
      title="Tendencias"
      description="Evolución últimos 30 días"
      icon={TrendingUp}
    >
      <div className="h-[280px]">
        {tab === "adherencia" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucion30d}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(value) => [`${value}%`, "Adherencia"]}
                labelFormatter={(label) => {
                  const d = new Date(String(label));
                  return d.toLocaleDateString("es-ES");
                }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === "xp" && (
          evolucionXp30d.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucionXp30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => {
                    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                    return String(v);
                  }}
                />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value) => {
                    const num = Number(value);
                    return [
                      num >= 1000 ? `${(num / 1000).toFixed(1)}K` : String(num),
                      "XP",
                    ];
                  }}
                  labelFormatter={(label) => {
                    const d = new Date(String(label));
                    return d.toLocaleDateString("es-ES");
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Sin datos de evolución de XP.
              </p>
            </div>
          )
        )}

        {tab === "clinico" && (
          evolucionClinica30d.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucionClinica30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value, name) => [Number(value).toFixed(1), name]}
                  labelFormatter={(label) => {
                    const d = new Date(String(label));
                    return d.toLocaleDateString("es-ES");
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="bmi_avg"
                  name="BMI"
                  stroke={CLINICAL_COLORS.bmi}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="hba1c_avg"
                  name="HbA1c %"
                  stroke={CLINICAL_COLORS.hba1c}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="body_fat_avg"
                  name="% Grasa"
                  stroke={CLINICAL_COLORS.body_fat}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Sin datos de mediciones clínicas.
              </p>
            </div>
          )
        )}
      </div>
    </ChartTabs>
  );
}

/** Card D: Pacientes — tabs for top5 / mejoraron / empeoraron. */
function DashboardPacientesCard({
  top5,
  mejoraron,
  empeoraron,
}: {
  top5: ErpLeaderboardEntry[];
  mejoraron: ErpPatientTrend[];
  empeoraron: ErpPatientTrend[];
}) {
  const [tab, setTab] = usePersistedTab("dashboard-pacientes", "top");

  // Paginación client-side; 5 por defecto pero cambiable desde el footer.
  const [pageSize, setPageSize] = useState(5);
  const [topPage, setTopPage] = useState(1);
  const [trendPage, setTrendPage] = useState(1);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setTopPage(1);
    setTrendPage(1);
  };

  const topTotalPages = Math.max(1, Math.ceil(top5.length / pageSize));
  const topSafePage = Math.min(topPage, topTotalPages);
  const topItems = top5.slice(
    (topSafePage - 1) * pageSize,
    topSafePage * pageSize,
  );

  const activeTrend = tab === "mejoraron" ? mejoraron : empeoraron;
  const activeTrendPages = Math.max(
    1,
    Math.ceil(activeTrend.length / pageSize),
  );
  const trendSafePage = Math.min(trendPage, activeTrendPages);
  const trendItems = activeTrend.slice(
    (trendSafePage - 1) * pageSize,
    trendSafePage * pageSize,
  );

  const handleTabChange = (key: string) => {
    setTab(key);
    setTopPage(1);
    setTrendPage(1);
  };

  return (
    <ChartTabs
      tabs={[
        { key: "top", label: "Top 5" },
        { key: "mejoraron", label: "Mejoraron" },
        { key: "enriesgo", label: "En riesgo" },
      ]}
      value={tab}
      onChange={handleTabChange}
      title="Pacientes"
      description="Ranking y evolución del Índice de Salud"
      icon={Users}
    >
      {tab === "top" && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="w-24 text-right">XP</TableHead>
                <TableHead className="hidden w-24 text-right md:table-cell">
                  Adherencia
                </TableHead>
                <TableHead className="hidden w-28 md:table-cell">
                  Racha
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {top5.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Trophy className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de leaderboard disponibles.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              topItems.map((entry) => (
                <TableRow key={entry.patient_id}>
                  <TableCell>
                    {entry.rank <= 3 ? (
                      <span
                        className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                          entry.rank === 1
                            ? "bg-warning-soft text-warning"
                            : entry.rank === 2
                              ? "bg-muted text-muted-foreground"
                              : "bg-warning-soft/50 text-warning/80"
                        }`}
                      >
                        {entry.rank}
                      </span>
                    ) : (
                      <span className="tabular-nums text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {entry.patient_name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      {entry.patient_id ? (
                        <Link
                          href={`/program/patients/${entry.patient_id}`}
                          className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                        >
                          {entry.patient_name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-medium">
                          {entry.patient_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {entry.xp.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {entry.adherence}%
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className="bg-warning-soft text-warning">
                      <Flame className="size-3" /> {entry.current_streak}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
          {top5.length > 0 && (
            <PagedListFooter
              page={topSafePage}
              totalPages={topTotalPages}
              onPageChange={setTopPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}

      {tab === "mejoraron" && (
        <TrendList
          title="Mejoraron"
          icon={<TrendingUp className="size-4 text-success" />}
          entries={trendItems}
          total={mejoraron.length}
          page={trendSafePage}
          totalPages={activeTrendPages}
          onPageChange={setTrendPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          emptyMessage="Ningún paciente mejoró su Índice de Salud respecto al período anterior."
        />
      )}

      {tab === "enriesgo" && (
        <TrendList
          title="Empeoraron"
          icon={<TrendingDown className="size-4 text-destructive" />}
          entries={trendItems}
          total={empeoraron.length}
          page={trendSafePage}
          totalPages={activeTrendPages}
          onPageChange={setTrendPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          emptyMessage="Ningún paciente empeoró su Índice de Salud respecto al período anterior."
        />
      )}
    </ChartTabs>
  );
}

function TrendList({
  title,
  icon,
  entries,
  total,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  /** Filas YA paginadas (slice de la página actual). */
  entries: import("../types/erp").ErpPatientTrend[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  emptyMessage: string;
}) {
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        {icon}
        <span className="text-[14px] font-semibold">{title}</span>
        <Badge variant="outline" className="ml-auto text-[11px]">
          {total}
        </Badge>
      </div>
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            {entries.map((e) => (
            <div
              key={e.patient_id}
              className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {e.patient_name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {e.patient_id ? (
                  <Link
                    href={`/program/patients/${e.patient_id}`}
                    className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                  >
                    {e.patient_name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium">
                    {e.patient_name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Índice de Salud:{" "}
                  <span className="tabular-nums">{e.previous_pct}</span>
                  {" → "}
                  <span className="font-medium tabular-nums text-foreground">
                    {e.current_pct}
                  </span>{" "}
                  puntos
                </span>
              </div>
              <Badge
                className={
                  e.delta_pct >= 0
                    ? "bg-success-soft text-success-foreground"
                    : "bg-destructive-soft text-destructive"
                }
              >
                {e.delta_pct >= 0 ? "+" : ""}
                {e.delta_pct.toFixed(1)}%
              </Badge>
            </div>
          ))}
          </div>
          <PagedListFooter
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI skeletons */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 rounded-[10px]" />
              <div className="flex-1" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </section>
      {/* Chart skeletons */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-[280px] w-full rounded" />
          </div>
        ))}
      </section>
      {/* Table skeleton */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border py-3 last:border-0"
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <div className="flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        Error al cargar el dashboard
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
