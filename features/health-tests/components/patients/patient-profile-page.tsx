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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePatientDetail } from "../../hooks/use-health-tests";
import {
  patientRisk,
  typificationLabel,
  typifyPatient,
} from "../../lib/domain";
import {
  formatDate,
  formatShortDate,
  fullName,
  initials,
} from "../../lib/format";
import { categoryAccent, riskHex, scoreBarColor } from "../shared/colors";
import { RiskBadge, SeverityBadge, TestStateBadge } from "../shared/badges";
import { ScoreBar } from "../shared/progress";
import { ChartCard, StatSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { healthTestsApi } from "../../services/health-tests-service";
import type {
  Battery,
  HealthTest,
  PatientEvaluation,
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
 * La síntesis IA necesita un resultado persistido: no se fabrican AHS,
 * dimensiones, correlaciones ni recomendaciones desde puntuaciones crudas.
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

  // Etiqueta activa del filtro de test para el SelectValue del trigger.
  const activeTestOption = useMemo(
    () => testOptions.find(([code]) => code === testFilter),
    [testOptions, testFilter],
  );

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

  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [data]);

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
  const completed = patient.results.filter((result) => result.state === "completado").length;
  const pending = patient.results.filter((result) => result.state === "en-progreso").length;
  const patientAlerts = alerts.filter((a) => a.patientId === patient.id);
  const totalTests = patient.results.length;

  const radarData = patient.results
    .filter((r) => r.scorePercentage !== null)
    .map((r) => ({
      name:
        testNameFor(patient.results, r.testId, evaluations) ??
        r.testCode ??
        r.testId,
      score: r.scorePercentage,
    }));

  const evolutionData = buildEvolution(patient);

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
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary-soft-foreground ring-1 ring-primary/15">
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
              {t("Análisis IA no disponible")}
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

      <section id="analisis-ia" className="scroll-mt-6">
        <ModuleEmptyState
          title={t("Análisis IA no disponible")}
          description={t("No hay un análisis IA guardado para este paciente. Consulta los resultados registrados y las respuestas de cada evaluación en el historial.")}
        />
      </section>

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
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
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
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value ?? "todos")}
            >
              <SelectTrigger
                aria-label={t("Filtrar por estado")}
                className="h-9! text-[12.5px] font-medium text-foreground"
              >
                <SelectValue>
                  {statusFilter === "completed"
                    ? t("Completado")
                    : statusFilter === "started"
                      ? t("En progreso")
                      : statusFilter === "abandoned"
                        ? t("Abandonado")
                        : t("Todos los estados")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t("Todos los estados")}</SelectItem>
                <SelectItem value="completed">{t("Completado")}</SelectItem>
                <SelectItem value="started">{t("En progreso")}</SelectItem>
                <SelectItem value="abandoned">{t("Abandonado")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value ?? "todos")}
            >
              <SelectTrigger
                aria-label={t("Filtrar por categoría")}
                className="h-9! text-[12.5px] font-medium text-foreground"
              >
                <SelectValue>
                  {categoryFilter === "todos"
                    ? t("Todas las categorías")
                    : categoryFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">
                  {t("Todas las categorías")}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Fila 2: batería + test + contador + limpiar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:flex-row">
              <Building2 className="size-3.5" />
              {t("Batería")}
              <Select
                value={batteryFilter}
                onValueChange={(value) => setBatteryFilter(value ?? "todos")}
              >
                <SelectTrigger
                  aria-label={t("Filtrar por batería")}
                  className="h-8! text-[12.5px] font-medium normal-case tracking-normal text-foreground"
                >
                  <SelectValue>
                    {batteryFilter === "todos"
                      ? t("Todas")
                      : (batteries.find((b) => b.id === batteryFilter)?.name ??
                        t("Batería"))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">{t("Todas")}</SelectItem>
                  {batteries.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileWarning className="size-3.5" />
              {t("Test")}
              <Select
                value={testFilter}
                onValueChange={(value) => setTestFilter(value ?? "todos")}
              >
                <SelectTrigger
                  aria-label={t("Filtrar por test")}
                  className="h-8! max-w-[220px] text-[12.5px] font-medium normal-case tracking-normal text-foreground"
                >
                  <SelectValue>
                    {testFilter === "todos"
                      ? t("Todos")
                      : (activeTestOption
                        ? `${activeTestOption[1]} · ${activeTestOption[0]}`
                        : testFilter)}
                  </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    <SelectItem value="todos">{t("Todos")}</SelectItem>
                  {testOptions.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name} · {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

function testNameFor(
  results: { testId: string }[],
  versionId: string,
  evaluations: PatientEvaluation[],
): string | null {
  const ev = evaluations.find((e) => e.versionId === versionId);
  return ev?.testName ?? null;
}

function riskFromEvaluation(ev: PatientEvaluation) {
  return ev.status === "completed" ? ev.risk ?? "sin-evaluar" : "sin-evaluar";
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
