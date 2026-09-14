"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Layers,
  PackageCheck,
  Users,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import {
  useCatalog,
  useCoverage,
  useMasterPatients,
} from "../../hooks/use-health-tests";
import { healthTestsApi } from "../../services/health-tests-service";
import type { HealthTest, RiskLevel } from "../../types";
import { CATEGORY_LABELS, RISK_LABELS } from "../../lib/domain";
import { formatDate } from "../../lib/format";
import { StatSkeleton } from "../shared/module-chart-card";
import { ModuleEmptyState, ModuleErrorState } from "../shared/module-states";
import { categoryAccent, riskColors, scoreBarColor } from "../shared/colors";
import {
  AssignPatientsDialog,
  type AssignPatientOption,
} from "./assign-patients-dialog";

function severityRisk(average: number | null): RiskLevel {
  if (average === null) return "sin-evaluar";
  if (average >= 70) return "alto";
  if (average >= 40) return "moderado";
  return "bajo";
}

/**
 * Detalle de una batería: composición de tests, cobertura, severidad y
 * asignación masiva. Se deriva de la lista de baterías y de la tabla maestra
 * (el backend no expone GET /batteries/{id}).
 */
export function BatteryDetailPage({ batteryId }: { batteryId: string }) {
  const t = useT();
  const { hasPermission } = useAuth();
  const hasAssign = hasPermission("HealthTests.Assign");
  const catalog = useCatalog();
  const master = useMasterPatients();
  const coverage = useCoverage();
  const [assignOpen, setAssignOpen] = useState(false);

  if (catalog.loading && !catalog.data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="h-80 animate-pulse rounded-2xl bg-muted/60" />
      </div>
    );
  }

  if (catalog.error && !catalog.data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState message={catalog.error} onRetry={catalog.reload} />
      </div>
    );
  }

  if (!catalog.data) return null;

  const battery = catalog.data.batteries.find((item) => item.id === batteryId);
  if (!battery) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <BackLink label={t("Volver a Baterías")} />
        <ModuleEmptyState
          title={t("Batería no encontrada")}
          description={t("La batería que buscas no existe o fue eliminada.")}
        />
      </div>
    );
  }

  const testsById = new Map(catalog.data.tests.map((test) => [test.id, test]));
  const ordered: { test: HealthTest; required: boolean; frequencyDays: number | null }[] =
    battery.items && battery.items.length > 0
      ? battery.items.flatMap((item) => {
          const test = testsById.get(item.instrumentId);
          return test
            ? [{ test, required: item.required, frequencyDays: item.frequencyDays }]
            : [];
        })
      : battery.testIds.flatMap((id) => {
          const test = testsById.get(id);
          return test ? [{ test, required: true, frequencyDays: null }] : [];
        });

  const codes = new Set(ordered.map(({ test }) => test.code));
  const rows = master.data?.rows ?? [];
  const results = rows.flatMap((row) => row.patient.results);
  const coverageByCode = new Map(
    (coverage.data?.byTest ?? []).map((item) => [item.test.code, item]),
  );

  const perTest = ordered.map(({ test, required, frequencyDays }) => {
    const completedResults = results.filter(
      (result) =>
        result.testCode === test.code &&
        result.state === "completado" &&
        result.scorePercentage != null,
    );
    const severityValues = completedResults.map(
      (result) => result.scorePercentage as number,
    );
    const average =
      severityValues.length === 0
        ? null
        : severityValues.reduce((acc, value) => acc + value, 0) /
          severityValues.length;
    const covered = coverageByCode.get(test.code);
    const completed = covered?.completed ?? completedResults.length;
    const total = covered?.total ?? completed;
    const patientsWith = rows.filter((row) =>
      row.patient.results.some((result) => result.testCode === test.code),
    ).length;
    return {
      test,
      required,
      frequencyDays,
      average,
      completed,
      total,
      patientsWith,
      coverage:
        total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

  const batteryResults = results.filter(
    (result) =>
      result.testCode && codes.has(result.testCode) && result.state === "completado",
  );
  const rowsWithBattery = rows.filter((row) =>
    row.patient.results.some(
      (result) => result.testCode && codes.has(result.testCode),
    ),
  ).length;

  const categoryTotals = new Map<
    string,
    { total: number; count: number; label: string }
  >();
  for (const result of batteryResults) {
    if (result.scorePercentage == null) continue;
    const test = ordered.find(({ test: item }) => item.code === result.testCode)?.test;
    if (!test) continue;
    const entry = categoryTotals.get(test.category) ?? {
      total: 0,
      count: 0,
      label: CATEGORY_LABELS[test.category],
    };
    entry.total += result.scorePercentage;
    entry.count += 1;
    categoryTotals.set(test.category, entry);
  }
  const categories = [...categoryTotals.entries()]
    .map(([category, entry]) => ({
      category,
      label: entry.label,
      average: entry.total / entry.count,
      count: entry.count,
    }))
    .sort((a, b) => a.average - b.average);

  const severityOrder: RiskLevel[] = ["bajo", "moderado", "alto", "critico"];
  const distribution = severityOrder.map((risk) => ({
    risk,
    count: batteryResults.filter((result) => result.risk === risk).length,
  }));
  const completedTotal = batteryResults.length;
  const requiredCount = perTest.filter((item) => item.required).length;
  const optionalCount = perTest.length - requiredCount;
  const completedSum = perTest.reduce((acc, item) => acc + item.completed, 0);
  const totalSum = perTest.reduce((acc, item) => acc + item.total, 0);
  const overallCoverage =
    totalSum === 0 ? 0 : Math.round((completedSum / totalSum) * 100);

  const stateStyle = {
    activa: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
    inactiva: { bg: "var(--muted)", text: "var(--muted-foreground)" },
    borrador: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  }[battery.state];

  const patientOptions: AssignPatientOption[] = rows.map((row) => ({
    id: row.patient.id,
    name: `${row.patient.firstName} ${row.patient.lastName}`,
    detail: row.patient.documentNumber,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <BackLink label={t("Volver a Baterías")} />

      <PageHeader
        title={battery.name}
        description={
          battery.description || t("Conjunto de tests de la batería")
        }
        icon={Layers}
        actions={
          hasAssign ? (
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              onClick={() => setAssignOpen(true)}
            >
              <Users data-icon="inline-start" />
              {t("Asignar pacientes")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {battery.version}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <CalendarDays className="size-3" />
          {t("Creada")} {formatDate(battery.createdAt)}
        </span>
        {battery.autoAssignOnPatientCreate && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 text-[11px] font-medium text-info-foreground">
            <PackageCheck className="size-3" />
            {t("Auto-asignación de pacientes nuevos")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Tests incluidos")}
          value={String(perTest.length)}
          icon={ClipboardList}
          variant="primary"
          context={`${requiredCount} ${t("obligatorios")} · ${optionalCount} ${t("opcionales")}`}
        />
        <StatCard
          label={t("Pacientes con la batería")}
          value={master.data ? String(rowsWithBattery) : "—"}
          icon={Users}
          variant="info"
          context={t("Con al menos un resultado")}
        />
        <StatCard
          label={t("Tests completados")}
          value={String(completedSum)}
          icon={CheckCircle2}
          variant="success"
          context={t("En todos los tests de la batería")}
        />
        <StatCard
          label={t("Cobertura de la batería")}
          value={coverage.data ? `${overallCoverage}%` : "—"}
          icon={Award}
          variant="warning"
          context={t("Completados sobre asignados")}
        />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-[14px] font-bold">
            {t("Tests de la batería")}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            {t(
              "Orden, obligatoriedad, frecuencia y severidad promedio por test.",
            )}
          </p>
        </div>

        {perTest.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">
            {t("Esta batería todavía no tiene tests configurados.")}
          </p>
        ) : (
          <ul className="flex flex-col">
            {perTest.map((item, index) => {
              const risk = severityRisk(item.average);
              const colors = riskColors(risk);
              return (
                <li
                  key={item.test.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 py-3 last:border-b-0"
                >
                  <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span aria-hidden className="text-base">
                    {item.test.icon}
                  </span>
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate text-[13px] font-medium">
                      {item.test.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.test.code}
                    </span>
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{
                      backgroundColor: item.required
                        ? "var(--primary-soft)"
                        : "var(--muted)",
                      color: item.required
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {item.required ? t("Obligatorio") : t("Opcional")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.frequencyDays
                      ? t("cada {days} días", {
                          days: String(item.frequencyDays),
                        })
                      : t("Sin frecuencia")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.patientsWith} {t("pacientes")} · {item.completed}{" "}
                    {t("completados")}
                  </span>
                  <span className="flex w-28 shrink-0 items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${item.coverage}%`,
                          backgroundColor: scoreBarColor(risk),
                        }}
                      />
                    </span>
                    <span className="w-9 text-right text-[11px] font-semibold tabular-nums">
                      {item.coverage}%
                    </span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {item.average === null
                      ? RISK_LABELS["sin-evaluar"]
                      : `${Math.round(item.average)}% ${RISK_LABELS[risk]}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <div>
            <h2 className="text-[14px] font-bold">
              {t("Promedio de severidad por categoría")}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {t("Promedio 0–100 de los tests completados en esta batería.")}
            </p>
          </div>
          {categories.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              {t("Todavía no hay resultados completados.")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {categories.map((category) => {
                const risk = severityRisk(category.average);
                const colors = riskColors(risk);
                return (
                  <li key={category.category} className="flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryAccent(category.category) }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                      {category.label}
                    </span>
                    <span className="h-2 w-32 shrink-0 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.round(category.average)}%`,
                          backgroundColor: scoreBarColor(risk),
                        }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-[11.5px] font-semibold tabular-nums">
                      {Math.round(category.average)}%
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {RISK_LABELS[risk]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <div>
            <h2 className="text-[14px] font-bold">
              {t("Distribución por severidad")}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {t("{count} resultados completados en la batería.", {
                count: String(completedTotal),
              })}
            </p>
          </div>
          {completedTotal === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              {t("Todavía no hay resultados completados.")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {distribution.map((entry) => {
                const colors = riskColors(entry.risk);
                const width = Math.round((entry.count / completedTotal) * 100);
                return (
                  <li key={entry.risk} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[12px] font-medium">
                      {RISK_LABELS[entry.risk]}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: scoreBarColor(entry.risk),
                        }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-[11.5px] tabular-nums text-muted-foreground">
                      {entry.count} · {width}%
                    </span>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colors.dot }}
                      aria-hidden
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {hasAssign && (
        <AssignPatientsDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          batteryName={battery.name}
          patients={patientOptions}
          onAssign={async (patientIds) => {
            const created = await healthTestsApi.assignBattery(battery.id, patientIds);
            await Promise.all([master.reload(), coverage.reload()]);
            return created;
          }}
        />
      )}
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/health-tests/baterias"
      className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}
