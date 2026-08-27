"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  ClipboardCheck,
  Filter,
  Hourglass,
  PieChart,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useCoverage } from "../../hooks/use-health-tests";
import { CATEGORY_LABELS } from "../../lib/domain";
import type { TestCategory } from "../../types";
import { categoryAccent } from "../shared/colors";
import { TestStateBadge } from "../shared/badges";
import {
  ChartCard,
  ChartCardSkeleton,
  StatSkeleton,
  TableSkeleton,
} from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";

/**
 * Cobertura de la batería: global, por test y por categoría, con evolución.
 */
export function CoveragePage() {
  const t = useT();
  const { data, loading, error, reload } = useCoverage();
  const [category, setCategory] = useState<TestCategory | "all">("all");

  const totals = useMemo(() => {
    if (!data) return null;
    const totalAssignments = data.byTest.reduce((acc, c) => acc + c.total, 0);
    const completed = data.byTest.reduce((acc, c) => acc + c.completed, 0);
    const inProgress = data.byTest.reduce((acc, c) => acc + c.inProgress, 0);
    const pending = data.byTest.reduce((acc, c) => acc + c.pending, 0);
    const overdue = data.byTest.reduce((acc, c) => acc + c.overdue, 0);
    const coverage =
      totalAssignments === 0
        ? 0
        : Math.round((completed / totalAssignments) * 100);
    return {
      totalAssignments,
      completed,
      inProgress,
      pending,
      overdue,
      coverage,
    };
  }, [data]);

  const filteredByTest = useMemo(() => {
    if (!data) return [];
    if (category === "all") return data.byTest;
    return data.byTest.filter((c) => c.test.category === category);
  }, [data, category]);

  const header = (
    <PageHeader
      title={t("Cobertura de tests")}
      description={t(
        "Análisis de cumplimiento de la batería de evaluación por test, categoría y período",
      )}
      icon={PieChart}
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
        <TableSkeleton rows={5} />
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
          label={t("Cobertura global")}
          value={`${totals.coverage}%`}
          icon={PieChart}
          variant="success"
          context={t("Tests completados sobre asignados")}
        />
        <StatCard
          label={t("Tests completados")}
          value={String(totals.completed)}
          icon={ClipboardCheck}
          variant="primary"
          context={t("de {total} asignaciones", {
            total: String(totals.totalAssignments),
          })}
        />
        <StatCard
          label={t("En progreso")}
          value={String(totals.inProgress)}
          icon={Timer}
          variant="info"
          context={t("Guardados a medias")}
        />
        <StatCard
          label={t("Pendientes + vencidos")}
          value={String(totals.pending + totals.overdue)}
          icon={Hourglass}
          variant="warning"
          context={t("Requieren aplicación")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("Evolución de la cobertura")}
          description={t("Porcentaje de tests completados · últimos 12 meses")}
          icon={CalendarRange}
        >
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trend}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="covArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--sidebar)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--sidebar)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
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
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, t("Cobertura")]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="var(--sidebar)"
                  strokeWidth={2}
                  fill="url(#covArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("Cobertura por categoría")}
          description={t("Adherencia por dominio clínico de la batería")}
          icon={Filter}
        >
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byCategory.map((c) => ({
                  name: c.categoryName,
                  coverage: c.coverage,
                  color: categoryAccent(c.category),
                }))}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, t("Cobertura")]}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="coverage" radius={[0, 5, 5, 0]} maxBarSize={18}>
                  {data.byCategory.map((c) => (
                    <Cell key={c.category} fill={categoryAccent(c.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Cobertura por test")}
          description={t(
            "Estado y adherencia de cada evaluación de la batería",
          )}
          icon={ClipboardCheck}
          variant="primary"
          actions={
            <Select
              value={category}
              onValueChange={(value) =>
                setCategory((value ?? "all") as TestCategory | "all")
              }
            >
              <SelectTrigger
                className="h-8 w-44 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
                aria-label={t("Filtrar por categoría")}
              >
                <SelectValue>
                  {category === "all"
                    ? t("Todas las categorías")
                    : CATEGORY_LABELS[category]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Todas las categorías")}</SelectItem>
                {data.byCategory.map((c) => (
                  <SelectItem key={c.category} value={c.category}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">{t("Test")}</th>
                <th className="px-4 py-3 font-semibold">{t("Categoría")}</th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("Completados")}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("En progreso")}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("Pendientes")}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("Vencidos")}
                </th>
                <th className="px-5 py-3 font-semibold">{t("Cobertura")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredByTest.map((row) => (
                <tr
                  key={row.test.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
                        style={{
                          backgroundColor: `${categoryAccent(row.test.category)}1A`,
                        }}
                      >
                        {row.test.icon}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {row.test.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {row.test.code} · {t("Orden")} {row.test.order}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${categoryAccent(row.test.category)}1A`,
                        color: categoryAccent(row.test.category),
                      }}
                    >
                      {CATEGORY_LABELS[row.test.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <TestStateBadge
                        state="completado"
                        label={String(row.completed)}
                      />
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <TestStateBadge
                      state="en-progreso"
                      label={String(row.inProgress)}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <TestStateBadge
                      state="pendiente"
                      label={String(row.pending)}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <TestStateBadge
                      state="vencido"
                      label={String(row.overdue)}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex min-w-36 items-center gap-2.5">
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${row.coverage}%`,
                            backgroundColor: categoryAccent(row.test.category),
                          }}
                        />
                      </div>
                      <span className="w-9 text-right text-[12px] font-semibold text-foreground">
                        {row.coverage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LinkToMaster />
    </div>
  );
}

function LinkToMaster() {
  const t = useT();
  return (
    <Link
      href="/health-tests/pacientes"
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <ClipboardCheck className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold text-foreground">
            {t("Explorar la tabla maestra de pacientes")}
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {t("Progreso, riesgo y alertas de cada paciente en un solo lugar")}
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
