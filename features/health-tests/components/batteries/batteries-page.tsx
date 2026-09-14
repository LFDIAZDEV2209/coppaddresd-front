"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Apple,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  Layers,
  PackageCheck,
  Plus,
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
import type { Battery, HealthTest } from "../../types";
import { formatDate } from "../../lib/format";
import {
  healthTestsApi,
  type CreateBatteryInput,
} from "../../services/health-tests-service";
import { StatSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";
import { CreateBatteryDialog } from "./create-battery-dialog";
import {
  AssignPatientsDialog,
  type AssignPatientOption,
} from "./assign-patients-dialog";

/**
 * Baterías de evaluación: conjuntos de tests configurables (inicial,
 * seguimiento, nutricional, psicológica...).
 */
export function BatteriesPage() {
  const t = useT();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const hasManage = hasPermission("HealthTests.Manage");
  const hasAssign = hasPermission("HealthTests.Assign");
  const { data, loading, error, reload } = useCatalog();
  const coverage = useCoverage();
  const master = useMasterPatients();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Battery | null>(null);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
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

  // Los datos del backend no traen pacientes asignados por batería todavía:
  // se derivan de la tabla maestra cruzando los tests de cada batería.
  const testsById = new Map(data.tests.map((test) => [test.id, test]));
  const codesForBattery = (battery: Battery) =>
    new Set(
      battery.testIds
        .map((id) => testsById.get(id)?.code)
        .filter((code): code is string => Boolean(code)),
    );
  const assignedByBattery = new Map<string, number>();
  for (const battery of data.batteries) {
    const codes = codesForBattery(battery);
    assignedByBattery.set(
      battery.id,
      (master.data?.rows ?? []).filter((row) =>
        row.patient.results.some((r) => r.testCode && codes.has(r.testCode)),
      ).length,
    );
  }
  const allCodes = new Set(
    data.batteries.flatMap((battery) => [...codesForBattery(battery)]),
  );
  const assigned = (master.data?.rows ?? []).filter((row) =>
    row.patient.results.some((r) => r.testCode && allCodes.has(r.testCode)),
  ).length;

  // Cobertura de la batería principal según los tests que la componen.
  const primaryCodes = data.batteries[0]
    ? codesForBattery(data.batteries[0])
    : new Set<string>();
  let completedTests = 0;
  let totalAssignedTests = 0;
  for (const item of coverage.data?.byTest ?? []) {
    if (!primaryCodes.has(item.test.code)) continue;
    completedTests += item.completed;
    totalAssignedTests += item.total;
  }
  const primaryCoverage =
    totalAssignedTests === 0
      ? 0
      : Math.round((completedTests / totalAssignedTests) * 100);

  const patientOptions: AssignPatientOption[] = (master.data?.rows ?? []).map(
    (row) => ({
      id: row.patient.id,
      name: `${row.patient.firstName} ${row.patient.lastName}`,
      detail: row.patient.documentNumber,
      risk: row.risk,
      clinic: row.patient.clinic,
    }),
  );

  // Momentos del programa: el inicial ya existe como batería real; el resto
  // son tarjetas de roadmap hasta que se configuren.
  const moments = [
    {
      id: "inicial",
      title: t("Inicial"),
      description: t("Evaluación de entrada al programa."),
      icon: PackageCheck,
      battery: data.batteries[0] ?? null,
    },
    {
      id: "seguimiento",
      title: t("Seguimiento"),
      description: t("Tests de control periódico del avance."),
      icon: CalendarDays,
      battery: null,
    },
    {
      id: "nutricional",
      title: t("Nutricional"),
      description: t("Valoración nutricional específica."),
      icon: Apple,
      battery: null,
    },
    {
      id: "psicologica",
      title: t("Psicológica"),
      description: t("Valoración psicológica específica."),
      icon: Brain,
      battery: null,
    },
  ];

  const handleCreate = async (input: CreateBatteryInput) => {
    setCreating(true);
    try {
      const created = await healthTestsApi.createBattery(input);
      setCreateOpen(false);
      await Promise.all([reload(), coverage.reload(), master.reload()]);
      router.push(`/health-tests/baterias/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (patientIds: string[]) => {
    if (!assignTarget) return 0;
    const created = await healthTestsApi.assignBattery(assignTarget.id, patientIds);
    await Promise.all([master.reload(), coverage.reload()]);
    return created;
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Baterías de evaluación")}
        description={t(
          "Conjuntos de tests aplicables según el momento del programa: inicial, seguimiento, nutricional, psicológica",
        )}
        icon={Layers}
        actions={
          hasManage ? (
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus data-icon="inline-start" />
              {t("Nueva batería")}
            </Button>
          ) : undefined
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
          value={master.data ? String(assigned) : "—"}
          icon={Users}
          variant="success"
          context={t("Con batería activa")}
        />
        <StatCard
          label={t("Cobertura inicial")}
          value={coverage.data ? `${primaryCoverage}%` : "—"}
          icon={PackageCheck}
          variant="warning"
          context={t("Batería de evaluación inicial")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        {data.batteries.map((battery) => (
          <BatteryCard
            key={battery.id}
            battery={battery}
            tests={battery.testIds
              .map((id) => testsById.get(id))
              .filter((test): test is HealthTest => Boolean(test))}
            assignedCount={assignedByBattery.get(battery.id) ?? 0}
            hasAssign={hasAssign}
            onAssign={setAssignTarget}
          />
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[13.5px] font-bold text-foreground">
            {t("Momentos del programa")}
          </h2>
          <p className="text-[11.5px] text-muted-foreground">
            {t(
              "Cada momento agrupa los tests que se aplican en una etapa del acompañamiento.",
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {moments.map((moment) =>
            moment.battery ? (
              <Link
                key={moment.id}
                href={`/health-tests/baterias/${moment.battery.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <moment.icon className="size-4.5" />
                  </span>
                  <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success-foreground">
                    {t("Activa")}
                  </span>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-foreground">
                    {moment.title}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {moment.battery.name}
                  </span>
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary">
                  {t("Ver detalle")}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ) : (
              <article
                key={moment.id}
                className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <moment.icon className="size-4.5" />
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {t("Próximamente")}
                  </span>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-foreground">
                    {moment.title}
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    {moment.description}
                  </span>
                </span>
              </article>
            ),
          )}
        </div>
      </section>

      <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-[11.5px] text-muted-foreground">
        <CalendarDays className="size-3.5 shrink-0" />
        {t(
          "Las baterías permiten que nuevos momentos de evaluación (seguimiento, nutricional, psicológica) se configuren sin cambios estructurales.",
        )}
      </p>

      <CreateBatteryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        tests={data.tests}
        saving={creating}
        onCreate={handleCreate}
      />

      <AssignPatientsDialog
        open={assignTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
        batteryName={assignTarget?.name ?? ""}
        patients={patientOptions}
        onAssign={handleAssign}
      />
    </div>
  );
}

function BatteryCard({
  battery,
  tests,
  assignedCount,
  hasAssign,
  onAssign,
}: {
  battery: Battery;
  tests: HealthTest[];
  assignedCount: number;
  hasAssign: boolean;
  onAssign: (battery: Battery) => void;
}) {
  const t = useT();
  const stateStyle = {
    activa: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
    inactiva: { bg: "var(--muted)", text: "var(--muted-foreground)" },
    borrador: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  }[battery.state];

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
              {battery.version} · {t("Creada")} {formatDate(battery.createdAt)}
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
          {assignedCount} {t("pacientes")}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Link
          href={`/health-tests/baterias/${battery.id}`}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Eye className="size-3.5" />
          {t("Ver detalle")}
        </Link>
        {hasAssign ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onAssign(battery)}
          >
            <Users data-icon="inline-start" />
            {t("Asignar pacientes")}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
