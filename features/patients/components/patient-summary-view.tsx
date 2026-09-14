"use client";

import { useState } from "react";
import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  Bone,
  Briefcase,
  Building2,
  CalendarPlus,
  ChartArea,
  Coffee,
  Compass,
  Droplets,
  EyeOff,
  Flower2,
  GraduationCap,
  HeartCrack,
  HeartHandshake,
  HeartPulse,
  HousePlus,
  Landmark,
  Mars,
  PhoneCall,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Unlink,
  User,
  UserCheck,
  UserRound,
  UserRoundX,
  Users,
  Venus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { StatCard } from "@/components/feedback/stat-card";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/providers/i18n-provider";
import { PatientDistributionChart } from "./patient-distribution-chart";
import type { PatientDashboard } from "../types";

const GENDER_COLORS = ["#0e7490", "#123b63", "#7fb5e6", "#d4af37", "#64748b"];
const AGE_COLORS = [
  "#7fb5e6",
  "#3f81c2",
  "#0e7490",
  "#123b63",
  "#d4af37",
  "#64748b",
];
const MARITAL_COLORS = [
  "#0e7490",
  "#3f81c2",
  "#7fb5e6",
  "#d4af37",
  "#c83237",
  "#7c3aed",
  "#64748b",
];
const DIAGNOSIS_COLORS = [
  "#c83237",
  "#e06b3c",
  "#d4af37",
  "#7c3aed",
  "#3f81c2",
];
const INSURER_COLORS = [
  "#059669",
  "#0e7490",
  "#3f81c2",
  "#7c3aed",
  "#d4af37",
  "#64748b",
];
const PROFESSIONAL_COLORS = [
  "#7c3aed",
  "#3f81c2",
  "#0e7490",
  "#059669",
  "#d4af37",
  "#64748b",
];

const MARITAL_LABELS: Record<string, string> = {
  Single: "Soltero/a",
  Married: "Casado/a",
  Divorced: "Divorciado/a",
  Widowed: "Viudo/a",
  Separated: "Separado/a",
  "Domestic Partnership": "Unión libre",
  "Prefer Not to Say": "Prefiere no decir",
};

function formatMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("es", {
    month: "short",
    year: "2-digit",
  });
}

