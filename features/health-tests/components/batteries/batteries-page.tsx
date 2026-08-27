"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Layers,
  PackageCheck,
  Plus,
  Users,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useCatalog, useCoverage } from "../../hooks/use-health-tests";
import type { Battery } from "../../types";
import { formatDate } from "../../lib/format";
import { StatSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";

/**
 * Baterías de evaluación: conjuntos de tests configurables (inicial,
 * seguimiento, nutricional, psicológica...).
 */
export function BatteriesPage() {
  const t = useT();
  const { data, loading, error, reload } = useCatalog();
  const coverage = useCoverage();

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
        </div>
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

  if (!data) return null;

  const active = data.batteries.filter((b) => b.state === "activa").length;
  const totalTests = data.batteries.reduce(
    (acc, b) => acc + b.testIds.length,
    0,
  );
  const assigned = data.batteries.reduce(
    (acc, b) => acc + b.assignedPatientCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Baterías de evaluación")}
        description={t(
          "Conjuntos de tests aplicables según el momento del programa: inicial, seguimiento, nutricional, psicológica",
        )}
        icon={Layers}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
          >
            <Plus data-icon="inline-start" />
            {t("Nueva batería")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Baterías configuradas")}
          value={String(data.batteries.length)}
          icon={Layers}
          variant="primary"
          context={t("Activas: {active}", { active: String(active) })}
        />
        <StatCard
          label={t("Tests incluidos")}
          value={String(totalTests)}
          icon={ClipboardList}
          variant="info"
          context={t("En todas las baterías")}
        />
        <StatCard
          label={t("Pacientes asignados")}
          value={String(assigned)}
          icon={Users}
          variant="success"
          context={t("Con batería activa")}
        />
        <StatCard
          label={t("Cobertura inicial")}
          value={
            coverage.data
              ? `${coverage.data.byCategory[0]?.coverage ?? 0}%`
              : "—"
          }
          icon={PackageCheck}
          variant="warning"
          context={t("Batería de evaluación inicial")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.batteries.map((battery) => (
          <BatteryCard key={battery.id} battery={battery} />
        ))}
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-[11.5px] text-muted-foreground">
        <CalendarDays className="size-3.5 shrink-0" />
        {t(
          "Las baterías permiten que nuevos momentos de evaluación (seguimiento, nutricional, psicológica) se configuren sin cambios estructurales.",
        )}
      </p>
    </div>
  );
}

function BatteryCard({ battery }: { battery: Battery }) {
  const t = useT();
  const { data } = useCatalog();
  const stateStyle = {
    activa: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
    inactiva: { bg: "var(--muted)", text: "var(--muted-foreground)" },
    borrador: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  }[battery.state];

  const tests = battery.testIds
    .map((id) => data?.tests.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <article className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Layers className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-[13.5px] font-bold text-foreground">
              {battery.name}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              v{battery.version} · {t("Creada")} {formatDate(battery.createdAt)}
            </span>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: stateStyle.bg, color: stateStyle.text }}
        >
          {battery.state === "activa"
            ? t("Activa")
            : battery.state === "inactiva"
              ? t("Inactiva")
              : t("Borrador")}
        </span>
      </div>

      <p className="px-4 text-[11.5px] leading-relaxed text-muted-foreground">
        {battery.description}
      </p>

      <div className="flex flex-col gap-2 px-4">
        <div className="flex flex-wrap gap-1.5">
          {tests.map((test) => (
            <span
              key={test.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              <span aria-hidden>{test.icon}</span>
              <span className="text-muted-foreground">{test.code}</span>
              {test.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border px-4 py-3 text-[11.5px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ClipboardList className="size-3.5 text-primary" />
          {battery.testIds.length} {t("tests")}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-success" />
          {battery.requiredCount} {t("obligatorios")} · {battery.optionalCount}{" "}
          {t("opcionales")}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="size-3.5 text-info" />
          {battery.assignedPatientCount} {t("pacientes")}
        </span>
      </div>
    </article>
  );
}
