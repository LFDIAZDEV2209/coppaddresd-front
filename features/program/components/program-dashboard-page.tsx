"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  Trophy,
  Flame,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Heart,
  Activity,
  Droplet,
  Download,
  Search,
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
import { Input } from "@/components/ui/input";
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
import { useProgramDashboard } from "../hooks/use-program-dashboard";
import { useBiometriaCommunity } from "../hooks/use-biometria-community";
import { useBiometriaPatients } from "../hooks/use-biometria-patients";
import { exportBiometriaCsv } from "../services/program-biometria-service";

import { BiometriaUsaSvgMap } from "./biometria-usa-svg-map";
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
  BiometriaImcBucket,
  BiometriaGrBodyFatBucket,
  BiometriaGlucosaBucket,
} from "../types/erp";

// --- Biometría colors (no hardcoded hex — use CSS vars where possible) ---
const GLUCOSA_COLORS: Record<string, string> = {
  Normal: "var(--success)",
  Atención: "#D4AF37",
  Prediabetes: "#E87B2B",
  Elevada: "var(--destructive)",
  "Sin dato": "var(--muted)",
};

// --- Componente principal ---

export function ProgramDashboardPage() {
  const { data: dashData, loading: dashLoading, error: dashError, retry: dashRetry } = useProgramDashboard();
  const { data: bioData, loading: bioLoading, error: bioError, retry: bioRetry } = useBiometriaCommunity();

  const loading = dashLoading || bioLoading;
  const error = dashError || bioError;
  const retry = () => { dashRetry(); bioRetry(); };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Dashboard General"
        description="Vista consolidada: salud comunitaria + adherencia y XP"
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

      {loading && !dashData && !bioData ? (
        <DashboardSkeleton />
      ) : error && !dashData && !bioData ? (
        <DashboardError message={error} onRetry={retry} />
      ) : (
        <>
          {/* --- Health-first KPIs (biometría) --- */}
          {bioData && <BiometriaKpis data={bioData} />}

          {/* --- Mapa + Top Cities + Alertas --- */}
          {bioData && bioData.cities.length > 0 && (
            <BiometriaMapRow data={bioData} />
          )}

          {/* --- Distribution charts --- */}
          {bioData && <BiometriaDistributionRow data={bioData} />}

          {/* --- Biometría patient list --- */}
          {bioData && <BiometriaPatientListCard />}

          {/* --- Híbrido: Gamificación secondary row --- */}
          {dashData && <GamificacionSecondaryRow data={dashData} />}
        </>
      )}
    </div>
  );
}

// ===== BIOMETRÍA SECTIONS =====

/** 4 Health KPIs at top */
function BiometriaKpis({ data }: { data: import("../types/erp").BiometriaCommunityDto }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="IMC promedio"
        value={data.avg_imc != null ? data.avg_imc.toFixed(1) : "—"}
        icon={Activity}
        variant="info"
        context="Índice de Masa Corporal promedio"
      />
      <StatCard
        label="% Grasa promedio"
        value={data.avg_grasa != null ? `${data.avg_grasa.toFixed(1)}%` : "—"}
        icon={Heart}
        variant="warning"
        context="Grasa corporal promedio"
      />
      <StatCard
        label="Glucosa promedio"
        value={data.avg_glucosa != null ? data.avg_glucosa.toFixed(1) : "—"}
        icon={Droplet}
        variant="destructive"
        context="Glucosa promedio (mg/dL)"
      />
      <StatCard
        label="Mejorando"
        value={String(data.improving_count)}
        icon={TrendingUp}
        variant="success"
        context="Pacientes con tendencia positiva"
      />
    </section>
  );
}