/** Icono por línea de cada distribución (badge con el tinte del item). */
const GENDER_ICONS: Record<string, LucideIcon> = {
  Masculino: Mars,
  Femenino: Venus,
};
const AGE_ICONS: Record<string, LucideIcon> = {
  "18-30": Sparkles,
  "31-45": Briefcase,
  "46-55": Compass,
  "56-65": Coffee,
  "65+": HeartHandshake,
};
/** Clave = valor crudo del backend (antes de traducir la etiqueta). */
const MARITAL_ICONS: Record<string, LucideIcon> = {
  Single: User,
  Married: HeartHandshake,
  Divorced: HeartCrack,
  Widowed: Flower2,
  Separated: Unlink,
  "Domestic Partnership": HousePlus,
  "Prefer Not to Say": EyeOff,
};
/** Capítulo CIE-10 por letra inicial del código. */
const DIAGNOSIS_ICONS: Record<string, LucideIcon> = {
  I: HeartPulse,
  E: Pill,
  M: Bone,
  D: Droplets,
};
/** Sin semántica propia: rotación institucional determinista por índice. */
const INSURER_ICONS: LucideIcon[] = [
  ShieldCheck,
  Building2,
  Landmark,
  BadgeCheck,
  Award,
  HeartHandshake,
];
const PROFESSIONAL_ICONS: LucideIcon[] = [
  Stethoscope,
  GraduationCap,
  UserRound,
  HeartPulse,
  Award,
  Briefcase,
];

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[110px] w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[320px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Vista general del dashboard de pacientes: KPIs reales + demografía,
 * crecimiento y cobertura del alcance. Cada distribución permite alternar
 * barras ⇄ círculo (con animación y respeto a `prefers-reduced-motion`); el
 * crecimiento alterna área ⇄ barras. Todo viene del endpoint de agregados
 * (scoped por el backend) — sin cifras simuladas.
 */
export function PatientSummaryView({
  data,
  loading,
  error,
  months,
  onMonthsChange,
  onRetry,
}: {
  data: PatientDashboard | null;
  loading: boolean;
  error: string | null;
  months: 6 | 12;
  onMonthsChange: (next: 6 | 12) => void;
  onRetry: () => void;
}) {
  const t = useT();
  const [growthMode, setGrowthMode] = useState<"area" | "bars">("area");

  if (loading && !data) return <SummarySkeleton />;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
        <p className="text-sm font-semibold text-destructive">
          {t("No pudimos cargar el dashboard de pacientes")}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("Reintentar")}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const kpis = data.kpis;
  const genderItems = data.genderDistribution.map((slice) => ({
    label: slice.value ?? t("Sin dato"),
    value: slice.count,
    icon: (slice.value && GENDER_ICONS[slice.value]) || User,
  }));
  const ageItems = data.ageDistribution.map((slice, index) => ({
    label: slice.value ?? "—",
    value: slice.count,
    icon:
      (slice.value && AGE_ICONS[slice.value]) ||
      [Sparkles, Briefcase, Compass, Coffee, HeartHandshake][index % 5],
  }));
  const maritalItems = data.maritalStatusDistribution.map((slice) => ({
    label: slice.value
      ? t(MARITAL_LABELS[slice.value] ?? slice.value)
      : t("Sin dato"),
    value: slice.count,
    icon: (slice.value && MARITAL_ICONS[slice.value]) || User,
  }));
  const insurerItems = data.insurerDistribution.map((slice, index) => ({
    label: slice.name ?? t("Sin aseguradora"),
    value: slice.count,
    icon: INSURER_ICONS[index % INSURER_ICONS.length],
  }));
  const diagnosisItems = data.topDiagnoses.map((slice) => ({
    label: slice.description
      ? `${slice.code} · ${slice.description}`
      : slice.code,
    value: slice.count,
    icon:
      (slice.code && DIAGNOSIS_ICONS[slice.code[0]?.toUpperCase()]) ||
      Stethoscope,
  }));
  const professionalItems = data.topProfessionals.map((slice, index) => ({
    label: slice.name,
    value: slice.count,
    icon: PROFESSIONAL_ICONS[index % PROFESSIONAL_ICONS.length],
  }));
  const growthData = data.newPatientsByMonth.map((point) => ({
    month: formatMonth(point.year, point.month),
    value: point.count,
  }));
  const growthTotal = data.newPatientsByMonth.reduce(
    (sum, point) => sum + point.count,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Banner decorativo con icono 3D animado (familia compartida). */}
      <section className="flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5">
        <AnimatedIcon name="medical-kit" size={72} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {t("Resumen del alcance")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Datos reales scoped por tu clínica y tus permisos; las gráficas se recalculan con cada filtro.",
            )}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Users aria-hidden className="size-3.5" />
            {kpis.total} {t("pacientes")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-foreground">
            <HeartHandshake aria-hidden className="size-3.5" />
            {data.emergencyContactPct.toFixed(0)}%{" "}
            {t("con contacto de emergencia")}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Total de pacientes")}
          value={String(kpis.total)}
          icon={Users}
          filled
          context={t("Directorio completo")}
        />
        <StatCard
          label={t("Activos")}
          value={String(kpis.active)}
          icon={UserCheck}
          variant="success"
          context={t("En seguimiento activo")}
        />
        <StatCard
          label={t("Nuevos este mes")}
          value={String(kpis.newThisMonth)}
          icon={CalendarPlus}
          variant="info"
          context={t("Registrados en el mes")}
        />
        <StatCard
          label={t("Sin profesional asignado")}
          value={String(kpis.withoutProfessional)}
          icon={UserRoundX}
          variant="warning"
          context={t("Requieren asignación")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Crecimiento de pacientes")}
            description={`${t("Nuevos registros por mes")} · ${growthTotal} ${t("en el período")}`}
            icon={Activity}
            variant="primary"
            actions={
              <div className="flex items-center gap-2">
                <ToggleGroup
                  value={[growthMode]}
                  onValueChange={(values) => {
                    const next = values[0];
                    if (next === "area" || next === "bars") setGrowthMode(next);
                  }}
                  aria-label={t("Cambiar tipo de gráfica")}
                >
                  <ToggleGroupItem
                    value="area"
                    title={t("Ver como área")}
                    className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                  >
                    <ChartArea aria-hidden className="size-4" />
                    <span className="sr-only">{t("Ver como área")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="bars"
                    title={t("Ver como barras")}
                    className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                  >
                    <BarChart3 aria-hidden className="size-4" />
                    <span className="sr-only">{t("Ver como barras")}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  value={[String(months)]}
                  onValueChange={(values) => {
                    const next = values[0];
                    if (next === "6" || next === "12")
                      onMonthsChange(Number(next) as 6 | 12);
                  }}
                  aria-label={t("Rango de meses")}
                >
                  <ToggleGroupItem
                    value="6"
                    className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                  >
                    {t("6 meses")}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="12"
                    className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                  >
                    {t("12 meses")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            }
          />
          <div className="p-5">
            {growthData.length === 0 ? (
              <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                {t("Sin datos en el período")}
              </p>
            ) : (
              <div className="h-52 w-full animate-fade-in">
                <ResponsiveContainer width="100%" height="100%">
                  {growthMode === "area" ? (
                    <AreaChart
                      data={growthData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                    >
                      <defs>
                        <linearGradient
                          id="patients-growth"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#0e7490"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#0e7490"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        opacity={0.35}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={36}
                      />
                      <Tooltip
                        formatter={(value) => [
                          String(value),
                          t("Pacientes nuevos"),
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#0e7490"
                        strokeWidth={2}
                        fill="url(#patients-growth)"
                        animationDuration={650}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={growthData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        opacity={0.35}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        width={36}
                      />
                      <Tooltip
                        formatter={(value) => [
                          String(value),
                          t("Pacientes nuevos"),
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#0e7490"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={34}
                        animationDuration={650}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        <PatientDistributionChart
          title={t("Por sexo")}
          description={t("Distribución del alcance")}
          icon={UserRound}
          items={genderItems}
          colors={GENDER_COLORS}
          defaultMode="donut"
          emptyLabel={t("Sin datos de sexo registrados.")}
        />

        <PatientDistributionChart
          title={t("Rangos de edad")}
          icon={Users}
          items={ageItems}
          colors={AGE_COLORS}
          barColor="#0e7490"
          emptyLabel={t("Sin fechas de nacimiento registradas.")}
        />

        <PatientDistributionChart
          title={t("Estado civil")}
          icon={ShieldCheck}
          items={maritalItems}
          colors={MARITAL_COLORS}
          barColor="#0e7490"
          emptyLabel={t("Sin estado civil registrado.")}
        />

        <PatientDistributionChart
          title={t("Diagnósticos principales")}
          icon={HeartPulse}
          items={diagnosisItems}
          colors={DIAGNOSIS_COLORS}
          barColor="#c83237"
          emptyLabel={t("Sin diagnósticos registrados.")}
        />

        <PatientDistributionChart
          title={t("Aseguradora")}
          icon={Stethoscope}
          items={insurerItems}
          colors={INSURER_COLORS}
          barColor="#059669"
          emptyLabel={t("Sin aseguradoras registradas.")}
        />

        {professionalItems.length > 0 && (
          <PatientDistributionChart
            title={t("Profesionales con más pacientes")}
            description={t("Asignaciones activas")}
            icon={Award}
            items={professionalItems}
            colors={PROFESSIONAL_COLORS}
            barColor="#7c3aed"
            emptyLabel={t("Sin asignaciones activas.")}
          />
        )}

        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Contacto de emergencia")}
            description={t("Cobertura del alcance")}
            icon={PhoneCall}
            variant="primary"
          />
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 py-8">
            <span className="text-4xl font-bold tabular-nums text-foreground">
              {data.emergencyContactPct.toFixed(1)}%
            </span>
            <p className="text-center text-sm text-muted-foreground">
              {t("pacientes con contacto de emergencia registrado")}
            </p>
            <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: `${Math.min(data.emergencyContactPct, 100)}%` }}
                role="img"
                aria-label={`${data.emergencyContactPct.toFixed(1)}%`}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
