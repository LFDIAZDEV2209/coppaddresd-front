"use client";

import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
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
import { useBiometriaCommunity } from "../hooks/use-biometria-community";
import { useBiometriaPatients } from "../hooks/use-biometria-patients";
import { exportBiometriaCsv } from "../services/program-biometria-service";

import { BiometriaUsaSvgMap } from "./biometria-usa-svg-map";
import {
  CHART_TOOLTIP,
} from "../services/program-erp-constants";

// --- Biometría colors (no hardcoded hex — use CSS vars where possible) ---
const GLUCOSA_COLORS: Record<string, string> = {
  Normal: "var(--success)",
  Atención: "#D4AF37",
  Prediabetes: "#E87B2B",
  Elevada: "var(--destructive)",
  "Sin dato": "var(--muted)",
};

// --- Componente principal ---

type GeoFilter =
  | { scope: "city"; cityId: string; label: string }
  | { scope: "state"; stateAbbr: string; label: string }
  | null;

export function ProgramDashboardPage() {
  const { data: bioData, loading: bioLoading, error: bioError, retry: bioRetry } = useBiometriaCommunity();
  const [geoFilter, setGeoFilter] = useState<GeoFilter>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loading = bioLoading;
  const error = bioError;
  const retry = () => { bioRetry(); };

  const handleCitySelect = (cityId: string | null, cityName?: string) => {
    if (!cityId) { setGeoFilter(null); return; }
    setGeoFilter({ scope: "city", cityId, label: cityName ?? cityId.slice(0, 8) });
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };
  const handleStateSelect = (stateAbbr: string | null, stateName?: string) => {
    if (!stateAbbr) { setGeoFilter(null); return; }
    setGeoFilter({ scope: "state", stateAbbr: stateAbbr.toUpperCase(), label: stateName ?? stateAbbr });
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };
  const clearGeoFilter = () => setGeoFilter(null);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Dashboard General"
        description="Vista de salud comunitaria del programa"
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

      {loading && !bioData ? (
        <DashboardSkeleton />
      ) : error && !bioData ? (
        <DashboardError message={error} onRetry={retry} />
      ) : (
        <>
          {/* --- Health-first KPIs (biometría) --- */}
          {bioData && <BiometriaKpis data={bioData} />}

          {/* --- Mapa + Top Cities + Alertas --- */}
          {bioData && bioData.cities.length > 0 && (
            <BiometriaMapRow data={bioData} onCitySelect={handleCitySelect} onStateSelect={handleStateSelect} />
          )}

          {/* --- Distribution charts --- */}
          {bioData && <BiometriaDistributionRow data={bioData} />}

          {/* --- Biometría patient list --- */}
          {bioData && (
            <div ref={listRef}>
              <BiometriaPatientListCard geoFilter={geoFilter} onClearGeoFilter={clearGeoFilter} />
            </div>
          )}
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

/** Map + Top 3 ciudades + Alertas críticas (paginadas 2) */
function BiometriaMapRow({
  data,
  onCitySelect,
  onStateSelect,
}: {
  data: import("../types/erp").BiometriaCommunityDto;
  onCitySelect: (cityId: string | null, cityName?: string) => void;
  onStateSelect: (stateAbbr: string | null, stateName?: string) => void;
}) {
  const top3 = [...data.cities].sort((a, b) => b.count - a.count).slice(0, 3);

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
          <BiometriaUsaSvgMap cities={data.cities} onCitySelect={onCitySelect} onStateSelect={onStateSelect} />
        </div>
      </div>

      {/* Sidebar: Top 5 + Alertas */}
      <div className="flex flex-col gap-4">
        {/* Top 3 ciudades */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Top ciudades"
            description="Por número de pacientes"
            icon={Users}
            variant="secondary"
          />
          <div className="mt-3 flex flex-col gap-2">
            {top3.map((c, i) => (
              <button
                key={`${c.name}-${c.state_abbr}`}
                type="button"
                onClick={() => c.city_id && onCitySelect(c.city_id, `${c.name}${c.state_abbr ? `, ${c.state_abbr}` : ""}`)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
                disabled={!c.city_id}
                title={c.city_id ? `Ver personas en ${c.name}` : undefined}
              >
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
              </button>
            ))}
            {top3.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin datos</p>
            )}
          </div>
        </div>

        {/* Alertas críticas — beautified + paginated 2 */}
        <AlertasCriticasCard alerts={data.alerts} />
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
function BiometriaPatientListCard({
  geoFilter,
  onClearGeoFilter,
}: {
  geoFilter: GeoFilter;
  onClearGeoFilter: () => void;
}) {
  const { data, loading, filters, updateFilters } = useBiometriaPatients({
    pageSize: 5,
  });

  const geoCityId = geoFilter?.scope === "city" ? geoFilter.cityId : null;
  const geoStateAbbr = geoFilter?.scope === "state" ? geoFilter.stateAbbr : null;
  // sync external geo drill-down into the list filters (city/state)
  useEffect(() => {
    updateFilters({ cityId: geoCityId, stateAbbr: geoStateAbbr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoCityId, geoStateAbbr]);

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

      {/* Geo active filter chip */}
      {geoFilter && (
        <div className="flex items-center gap-2 border-b border-border bg-primary-soft/40 px-5 py-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            {geoFilter.scope === "city" ? "Ciudad:" : "Estado:"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-2.5 py-1 text-xs font-semibold text-primary shadow-xs">
            {geoFilter.label}
            <button
              type="button"
              onClick={onClearGeoFilter}
              className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground hover:bg-primary/90"
              aria-label="Quitar filtro geográfico"
              title="Quitar filtro"
            >
              ✕
            </button>
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {data ? `${data.total} persona${data.total !== 1 ? "s" : ""}` : ""}
          </span>
        </div>
      )}

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-border px-5 py-2.5">
        {[
          { key: "all", label: "Todos" },
          { key: "imc_critico", label: "IMC crítico" },
          { key: "grasa_alta", label: "Grasa alta" },
          { key: "glucosa_riesgo", label: "Glucosa riesgo" },
          { key: "mejorando", label: "Mejorando" },
        ].map((chip) => {
          const isActive =
            (chip.key === "all" && !filters.imcCategory && !filters.grasaCategory && !filters.glucosaCategory && !filters.trend && !filters.gender)
            || (chip.key === "imc_critico" && filters.imcCategory === "Obesidad" && !filters.grasaCategory && !filters.glucosaCategory && !filters.trend)
            || (chip.key === "grasa_alta" && filters.grasaCategory === "Alto" && !filters.imcCategory && !filters.glucosaCategory && !filters.trend)
            || (chip.key === "glucosa_riesgo" && filters.glucosaCategory === "Elevada" && !filters.imcCategory && !filters.grasaCategory && !filters.trend)
            || (chip.key === "mejorando" && filters.trend === "mejorando" && !filters.imcCategory && !filters.grasaCategory && !filters.glucosaCategory);

          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === "all") {
                  updateFilters({ imcCategory: "", glucosaCategory: "", grasaCategory: "", trend: "", gender: "" });
                } else if (chip.key === "imc_critico") {
                  updateFilters({ imcCategory: "Obesidad", grasaCategory: "", glucosaCategory: "", trend: "" });
                } else if (chip.key === "grasa_alta") {
                  updateFilters({ grasaCategory: "Alto", imcCategory: "", glucosaCategory: "", trend: "" });
                } else if (chip.key === "glucosa_riesgo") {
                  updateFilters({ glucosaCategory: "Elevada", imcCategory: "", grasaCategory: "", trend: "" });
                } else if (chip.key === "mejorando") {
                  updateFilters({ trend: "mejorando", imcCategory: "", grasaCategory: "", glucosaCategory: "" });
                }
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          );
        })}

        {/* Gender filter */}
        <Select value={filters.gender || "__all__"} onValueChange={(v) => updateFilters({ gender: v === "__all__" ? "" : v ?? "" })}>
          <SelectTrigger className="h-7 w-[100px] text-[11px]">
            <SelectValue placeholder="Género" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Género</SelectItem>
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
                    {p.trend === "mejorando" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <TrendingUp className="size-3.5" /> Mejorando
                      </span>
                    ) : p.trend === "empeorando" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <TrendingDown className="size-3.5" /> Empeorando
                      </span>
                    ) : p.trend === "estable" ? (
                      <span className="text-xs text-muted-foreground">Estable</span>
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

// ===== HELPER FUNCTIONS =====

function buildGrasaGroupedData(
  male: import("../types/erp").BiometriaGrBodyFatBucket[],
  female: import("../types/erp").BiometriaGrBodyFatBucket[],
): { label: string; Hombre: number; Mujer: number }[] {
  const labels = ["Óptimo", "Normal", "Alto", "Obesidad"];
  return labels.map((label) => ({
    label,
    Hombre: male.find((b) => b.label === label)?.count ?? 0,
    Mujer: female.find((b) => b.label === label)?.count ?? 0,
  }));
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function reasonChipClass(reason: string) {
  const r = reason.toLowerCase();
  if (r.includes("imc") || r.includes("obesidad")) return "bg-destructive-soft text-destructive border-destructive/20";
  if (r.includes("glucosa")) return "bg-warning-soft text-warning border-warning/20";
  if (r.includes("icc") || r.includes("cintura")) return "bg-info-soft text-info border-info/20";
  return "bg-muted text-muted-foreground border-border";
}

function AlertasCriticasCard({ alerts }: { alerts: import("../types/erp").BiometriaCommunityDto["alerts"] }) {
  const PAGE_SIZE = 2;
  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
  // local page state inside card — keeps map row stateless
  const [page, setPage] = useState(1);
  const safePage = Math.min(page, totalPages);
  const slice = alerts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-3 rounded-xl bg-destructive-soft px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[13px] font-semibold text-foreground">Alertas críticas</h3>
              <Badge variant="outline" className="shrink-0 border-destructive/20 bg-white text-destructive text-[10px] font-bold">
                {alerts.length}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">Pacientes que requieren atención</p>
          </div>
        </div>
      </div>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 pb-8 pt-4 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-success-soft">
            <TrendingUp className="size-5 text-success" />
          </div>
          <p className="text-sm font-medium">Sin alertas activas</p>
          <p className="text-xs text-muted-foreground">Todos los pacientes dentro de rango saludable.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 px-3 pb-2">
            {slice.map((a) => (
              <Link
                key={a.patient_id}
                href={`/program/gestion?view=perfil-360&patient=${a.patient_id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-destructive/20 hover:bg-destructive-soft/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive ring-1 ring-destructive/10">
                  <AlertTriangle className="size-4" />
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary ring-1 ring-border">
                  {initialsOf(a.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight group-hover:text-foreground">{a.name}</p>
                  <span className={`mt-1 inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${reasonChipClass(a.reason)}`}>
                    {a.reason}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="border-t border-border">
              <PagedListFooter page={safePage} totalPages={totalPages} onPageChange={setPage} pageSize={PAGE_SIZE} />
            </div>
          )}
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