/** Map + Top 5 ciudades + Alertas críticas */
function BiometriaMapRow({ data }: { data: import("../types/erp").BiometriaCommunityDto }) {
  const top5 = [...data.cities].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      {/* Map */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SectionHeader
          title="Mapa de calor IMC"
          description="Distribución geográfica de pacientes"
          icon={BarChart3}
          variant="primary"
        />
        <div className="p-4">
          <BiometriaUsaSvgMap cities={data.cities} />
        </div>
      </div>

      {/* Sidebar: Top 5 + Alertas */}
      <div className="flex flex-col gap-4">
        {/* Top 5 ciudades */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Top ciudades"
            description="Por número de pacientes"
            icon={Users}
            variant="secondary"
          />
          <div className="mt-3 flex flex-col gap-2">
            {top5.map((c, i) => (
              <div key={`${c.name}-${c.state_abbr}`} className="flex items-center gap-2">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i === 0 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {c.name}{c.state_abbr ? `, ${c.state_abbr}` : ""}
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {c.count}
                </Badge>
              </div>
            ))}
            {top5.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin datos</p>
            )}
          </div>
        </div>

        {/* Alertas críticas */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Alertas críticas"
            description="Pacientes que requieren atención"
            icon={AlertTriangle}
            variant="destructive"
          />
          <div className="mt-3 flex flex-col gap-2">
            {data.alerts.slice(0, 5).map((a) => (
              <Link
                key={a.patient_id}
                href={`/program/gestion?view=perfil-360&patient=${a.patient_id}`}
                className="flex items-start gap-2 rounded-lg p-2 hover:bg-muted transition-colors"
              >
                <span className="mt-0.5 size-2 shrink-0 rounded-full bg-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{a.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{a.reason}</p>
                </div>
              </Link>
            ))}
            {data.alerts.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin alertas activas</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Distribution charts: IMC bar + Grasa grouped bar + Glucosa donut */
function BiometriaDistributionRow({ data }: { data: import("../types/erp").BiometriaCommunityDto }) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* IMC distribution bar */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="Distribución IMC"
          description="Categorías de IMC"
          icon={Activity}
          variant="secondary"
        />
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.imc_distribution.map((b) => ({ name: b.label, count: b.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip {...CHART_TOOLTIP} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.imc_distribution.map((b, i) => (
                  <Cell
                    key={b.label}
                    fill={i === 0 ? "var(--info)" : i === 1 ? "var(--success)" : i === 2 ? "#D4AF37" : i === 3 ? "#E87B2B" : "var(--destructive)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grasa % por sexo (grouped bar) */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="% Grasa por sexo"
          description="Distribución hombre / mujer"
          icon={Heart}
          variant="secondary"
        />
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buildGrasaGroupedData(
                data.grasa_distribution.male,
                data.grasa_distribution.female,
              )}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip {...CHART_TOOLTIP} cursor={{ fill: "var(--muted)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hombre" fill="var(--info)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mujer" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Glucosa donut */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="Glucosa"
          description="Distribución por categoría"
          icon={Droplet}
          variant="secondary"
        />
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.glucosa_distribution.map((b) => ({
                  name: b.label,
                  value: b.count,
                  color: GLUCOSA_COLORS[b.label] ?? "var(--muted)",
                }))}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.glucosa_distribution.map((b) => (
                  <Cell key={b.label} fill={GLUCOSA_COLORS[b.label] ?? "var(--muted)"} />
                ))}
              </Pie>
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(value) => [String(value ?? 0), "Pacientes"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

/** Patient list with filters + CSV export */
function BiometriaPatientListCard() {
  const { data, loading, filters, updateFilters } = useBiometriaPatients({ pageSize: 5 });

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <SectionHeader
        title="Listado biometría"
        description="Pacientes con indicadores de salud"
        icon={Users}
        variant="secondary"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportBiometriaCsv()}
            className="h-7 text-xs"
          >
            <Download className="mr-1 size-3" />
            CSV
          </Button>
        }
      />

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-2.5">
        {[
          { key: "all", label: "Todos" },
          { key: "imc_critico", label: "IMC crítico ≥35" },
          { key: "grasa_alta", label: "Grasa alta" },
          { key: "glucosa_riesgo", label: "Glucosa riesgo" },
          { key: "mejorando", label: "Mejorando" },
        ].map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => {
              if (chip.key === "all") updateFilters({ imcCategory: "", glucosaCategory: "", gender: "" });
              else if (chip.key === "imc_critico") updateFilters({ imcCategory: "Obesidad II-III" });
              else if (chip.key === "grasa_alta") updateFilters({ imcCategory: "Alto" });
              else if (chip.key === "glucosa_riesgo") updateFilters({ glucosaCategory: "Elevada" });
              else if (chip.key === "mejorando") updateFilters({ search: "" }); // no filter available; just reset
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              (chip.key === "all" && !filters.imcCategory && !filters.glucosaCategory && !filters.gender)
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {chip.label}
          </button>
        ))}

        {/* Gender filter */}
        <Select value={filters.gender || "__all__"} onValueChange={(v) => updateFilters({ gender: v === "__all__" ? "" : v ?? "" })}>
          <SelectTrigger className="h-7 w-[100px] text-[11px]">
            <SelectValue placeholder="Sexo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="male">Hombre</SelectItem>
            <SelectItem value="female">Mujer</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="h-7 w-[140px] pl-7 text-[11px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="w-16 text-center">Sexo</TableHead>
              <TableHead className="w-16 text-right">IMC</TableHead>
              <TableHead className="hidden w-20 text-right sm:table-cell">% Grasa</TableHead>
              <TableHead className="hidden w-20 text-right sm:table-cell">Glucosa</TableHead>
              <TableHead className="hidden w-16 text-center md:table-cell">Racha</TableHead>
              <TableHead className="hidden w-20 md:table-cell">Tendencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">Sin pacientes con estos filtros.</p>
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((p) => (
                <TableRow key={p.patient_id}>
                  <TableCell>
                    <Link
                      href={`/program/gestion?view=perfil-360&patient=${p.patient_id}`}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.city && (
                      <span className="block text-[11px] text-muted-foreground">{p.city}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {p.gender === "male" ? "H" : p.gender === "female" ? "M" : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium">
                    {p.imc?.toFixed(1) ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">
                    {p.pct_grasa != null ? `${p.pct_grasa.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">
                    {p.glucosa?.toFixed(0) ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <Badge className="bg-warning-soft text-warning text-[10px]">
                      <Flame className="size-2.5" /> {p.streak}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.trend === "up" ? (
                      <TrendingUp className="size-4 text-success" />
                    ) : p.trend === "down" ? (
                      <TrendingDown className="size-4 text-destructive" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 0 && (
        <PagedListFooter
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={(p) => updateFilters({ page: p })}
          pageSize={filters.pageSize}
          onPageSizeChange={(s) => updateFilters({ pageSize: s, page: 1 })}
        />
      )}
    </div>
  );
}

// ===== GAMIFICACIÓN SECONDARY (below biometría) =====

function GamificacionSecondaryRow({
  data,
}: {
  data: import("../types/erp").ProgramErpDashboardDto;
}) {
  const {
    kpis,
    adherencia_por_mision_hoy,
    distribucion_rachas,
    xp_por_categoria,
    evolucion_30d,
    top5,
    mejoraron,
    empeoraron,
  } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Secondary KPIs: XP + Rachas + Riesgo */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="XP esta semana"
          value={kpis.xp_semana.toLocaleString()}
          icon={Trophy}
          variant="success"
          context="Misiones + cofres + clínico"
        />
        <StatCard
          label="Racha > 7 días"
          value={String(kpis.pacientes_racha_gt7)}
          icon={Flame}
          variant="warning"
          context={`${kpis.total_active} pacientes activos`}
        />
        <StatCard
          label="En riesgo"
          value={String(kpis.en_riesgo)}
          icon={AlertTriangle}
          variant="destructive"
          context="Requieren seguimiento"
        />
      </section>

      {/* Charts Row: Adherencia + XP donut (compact) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardAdherenciaCard
          adherenciaPorMision={adherencia_por_mision_hoy}
          distribucionRachas={distribucion_rachas}
          distribucionSemanas={data.distribucion_semanas ?? []}
        />

        {/* XP donut (compact) */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="XP por categoría"
            description="Distribución de XP por origen"
            icon={Trophy}
            variant="secondary"
          />
          <div className="mt-4 h-[240px]">
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
                  innerRadius={50}
                  outerRadius={85}
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Tendencias + Pacientes */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardTendenciasCard
          evolucion30d={evolucion_30d}
          evolucionXp30d={data.evolucion_xp_30d ?? []}
          evolucionClinica30d={data.evolucion_clinica_30d ?? []}
        />
        <DashboardPacientesCard
          top5={top5}
          mejoraron={mejoraron}
          empeoraron={empeoraron}
        />
      </section>
    </div>
  );
}

// ===== HELPER FUNCTIONS =====

function buildGrasaGroupedData(
  male: BiometriaGrBodyFatBucket[],
  female: BiometriaGrBodyFatBucket[],
): { label: string; Hombre: number; Mujer: number }[] {
  // Merge by matching labels (Óptimo, Normal, Alto, Obesidad)
  const labels = ["Óptimo", "Normal", "Alto", "Obesidad"];
  return labels.map((label) => ({
    label,
    Hombre: male.find((b) => b.label === label)?.count ?? 0,
    Mujer: female.find((b) => b.label === label)?.count ?? 0,
  }));
}

// ===== EXISTING SUB-COMPONENTS (preserved) =====

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
      <div className="h-[240px]">
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
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
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
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
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
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(value) => [`${value}%`, "Adherencia"]}
                labelFormatter={(label) => {
                  const d = new Date(String(label));
                  return d.toLocaleDateString("es-ES");
                }}
              />
              <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2} dot={false} />
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
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
                <Line type="monotone" dataKey="value" stroke="var(--success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin datos de evolución de XP.</p>
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
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value, name) => [Number(value).toFixed(1), name]}
                  labelFormatter={(label) => {
                    const d = new Date(String(label));
                    return d.toLocaleDateString("es-ES");
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="bmi_avg" name="BMI" stroke={CLINICAL_COLORS.bmi} strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="hba1c_avg" name="HbA1c %" stroke={CLINICAL_COLORS.hba1c} strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="body_fat_avg" name="% Grasa" stroke={CLINICAL_COLORS.body_fat} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin datos de mediciones clínicas.</p>
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
  const topItems = top5.slice((topSafePage - 1) * pageSize, topSafePage * pageSize);

  const activeTrend = tab === "mejoraron" ? mejoraron : empeoraron;
  const activeTrendPages = Math.max(1, Math.ceil(activeTrend.length / pageSize));
  const trendSafePage = Math.min(trendPage, activeTrendPages);
  const trendItems = activeTrend.slice((trendSafePage - 1) * pageSize, trendSafePage * pageSize);

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
                <TableHead className="hidden w-24 text-right md:table-cell">Adherencia</TableHead>
                <TableHead className="hidden w-28 md:table-cell">Racha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top5.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Trophy className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No hay datos de leaderboard disponibles.</p>
                  </TableCell>
                </TableRow>
              ) : (
                topItems.map((entry) => (
                  <TableRow key={entry.patient_id}>
                    <TableCell>
                      {entry.rank <= 3 ? (
                        <span className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                          entry.rank === 1 ? "bg-warning-soft text-warning" : entry.rank === 2 ? "bg-muted text-muted-foreground" : "bg-warning-soft/50 text-warning/80"
                        }`}>
                          {entry.rank}
                        </span>
                      ) : (
                        <span className="tabular-nums text-muted-foreground">{entry.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {entry.patient_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        {entry.patient_id ? (
                           <Link href={`/program/gestion?view=perfil-360&patient=${entry.patient_id}`} className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer">
                            {entry.patient_name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-medium">{entry.patient_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{entry.xp.toLocaleString()}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{entry.adherence}%</TableCell>
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
            <PagedListFooter page={topSafePage} totalPages={topTotalPages} onPageChange={setTopPage} pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
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
        <Badge variant="outline" className="ml-auto text-[11px]">{total}</Badge>
      </div>
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            {entries.map((e) => (
              <div key={e.patient_id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {e.patient_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {e.patient_id ? (
                    <Link href={`/program/gestion?view=perfil-360&patient=${e.patient_id}`} className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer">
                      {e.patient_name}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium">{e.patient_name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Índice de Salud: <span className="tabular-nums">{e.previous_pct}</span> → <span className="font-medium tabular-nums text-foreground">{e.current_pct}</span> puntos
                  </span>
                </div>
                <Badge className={e.delta_pct >= 0 ? "bg-success-soft text-success-foreground" : "bg-destructive-soft text-destructive"}>
                  {e.delta_pct >= 0 ? "+" : ""}{e.delta_pct.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
          <PagedListFooter page={page} totalPages={totalPages} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        </>
      )}
    </div>
  );
}

// ===== SKELETON / ERROR =====

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 rounded-[10px]" />
              <div className="flex-1" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[300px] w-full rounded" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[200px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-[240px] w-full rounded" />
          </div>
        ))}
      </section>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">Error al cargar el dashboard</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
