"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  HeartPulse,
  Hourglass,
  Layers,
  Lightbulb,
  Link2,
  Moon,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Timer,
  TrendingUp,
  UserRound,
  UtensilsCrossed,
  Footprints,
  Users,
  Flame,
  Target,
  XCircle,
  FileWarning,
  Award,
  ChevronRight,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { SectionHeader } from "@/components/layout/section-header";
import { usePatientDetail } from "../../hooks/use-health-tests";
import {
  patientRisk,
  typificationLabel,
  typifyPatient,
  averageScore,
} from "../../lib/domain";
import {
  formatDate,
  formatShortDate,
  fullName,
  initials,
} from "../../lib/format";
import { categoryAccent, riskHex, scoreBarColor } from "../shared/colors";
import { RiskBadge, SeverityBadge, TestStateBadge } from "../shared/badges";
import { ScoreBar, ProgressRing } from "../shared/progress";
import { ChartCard, StatSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { healthTestsApi } from "../../services/health-tests-service";
import type {
  Battery,
  HealthTest,
  PatientEvaluation,
  PatientProfile,
} from "../../types";

const EVALUATION_STATES: Record<
  PatientEvaluation["status"],
  { labelKey: string; state: "completado" | "en-progreso" | "pendiente" }
> = {
  completed: { labelKey: "Completado", state: "completado" },
  started: { labelKey: "En progreso", state: "en-progreso" },
  abandoned: { labelKey: "Abandonado", state: "pendiente" },
};

// Icono por categoría — coherente con el catálogo del backend
function categoryIcon(category: string | null) {
  const map: Record<string, typeof Activity> = {
    "historia-clinica": Activity,
    nutricion: UtensilsCrossed,
    movimiento: Footprints,
    sueno: Moon,
    adherencia: HeartPulse,
    "salud-mental": Users,
    cardiometabolico: Flame,
  };
  return map[category ?? ""] ?? Activity;
}

function statusIcon(status: PatientEvaluation["status"]) {
  if (status === "completed") return CheckCircle2;
  if (status === "started") return Timer;
  return XCircle;
}

/**
 * Hub de tests de salud del paciente: identidad, resumen, indicadores,
 * historial de evaluaciones filtrable y navegación al detalle individual.
 * Incluye ahora el análisis integral ANTARES · IA (espejo de TestsPage
 * móvil pero alimentado con resultados reales del paciente).
 */
export function PatientProfilePage({ patientId }: { patientId: string }) {
  const t = useT();
  const { data, loading, error, notFound, reload } =
    usePatientDetail(patientId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [batteryFilter, setBatteryFilter] = useState("todos");
  const [testFilter, setTestFilter] = useState("todos");
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [catalogTests, setCatalogTests] = useState<HealthTest[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([healthTestsApi.listBatteries(), healthTestsApi.listTests()])
      .then(([bats, tests]) => {
        if (!cancelled) {
          setBatteries(bats);
          setCatalogTests(tests);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const risk = useMemo(() => {
    if (!data) return null;
    return patientRisk(data.patient.results);
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const ev of data.evaluations) {
      if (ev.testCategory) set.add(ev.testCategory);
    }
    return [...set].sort();
  }, [data]);

  // Mapa batería -> códigos de test para filtrado por batería
  const batteryTestCodes = useMemo(() => {
    if (batteries.length === 0 || catalogTests.length === 0)
      return new Map<string, Set<string>>();
    const testById = new Map(
      catalogTests.map((tc) => [tc.id, tc.code] as const),
    );
    const map = new Map<string, Set<string>>();
    for (const bat of batteries) {
      const codes = new Set<string>();
      for (const tid of bat.testIds) {
        const c = testById.get(tid);
        if (c) codes.add(c);
      }
      map.set(bat.id, codes);
    }
    return map;
  }, [batteries, catalogTests]);

  const testOptions = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const ev of data.evaluations) {
      if (ev.testCode && !map.has(ev.testCode))
        map.set(ev.testCode, ev.testName);
    }
    for (const ct of catalogTests) {
      if (!map.has(ct.code)) map.set(ct.code, ct.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data, catalogTests]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return [...data.evaluations]
      .sort((a, b) =>
        (b.completedAt ?? b.startedAt).localeCompare(
          a.completedAt ?? a.startedAt,
        ),
      )
      .filter((e) => {
        if (statusFilter !== "todos" && e.status !== statusFilter) return false;
        if (categoryFilter !== "todos" && e.testCategory !== categoryFilter)
          return false;
        if (batteryFilter !== "todos") {
          const codes = batteryTestCodes.get(batteryFilter);
          if (!codes || !codes.has(e.testCode)) return false;
        }
        if (testFilter !== "todos" && e.testCode !== testFilter) return false;
        if (
          q &&
          !e.testName.toLowerCase().includes(q) &&
          !e.testCode.toLowerCase().includes(q)
        )
          return false;
        return true;
      });
  }, [
    data,
    search,
    statusFilter,
    categoryFilter,
    batteryFilter,
    testFilter,
    batteryTestCodes,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "todos" ||
    categoryFilter !== "todos" ||
    batteryFilter !== "todos" ||
    testFilter !== "todos";

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleEmptyState
          title={t("No encontramos este paciente")}
          description={t(
            "El paciente no existe o no está dentro de tu alcance de datos.",
          )}
        />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleEmptyState
          title={t("No encontramos este paciente")}
          description={t(
            "El paciente no existe o no está dentro de tu alcance de datos.",
          )}
        />
      </div>
    );
  }

  const { patient, alerts, evaluations } = data;
  const typification = typifyPatient(patient);
  const completed = new Set(
    evaluations.filter((e) => e.status === "completed").map((e) => e.versionId),
  ).size;
  const pending = evaluations.filter((e) => e.status === "started").length;
  const patientAlerts = alerts.filter((a) => a.patientId === patient.id);
  const totalTests = patient.results.length;

  const radarData = patient.results
    .filter((r) => r.score !== null)
    .map((r) => ({
      name:
        testNameFor(patient.results, r.testId, evaluations) ??
        r.testCode ??
        r.testId,
      score: r.scorePercentage ?? r.score ?? 0,
    }));

  const evolutionData = buildEvolution(patient);
  const iaProfile = buildIaProfile(patient, evaluations, patientAlerts);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={fullName(patient.firstName, patient.lastName)}
        description={t("Perfil individual de evaluación de salud")}
        icon={UserRound}
        actions={
          <Link
            href="/health-tests/pacientes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            <ArrowLeft data-icon="inline-start" className="size-3.5" />
            {t("Tabla maestra")}
          </Link>
        }
      />

      {/* Navegación rápida — evita perderse entre secciones */}
      <nav
        aria-label={t("Navegación de secciones")}
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2 shadow-sm"
      >
        {[
          { id: "ficha", label: "Ficha", icon: UserRound },
          { id: "resumen", label: "Resumen", icon: CheckCircle2 },
          { id: "analisis-ia", label: "Análisis IA", icon: Sparkles },
          { id: "visual", label: "Visual", icon: Activity },
          { id: "historial", label: "Historial", icon: Layers },
          { id: "bateria", label: "Batería", icon: Building2 },
          { id: "alertas", label: "Alertas", icon: BellRing },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(item.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Icon className="size-3.5" />
              {t(item.label)}
            </a>
          );
        })}
      </nav>

      {/* Ficha del paciente — header azul */}
      <section
        id="ficha"
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-6"
      >
        <SectionHeader
          title={t("Ficha del paciente")}
          description={t("Identidad, tipificación de riesgo y fechas clave")}
          icon={UserRound}
          variant="primary"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              background:
                "radial-gradient(600px 200px at 15% 0%, var(--primary) 0%, transparent 60%), radial-gradient(500px 220px at 95% 100%, var(--primary) 0%, transparent 60%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary ring-1 ring-primary/15">
              {initials(patient.firstName, patient.lastName)}
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {fullName(patient.firstName, patient.lastName)}
                </h2>
                <RiskBadge
                  risk={risk ?? "sin-evaluar"}
                  label={typificationLabel(typification)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span>
                  {patient.documentNumber}
                  {patient.clinic ? ` · ${patient.clinic}` : ""}
                </span>
                <span>
                  {patient.gender} ·{" "}
                  {patient.age > 0
                    ? `${patient.age} ${t("años")}`
                    : t("edad no disponible")}
                </span>
                {patient.insurance ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    {patient.insurance}
                  </span>
                ) : null}
                {patient.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {patient.phone}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Stethoscope className="size-3" />
                  {patient.professionalName || t("Sin asignar")}
                </span>
              </div>
            </div>
          </div>
          <div className="relative flex shrink-0 flex-col gap-1 rounded-xl bg-muted px-4 py-3 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t("Asignado")} {formatDate(patient.assignedAt)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5" />
              {t("Última evaluación")} {formatDate(lastCompleted(evaluations))}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Award className="size-3.5 text-primary" />
              AHS {iaProfile.ahs}/100 · {t(iaProfile.summary)}
            </span>
          </div>
        </div>
      </section>

      <section
        id="resumen"
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-6"
      >
        <SectionHeader
          title={t("Resumen de batería")}
          description={t("Avance, pendientes y alertas en una vista")}
          icon={CheckCircle2}
          variant="primary"
        />
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("Tests completados")}
              value={`${completed}/${totalTests}`}
              icon={CheckCircle2}
              variant="success"
              context={`${totalTests === 0 ? 0 : Math.round((completed / totalTests) * 100)}% ${t("de la batería")}`}
            />
            <StatCard
              label={t("Pendientes")}
              value={String(Math.max(0, totalTests - completed - pending))}
              icon={Hourglass}
              variant="warning"
              context={t("Sin aplicar")}
            />
            <StatCard
              label={t("En progreso")}
              value={String(pending)}
              icon={Timer}
              variant="info"
              context={t("Guardados a medias")}
            />
            <StatCard
              label={t("Alertas del paciente")}
              value={String(patientAlerts.length)}
              icon={BellRing}
              variant={patientAlerts.length > 0 ? "destructive" : "primary"}
              context={t("Relacionadas con sus resultados")}
            />
          </div>
        </div>
      </section>

      {/* ── Análisis integral ANTARES · IA (espejo del HealthResult móvil, con datos reales) ── */}
      <div id="analisis-ia" className="scroll-mt-6">
        <PatientIaSection
          profile={iaProfile}
          patient={patient}
          evaluations={evaluations}
        />
      </div>

      <section
        id="visual"
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-6"
      >
        <SectionHeader
          title={t("Visualización clínica")}
          description={t("Radar de indicadores y evolución temporal")}
          icon={Activity}
          variant="primary"
        />
        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
          <ChartCard
            title={t("Perfil de indicadores")}
            description={t("Scores de los tests completados (0-100)")}
            icon={Activity}
          >
            {radarData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Activity className="size-6" />
                </span>
                <p className="max-w-52 text-xs text-muted-foreground">
                  {t(
                    "Sin tests completados todavía — el radar se dibuja al completar evaluaciones.",
                  )}
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="68%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{ fontSize: 8.5, fill: "var(--muted-foreground)" }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      dataKey="score"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.22}
                      strokeWidth={2}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} pts`, ""]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard
            title={t("Evolución de scores")}
            description={t("Evaluaciones repetidas en el tiempo")}
            icon={HeartPulse}
          >
            {evolutionData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <TrendingUp className="size-6" />
                </span>
                <p className="max-w-52 text-xs text-muted-foreground">
                  {t(
                    "Sin evaluaciones repetidas para comparar — al repetir un test verás la curva.",
                  )}
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={evolutionData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [String(value), String(name)]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--chart-2)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      </section>

      {/* Historial de evaluaciones (hub) — ahora con filtros por batería y por test */}
      <section
        id="historial"
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-6"
      >
        <SectionHeader
          title={t("Historial de evaluaciones")}
          description={t(
            "Todos los tests del paciente, sus resultados e intentos — filtra por batería, test, categoría y estado",
          )}
          icon={Layers}
          variant="primary"
        />
        <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4">
          {/* Fila 1: búsqueda + estado + categoría */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Search
                data-icon="inline-start"
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Buscar por nombre o código del test…")}
                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t("Filtrar por estado")}
              className="h-9 rounded-lg border border-border bg-background px-3 text-[12.5px] font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="todos">{t("Todos los estados")}</option>
              <option value="completed">{t("Completado")}</option>
              <option value="started">{t("En progreso")}</option>
              <option value="abandoned">{t("Abandonado")}</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={t("Filtrar por categoría")}
              className="h-9 rounded-lg border border-border bg-background px-3 text-[12.5px] font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="todos">{t("Todas las categorías")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {/* Fila 2: batería + test + contador + limpiar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="size-3.5" />
                {t("Batería")}
                <select
                  value={batteryFilter}
                  onChange={(e) => setBatteryFilter(e.target.value)}
                  className="ml-1 h-8 rounded-lg border border-border bg-background px-2.5 text-[12.5px] font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary"
                >
                  <option value="todos">{t("Todas")}</option>
                  {batteries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <FileWarning className="size-3.5" />
                {t("Test")}
                <select
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  className="ml-1 h-8 max-w-[220px] truncate rounded-lg border border-border bg-background px-2.5 text-[12.5px] font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary"
                >
                  <option value="todos">{t("Todos")}</option>
                  {testOptions.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name} · {code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="rounded-full bg-primary px-2.5 py-1 font-bold text-primary-foreground">
                {filtered.length} / {evaluations.length}
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("todos");
                    setCategoryFilter("todos");
                    setBatteryFilter("todos");
                    setTestFilter("todos");
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  <XCircle className="size-3" />
                  {t("Limpiar")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin evaluaciones que coincidan")}
            description={
              evaluations.length === 0
                ? t("Este paciente no tiene tests aplicados todavía.")
                : t("Prueba con otros filtros de búsqueda.")
            }
            onClear={
              hasActiveFilters
                ? () => {
                    setSearch("");
                    setStatusFilter("todos");
                    setCategoryFilter("todos");
                    setBatteryFilter("todos");
                    setTestFilter("todos");
                  }
                : undefined
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {filtered.map((ev) => {
              const state = EVALUATION_STATES[ev.status];
              const accent = categoryAccent(ev.testCategory);
              const IconCat = categoryIcon(ev.testCategory);
              const IconSt = statusIcon(ev.status);
              return (
                <li key={ev.id}>
                  <Link
                    href={`/health-tests/pacientes/${patientId}/evaluaciones/${ev.id}`}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/40 sm:px-5"
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] ring-1 ring-inset"
                      style={{
                        backgroundColor: `${accent}14`,
                        color: accent,
                        borderColor: `${accent}26`,
                      }}
                    >
                      <IconCat className="size-[18px]" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-foreground group-hover:text-primary">
                        {ev.testName}
                        {ev.status === "completed" ? (
                          <Star className="size-3 shrink-0 text-amber-500" />
                        ) : null}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                          {ev.testCode}
                        </span>
                        {ev.testCategory ? (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: accent }}
                            />
                            {ev.testCategory}
                          </span>
                        ) : null}
                        {ev.attempt > 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-1.5 py-0.5 text-[10px] font-bold text-info">
                            <Timer className="size-2.5" />
                            {t("Intento")} {ev.attempt}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {ev.score !== null ? (
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden w-28 flex-col items-end gap-0.5 sm:flex">
                          <span className="flex items-center gap-1 text-[12.5px] font-bold text-foreground">
                            <TrendingUp className="size-3 text-muted-foreground" />
                            {ev.scorePercentage !== null
                              ? `${Math.round(ev.scorePercentage)}%`
                              : `${ev.score} pts`}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground">
                            {formatShortDate(ev.completedAt ?? ev.startedAt)}
                          </span>
                        </div>
                        <RiskBadge
                          risk={riskFromEvaluation(ev)}
                          className="px-2 py-0.5 text-[10.5px] shadow-sm"
                        />
                        <ChevronRight className="hidden size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground sm:block" />
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                          <IconSt className="size-3" />
                          {formatShortDate(ev.startedAt)}
                        </span>
                        <TestStateBadge
                          state={state.state}
                          label={t(state.labelKey)}
                        />
                        <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Tests de la batería — ahora con iconografía por categoría y estado visual */}
      <section
        id="bateria"
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-6"
      >
        <SectionHeader
          title={t("Tests de la batería")}
          description={t("Estado, score e interpretación de cada evaluación")}
          icon={Layers}
          variant="primary"
        />
        <div className="grid grid-cols-1 gap-px bg-border/60 md:grid-cols-2 xl:grid-cols-3">
          {patient.results.map((result) => {
            const matchedEval = evaluations.find(
              (e) => e.versionId === result.testId,
            );
            const cat = matchedEval?.testCategory ?? "";
            const accent = categoryAccent(cat);
            const IconCat = categoryIcon(cat);
            const showScore = result.score !== null;
            return (
              <article
                key={result.testId}
                className="group flex flex-col gap-3 bg-card p-4 transition-colors duration-200 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base ring-1 ring-inset transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: `${accent}14`,
                        color: accent,
                        borderColor: `${accent}26`,
                      }}
                    >
                      <IconCat className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <h4 className="truncate text-[13px] font-bold text-foreground">
                        {testNameFor(
                          patient.results,
                          result.testId,
                          evaluations,
                        ) ??
                          result.testCode ??
                          result.testId}
                      </h4>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono text-[10px]">
                          {result.testCode}
                        </span>
                        {cat ? (
                          <>
                            · <span style={{ color: accent }}>{cat}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  <TestStateBadge
                    state={result.state}
                    label={t(result.state)}
                  />
                </div>

                {showScore ? (
                  <div className="flex flex-col gap-2.5">
                    <ScoreBar
                      value={result.score ?? 0}
                      color={scoreBarColor(result.risk)}
                      label={t("Score")}
                    />
                    <div className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {result.risk === "bajo" ? (
                          <CheckCircle2 className="size-3 text-success" />
                        ) : result.risk === "critico" ||
                          result.risk === "alto" ? (
                          <ShieldAlert className="size-3 text-destructive" />
                        ) : (
                          <FileWarning className="size-3 text-warning" />
                        )}
                        {result.interpretation || t(result.risk)}
                      </span>
                      <RiskBadge
                        risk={result.risk}
                        label={t(result.risk)}
                        className="px-2 py-0.5 text-[10.5px]"
                      />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarClock className="size-3" />
                      {t("Evaluado")} {formatDate(result.completedAt)}
                    </span>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <Clock className="size-3" />
                    {result.state === "en-progreso"
                      ? `${t("Guardado a medias")} · ${
                          typeof result.details.progreso === "string"
                            ? result.details.progreso
                            : ""
                        }`
                      : t("Pendiente de aplicación")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {patient.results.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">
            {t("Este paciente no tiene tests aplicados todavía.")}
          </p>
        ) : null}
      </section>

      {/* Alertas del paciente */}
      <section
        id="alertas"
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-6"
      >
        <SectionHeader
          title={t("Alertas del paciente")}
          description={t("Resultados que requieren atención clínica")}
          icon={ShieldAlert}
          variant="primary"
        />
        {patientAlerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">
              {t("Sin alertas para este paciente — buen indicador")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {patientAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
                    style={{
                      backgroundColor: `${riskHex(severityToRisk(alert.severity))}14`,
                      borderColor: `${riskHex(severityToRisk(alert.severity))}26`,
                    }}
                  >
                    <ShieldAlert
                      className="size-4"
                      style={{ color: riskHex(severityToRisk(alert.severity)) }}
                    />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[12.5px] font-semibold text-foreground">
                      {alert.message}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {alert.indicatorName} · {formatDate(alert.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-foreground/80">
                      <Lightbulb className="size-3 text-warning" />
                      {t("Acción recomendada")}:{" "}
                      {alert.recommendedAction || t("Seguimiento clínico")}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "var(--muted)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t(alert.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ────────────────────── Análisis integral ANTARES · IA ────────────────────── */

function PatientIaSection({
  profile,
  patient,
  evaluations,
}: {
  profile: ReturnType<typeof buildIaProfile>;
  patient: PatientProfile;
  evaluations: PatientEvaluation[];
}) {
  const t = useT();
  const completedCount = evaluations.filter(
    (e) => e.status === "completed",
  ).length;
  const hasData = completedCount > 0;

  if (!hasData) {
    return (
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <SectionHeader
          title={t("Análisis integral ANTARES · IA")}
          description={t("Se genera automáticamente al completar evaluaciones")}
          icon={Sparkles}
          variant="primary"
        />
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Sparkles className="size-7" />
          </span>
          <h4 className="text-sm font-bold text-foreground">
            {t("Aún no hay suficiente información para el análisis IA")}
          </h4>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            {t(
              "Completa al menos 3 tests de la batería para desbloquear el perfil integral: radar de 7 dimensiones, DOFA, correlaciones y plan priorizado — igual que en la app móvil ANTARES.",
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Hero AHS — cabecera azul + síntesis */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <SectionHeader
          title={t("Análisis integral ANTARES · IA")}
          description={t(
            "Síntesis IA — AHS, radar, DOFA, correlaciones y plan priorizado",
          )}
          icon={Sparkles}
          variant="primary"
        />
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--sidebar)] via-[color-mix(in_srgb,var(--sidebar)_92%,var(--primary))] to-[color-mix(in_srgb,var(--sidebar)_88%,var(--primary))] p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Anillo AHS con texto blanco para contraste sobre navy */}
              {(() => {
                const size = 92;
                const stroke = 8;
                const r = (size - stroke) / 2;
                const c = 2 * Math.PI * r;
                const pct = Math.max(0, Math.min(100, profile.ahs));
                const off = c - (pct / 100) * c;
                const col =
                  profile.ahs >= 70
                    ? "#10B981"
                    : profile.ahs >= 40
                      ? "#F59E0B"
                      : "#EF4444";
                return (
                  <div
                    className="relative flex shrink-0 items-center justify-center"
                    style={{ width: size, height: size }}
                    aria-label={`${pct}%`}
                  >
                    <svg width={size} height={size} className="-rotate-90">
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth={stroke}
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={col}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={off}
                        style={{
                          transition: "stroke-dashoffset 0.6s ease",
                        }}
                      />
                    </svg>
                    <span className="absolute text-[15px] font-extrabold tracking-tight text-white">
                      {pct}%
                    </span>
                  </div>
                );
              })()}
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70">
                  <Sparkles className="size-3" />
                  {t("Perfil ANTARES · IA")}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                    AHS {profile.ahs}/100 · {t(profile.summary)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--sidebar)]">
                    {t(profile.condition)}
                  </span>
                </div>
                <p className="max-w-md text-[12px] leading-relaxed text-white/80">
                  {t(
                    "Análisis generado con los {n} tests completados de {name}.",
                    {
                      n: String(completedCount),
                      name: fullName(patient.firstName, patient.lastName),
                    },
                  )}
                </p>
              </div>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                {t("Paciente")}
              </span>
              <span className="text-sm font-bold text-white">
                {fullName(patient.firstName, patient.lastName)}
              </span>
              <span className="text-[11px] text-white/70">
                {patient.age > 0 ? `${patient.age} ${t("años")} · ` : ""}
                {patient.gender}
              </span>
            </div>
          </div>
          {/* Chips — más contraste */}
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {profile.chips.map((c) => (
              <span
                key={c.text}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.18] px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur border border-white/20"
              >
                <span className="text-[11px]">{c.ico}</span>
                {t(c.text)}
              </span>
            ))}
          </div>
        </div>
        {/* Banner condición — más contraste */}
        <div className="flex items-start gap-3 border-y border-border bg-amber-50/40 px-5 py-4 dark:bg-card">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base ring-1"
            style={{
              backgroundColor: `${profile.bannerColor}18`,
              color: profile.bannerColor,
              borderColor: `${profile.bannerColor}30`,
            }}
          >
            {profile.bannerIcon}
          </span>
          <div>
            <div className="text-[12.5px] font-bold text-foreground">
              {t(profile.banner.title)}
            </div>
            <div className="text-[12px] leading-relaxed text-muted-foreground">
              {t(profile.banner.text)}
            </div>
          </div>
        </div>
        {/* Métricas */}
        <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-3">
          {profile.indicators.map((m) => (
            <div
              key={m.label}
              className="flex flex-col gap-1 bg-card px-4 py-4"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="text-sm">{m.ico}</span>
                {t(m.label)}
              </span>
              <span className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground">
                  {m.value}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t(m.unit)}
                </span>
                <span
                  className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor:
                      m.tone === "ok"
                        ? "var(--success-soft)"
                        : m.tone === "warn"
                          ? "var(--warning-soft)"
                          : "var(--destructive-soft)",
                    color:
                      m.tone === "ok"
                        ? "var(--success-foreground)"
                        : m.tone === "warn"
                          ? "var(--warning-foreground)"
                          : "var(--destructive-foreground)",
                  }}
                >
                  {t(m.qualifier)}
                </span>
              </span>
            </div>
          ))}
        </div>
        {/* Narrativa IA */}
        <div className="flex gap-3 bg-muted/20 px-5 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t(profile.ai.label)}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">
              {t(profile.ai.message)}
            </p>
          </div>
        </div>
        <p className="border-t border-border bg-muted/10 px-5 py-2 text-center text-[10.5px] text-muted-foreground">
          {t(profile.footnote)}
        </p>
      </div>

      {/* Radar + dims — distribución equilibrada, sin estirar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-start">
        <div className="xl:col-span-5 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm h-fit">
          <SectionHeader
            title={t("Radar 7 dimensiones")}
            description={t("Perfil 0-100 por dominio · valores y brechas")}
            icon={Activity}
            variant="primary"
          />
          <div className="flex flex-col items-center gap-3 p-6">
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-primary/10 blur-xl" />
              <RadarMini dims={profile.dims} size={210} />
            </div>
            <p className="max-w-[260px] text-center text-[11px] leading-relaxed text-muted-foreground">
              {t(
                "Cada vértice es un dominio clínico. El polígono relleno marca tu perfil actual.",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {profile.dims.slice(0, 3).map((d) => (
                <span
                  key={d.label}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${d.color}14`,
                    color: d.color,
                    border: `1px solid ${d.color}20`,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  {t(d.label)} {d.value}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="xl:col-span-7 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm h-fit">
          <SectionHeader
            title={t("Detalle por dimensión")}
            description={t("Valor, barra y nota clínica por dominio")}
            icon={Target}
            variant="primary"
          />
          <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
            {profile.dims.map((d) => (
              <div
                key={d.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[15px] ring-1"
                  style={{
                    backgroundColor: `${d.color}16`,
                    color: d.color,
                    borderColor: `${d.color}20`,
                  }}
                >
                  {d.ico}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-bold text-foreground">
                      {t(d.label)}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-extrabold"
                      style={{
                        backgroundColor: `${d.color}14`,
                        color: d.color,
                      }}
                    >
                      {d.value}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${d.value}%`, backgroundColor: d.color }}
                    />
                  </div>
                  <span className="mt-1 block truncate text-[11px] font-medium text-slate-600">
                    {t(d.note)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DOFA — header azul */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <SectionHeader
          title={t("Análisis DOFA")}
          description={t("Fortalezas, Debilidades, Oportunidades y Amenazas")}
          icon={Target}
          variant="primary"
        />
        <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2">
          <DofaMiniCard
            tone="ok"
            title={t("Fortalezas")}
            icon="✅"
            items={profile.dofa.f}
          />
          <DofaMiniCard
            tone="bad"
            title={t("Debilidades")}
            icon="⚠️"
            items={profile.dofa.d}
          />
          <DofaMiniCard
            tone="op"
            title={t("Oportunidades")}
            icon="🌟"
            items={profile.dofa.o}
          />
          <DofaMiniCard
            tone="th"
            title={t("Amenazas")}
            icon="🚨"
            items={profile.dofa.a}
          />
        </div>
      </div>

      {/* Correlaciones — header azul */}
      {profile.correlations.length > 0 ? (
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <SectionHeader
            title={t("Correlaciones detectadas")}
            description={t("Patrones entre dominios que requieren atención")}
            icon={Link2}
            variant="primary"
          />
          <div className="flex flex-col gap-3 p-4">
            {profile.correlations.map((c) => (
              <div
                key={c.title}
                className="flex gap-3 rounded-xl border-l-[3px] bg-card px-4 py-3 shadow-sm ring-1 ring-border/30"
                style={{ borderLeftColor: c.color }}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${c.color}14`, color: c.color }}
                >
                  <Link2 className="size-3.5" />
                </span>
                <div>
                  <div className="text-[12.5px] font-bold text-foreground">
                    {t(c.title)}
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {t(c.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Plan priorizado — header azul */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <SectionHeader
          title={t("Plan de intervención priorizado")}
          description={t("Acciones por especialidad y semana objetivo")}
          icon={Award}
          variant="primary"
        />
        <div className="flex flex-col divide-y divide-border/60">
          {profile.plan.map((item, i) => (
            <div key={item.title} className="flex items-center gap-3 px-4 py-3">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: item.color }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-foreground">
                  {t(item.title)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                    style={{
                      backgroundColor: `${item.color}14`,
                      color: item.color,
                    }}
                  >
                    {t(item.specialty)}
                  </span>
                  {item.prof ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Stethoscope className="size-3" />
                      {item.prof}
                    </span>
                  ) : null}
                  {item.week ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarClock className="size-3" />
                      {t(item.week)}
                    </span>
                  ) : null}
                </div>
              </div>
              <Star className="size-3.5 shrink-0 text-amber-400" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DofaMiniCard({
  tone,
  title,
  icon,
  items,
}: {
  tone: "ok" | "bad" | "op" | "th";
  title: string;
  icon: string;
  items: string[];
}) {
  const bg =
    tone === "ok"
      ? "bg-success-soft"
      : tone === "bad"
        ? "bg-warning-soft"
        : tone === "op"
          ? "bg-info-soft"
          : "bg-destructive-soft";
  return (
    <div className="bg-card p-4">
      <div
        className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${bg}`}
      >
        <span>{icon}</span>
        {title}
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((x) => (
          <li
            key={x}
            className="flex gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground"
          >
            <span className="mt-1 size-1 shrink-0 rounded-full bg-foreground/30" />
            {x}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-[11px] italic text-muted-foreground">—</li>
        ) : null}
      </ul>
    </div>
  );
}

function RadarMini({
  dims,
  size = 170,
}: {
  dims: {
    ico: string;
    label: string;
    value: number;
    color: string;
    note: string;
  }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const n = dims.length;
  const pt = (i: number, f: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * f];
  };
  const toPoints = (f: number) =>
    Array.from({ length: n }, (_, i) => {
      const [x, y] = pt(i, f);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map(toPoints);
  const clamp = (v: number) => Math.min(1, Math.max(0.06, v / 100));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="radar"
    >
      {rings.map((p, i) => (
        <polygon
          key={i}
          points={p}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {dims.map((_, i) => {
        const [x, y] = pt(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={dims.map((_, i) => pt(i, 0.02).join(",")).join(" ")}
        fill="none"
      />
      <polygon
        points={dims.map((d, i) => pt(i, clamp(d.value)).join(",")).join(" ")}
        fill="var(--primary)"
        fillOpacity={0.18}
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dims.map((d, i) => {
        const [x, y] = pt(i, clamp(d.value));
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3.2}
            fill={d.color}
            stroke="#fff"
            strokeWidth={1.2}
          />
        );
      })}
    </svg>
  );
}

/** Nombre del test desde las evaluaciones (el DTO de evaluación trae testName). */
function testNameFor(
  results: { testId: string }[],
  versionId: string,
  evaluations: PatientEvaluation[],
): string | null {
  const ev = evaluations.find((e) => e.versionId === versionId);
  return ev?.testName ?? null;
}

function riskFromEvaluation(ev: PatientEvaluation) {
  if (ev.score === null) return "sin-evaluar" as const;
  if (ev.score >= 70) return "alto" as const;
  if (ev.score >= 40) return "moderado" as const;
  return "bajo" as const;
}

function severityToRisk(
  severity: string,
): "critico" | "alto" | "moderado" | "bajo" {
  if (severity === "critica") return "critico";
  if (severity === "alta") return "alto";
  if (severity === "media") return "moderado";
  return "bajo";
}

function lastCompleted(evaluations: PatientEvaluation[]): string | null {
  const dates = evaluations
    .map((e) => e.completedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function buildEvolution(patient: {
  results: {
    history: { completedAt: string; score: number }[];
    score: number | null;
  }[];
}) {
  const withHistory = patient.results.filter(
    (r) => r.history.length > 1 && r.score !== null,
  );
  if (withHistory.length === 0) return [];
  const test = withHistory[0];
  return test.history.map((h, i) => ({
    label: `${formatShortDate(h.completedAt)}${i === test.history.length - 1 ? " · ahora" : ""}`,
    valor: h.score,
  }));
}

// ───────── IA profile builder (espejo del HEALTH_PROFILE móvil) ─────────

function buildIaProfile(
  patient: PatientProfile,
  evaluations: PatientEvaluation[],
  alerts: { severity: string }[],
) {
  const completedEvals = evaluations.filter(
    (e) => e.status === "completed" && e.score !== null,
  );
  const avg = completedEvals.length > 0 ? averageScore(patient.results) : 0;
  const ahs = completedEvals.length > 0 ? Math.round(avg * 0.85 + 15) : 0; // leve boost como en móvil
  const clampedAhs = Math.max(0, Math.min(100, ahs));

  const worstRisk = patientRisk(patient.results);
  const summary =
    clampedAhs >= 70
      ? "Perfil excelente"
      : clampedAhs >= 55
        ? "Perfil adecuado"
        : clampedAhs >= 35
          ? "Perfil en construcción"
          : "Perfil prioritario";

  const condition =
    worstRisk === "critico" || worstRisk === "alto"
      ? "Riesgo elevado"
      : worstRisk === "moderado"
        ? "Riesgo moderado"
        : completedEvals.length === 0
          ? "Sin evaluación completa"
          : "Riesgo bajo";

  const chips = [
    {
      ico: "📊",
      text: `${completedEvals.length}/${patient.results.length} tests completados`,
    },
    {
      ico: "⚠️",
      text: `${alerts.length} ${alerts.length === 1 ? "alerta" : "alertas"}`,
    },
    {
      ico:
        worstRisk === "bajo" ? "✅" : worstRisk === "sin-evaluar" ? "📝" : "🚨",
      text: `Riesgo ${worstRisk}`,
    },
    {
      ico: "👤",
      text: `${patient.gender} · ${patient.age > 0 ? `${patient.age} años` : "edad no disp."}`,
    },
    ...(patient.clinic ? [{ ico: "🏥", text: patient.clinic }] : []),
    ...(patient.professionalName
      ? [{ ico: "🩺", text: patient.professionalName }]
      : []),
  ].slice(0, 6);

  const bannerColor =
    worstRisk === "alto" || worstRisk === "critico"
      ? "#EF4444"
      : worstRisk === "moderado"
        ? "#F59E0B"
        : "#10B981";
  const bannerIcon =
    worstRisk === "alto" || worstRisk === "critico"
      ? "🚨"
      : worstRisk === "moderado"
        ? "⚠️"
        : "✅";
  const banner =
    worstRisk === "alto" || worstRisk === "critico"
      ? {
          title: "Atención prioritaria",
          text: "Los resultados indican riesgo elevado. Prioriza el plan de la semana 1 y revisa las alertas con tu profesional.",
        }
      : worstRisk === "moderado"
        ? {
            title: "Ventana de mejora activa",
            text: "Tienes indicadores moderados con buen margen de mejora. El programa ADRESD puede moverlos desde la semana 1.",
          }
        : {
            title: "Perfil estable",
            text: "Tus indicadores se mantienen en rango favorable. Mantén la adherencia y completa la batería para consolidar.",
          };

  // Métricas (top 3 resultados con score)
  const topResults = [...patient.results]
    .filter((r) => r.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 3);
  const indicators = topResults.length
    ? topResults.map((r) => {
        const ev = evaluations.find((e) => e.versionId === r.testId);
        return {
          ico: categoryEmoji(ev?.testCategory ?? ""),
          value:
            r.scorePercentage !== null && r.scorePercentage !== undefined
              ? `${Math.round(r.scorePercentage)}%`
              : `${r.score}`,
          unit: r.scorePercentage !== null ? "score" : "pts",
          qualifier: r.interpretation || r.risk,
          label: ev?.testName ?? r.testCode ?? r.testId,
          tone: (r.risk === "bajo"
            ? "ok"
            : r.risk === "moderado"
              ? "warn"
              : "risk") as "ok" | "warn" | "risk",
        };
      })
    : [
        {
          ico: "📝",
          value: "—",
          unit: "pendiente",
          qualifier: "Sin datos",
          label: "Completa evaluaciones",
          tone: "warn" as const,
        },
      ];

  // Dims 7 — mapeo categoría -> dim
  const dimDefs: {
    label: string;
    ico: string;
    color: string;
    cats: string[];
  }[] = [
    {
      label: "Metabolismo",
      ico: "🩺",
      color: "#E87B2B",
      cats: ["historia-clinica", "cardiometabolico"],
    },
    { label: "Nutrición", ico: "🥗", color: "#1D9E75", cats: ["nutricion"] },
    { label: "Movimiento", ico: "🏃", color: "#1B6CA8", cats: ["movimiento"] },
    { label: "Sueño", ico: "🌙", color: "#7C3AED", cats: ["sueno"] },
    { label: "Adherencia", ico: "🤝", color: "#5581A2", cats: ["adherencia"] },
    {
      label: "Entorno relacional",
      ico: "⚡",
      color: "#D9534F",
      cats: ["salud-mental"],
    },
    {
      label: "Riesgo cardiovascular",
      ico: "❤️",
      color: "#142855",
      cats: ["cardiometabolico"],
    },
  ];
  const dims = dimDefs.map((def, idx) => {
    // para riesgo CV usamos el peor score de cardiometabólico invertido (bajo riesgo = valor alto)
    const candidates = patient.results.filter((r) => {
      const ev = evaluations.find((e) => e.versionId === r.testId);
      const cat = ev?.testCategory ?? "";
      return def.cats.includes(cat) && r.score !== null;
    });
    let value: number;
    let note: string;
    if (candidates.length === 0) {
      value = 45 + ((idx * 7) % 20);
      note = "Sin dato — valor orientativo";
    } else {
      const avgCat = Math.round(
        candidates.reduce((acc, c) => acc + (c.score ?? 0), 0) /
          candidates.length,
      );
      if (def.label === "Riesgo cardiovascular") {
        value = Math.max(10, 100 - avgCat);
        note =
          worstRisk === "bajo" ? "ORP nivel BAJO" : `ORP nivel ${worstRisk}`;
      } else {
        value = avgCat;
        note = candidates[0]?.interpretation || `${candidates.length} test(s)`;
      }
    }
    return { label: def.label, ico: def.ico, value, color: def.color, note };
  });

  const sortedByValue = [...dims].sort((a, b) => b.value - a.value);
  const dofa = {
    f: sortedByValue
      .slice(0, 2)
      .map((d) => `${d.label}: ${d.value} pts — ${d.note}`),
    d: sortedByValue
      .slice(-2)
      .map((d) => `${d.label}: ${d.value} pts — reforzar`),
    o: [
      `Completar ${patient.results.filter((r) => r.state !== "completado").length} tests pendientes`,
      "Adherencia al plan ADRESD",
    ],
    a:
      alerts.length > 0
        ? alerts
            .slice(0, 2)
            .map(() => "Riesgo detectado — seguir plan priorizado")
        : ["Sin amenazas críticas detectadas"],
  };

  const correlations: { title: string; text: string; color: string }[] = [];
  const sueno = dims.find((d) => d.label === "Sueño")?.value ?? 50;
  const metab = dims.find((d) => d.label === "Metabolismo")?.value ?? 50;
  const entorno =
    dims.find((d) => d.label === "Entorno relacional")?.value ?? 50;
  const nutricion = dims.find((d) => d.label === "Nutrición")?.value ?? 50;
  if (sueno < 50 && metab < 60) {
    correlations.push({
      title: "Sueño deficiente ↔ Metabolismo",
      text: "Dormir poco impacta la glucosa y el control de peso. Mejorar sueño mejora el metabolismo directamente.",
      color: "#7C3AED",
    });
  }
  if (entorno < 50 && nutricion < 65) {
    correlations.push({
      title: "Estrés relacional ↔ Nutrición",
      text: "El estrés sostenido dificulta la adherencia alimentaria. Trabajar el entorno potencia el plan nutricional.",
      color: "#D9534F",
    });
  }

  const prof = patient.professionalName || "Equipo ANTARES";
  const plan = [
    {
      specialty: "Nutrición",
      title: "Iniciar plan nutricional según batería",
      prof,
      week: "Semana 1",
      color: "#1D9E75",
    },
    {
      specialty: "Movimiento",
      title: "Activar protocolo de movimiento personalizado",
      prof,
      week: "Semana 1",
      color: "#1B6CA8",
    },
    {
      specialty: "Sueño",
      title:
        sueno < 50
          ? "Protocolo higiene del sueño + valorar apnea"
          : "Consolidar hábitos de sueño",
      prof,
      week: sueno < 50 ? "Semana 2" : "Semana 3",
      color: "#7C3AED",
    },
    {
      specialty: "Psicosocial",
      title:
        entorno < 50
          ? "Acompañamiento relacional — reducir barrera"
          : "Fortalecer red de apoyo",
      prof,
      week: "Semana 2",
      color: "#D97824",
    },
    {
      specialty: "Comunidad",
      title: "Activar comunidad ANTARES según tipificación",
      prof: "",
      week: "",
      color: "#5581A2",
    },
  ];

  return {
    ahs: clampedAhs,
    summary,
    condition,
    chips,
    banner,
    bannerColor,
    bannerIcon,
    indicators,
    ai: {
      label: "IA · Análisis integral",
      message: `AHS ${clampedAhs}/100 — ${summary}. ${condition}. ${completedEvals.length} de ${patient.results.length} tests completados. ${
        worstRisk === "bajo"
          ? "Perfil en rango favorable: mantén adherencia y completa la batería."
          : worstRisk === "moderado"
            ? "Hay áreas con margen de mejora clara; el plan priorizado mueve los indicadores desde la semana 1."
            : "Riesgo elevado que requiere intervención temprana y seguimiento cercano."
      }`,
    },
    dims,
    dofa,
    correlations,
    plan,
    footnote:
      "* Los scores y el AHS se calculan con las reglas de scoring de cada instrumento y no reemplazan la valoración clínica. Tu equipo validará los valores en consulta.",
  };
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    "historia-clinica": "🩺",
    nutricion: "🥗",
    movimiento: "🏃",
    sueno: "🌙",
    adherencia: "🤝",
    "salud-mental": "🧠",
    cardiometabolico: "❤️",
  };
  return map[cat] ?? "📊";
}
