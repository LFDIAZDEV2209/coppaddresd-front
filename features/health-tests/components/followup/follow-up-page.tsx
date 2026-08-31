"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Check,
  ClipboardList,
  Eye,
  Flag,
  History,
  Hourglass,
  Send,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
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
import { usePendingPatients } from "../../hooks/use-health-tests";
import type { PendingPatientRow } from "../../types";
import { initials } from "../../lib/format";
import { StatSkeleton, TableSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState, ModuleEmptyState } from "../shared/module-states";

type PriorityFilter = "all" | "alta" | "media" | "baja";

const priorityStyle: Record<
  PendingPatientRow["priority"],
  { bg: string; text: string }
> = {
  alta: { bg: "var(--destructive-soft)", text: "var(--destructive)" },
  media: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  baja: { bg: "var(--muted)", text: "var(--muted-foreground)" },
};

const priorityLabel: Record<PendingPatientRow["priority"], string> = {
  alta: "Prioridad alta",
  media: "Prioridad media",
  baja: "Prioridad baja",
};

/**
 * Seguimiento: pacientes con tests pendientes, recordatorios (mock) y
 * navegación al perfil. La UX del recordatorio queda lista para conectarla
 * a notificaciones reales (push/SMS/email).
 */
export function FollowUpPage() {
  const t = useT();
  const { data, loading, error, reload, sendReminder } = usePendingPatients();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<PriorityFilter>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.rows.filter((row) => {
      if (priority !== "all" && row.priority !== priority) return false;
      if (!term) return true;
      const name =
        `${row.patient.firstName} ${row.patient.lastName}`.toLowerCase();
      const doc = row.patient.documentNumber.toLowerCase();
      return name.includes(term) || doc.includes(term);
    });
  }, [data, search, priority]);

  const totals = useMemo(() => {
    if (!data) return null;
    const high = data.rows.filter((r) => r.priority === "alta").length;
    const reminded = Object.keys(data.reminded).length;
    const started = data.rows.filter((r) =>
      r.patient.results.some(
        (x) => x.state === "completado" || x.state === "en-progreso",
      ),
    ).length;
    return {
      total: data.rows.length,
      high,
      reminded,
      started,
      pendingOnly: data.rows.length - started,
    };
  }, [data]);

  const header = (
    <PageHeader
      title={t("Pacientes pendientes")}
      description={t(
        "Pacientes con tests por aplicar, recordatorios y prioridades de intervención",
      )}
      icon={Hourglass}
      actions={
        totals?.total ? (
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={() => {
              data?.rows.forEach((r) => sendReminder(r.patient.id));
            }}
          >
            <Send data-icon="inline-start" />
            {t("Recordatorio a todos")}
          </Button>
        ) : undefined
      }
    />
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <TableSkeleton rows={6} />
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

  const isFiltered = search.trim() !== "" || priority !== "all";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Pendientes totales")}
          value={String(totals.total)}
          icon={Hourglass}
          variant="warning"
          context={t("Con al menos un test sin aplicar")}
        />
        <StatCard
          label={t("Prioridad alta")}
          value={String(totals.high)}
          icon={Flag}
          variant="destructive"
          context={t("Riesgo elevado o vencidos")}
        />
        <StatCard
          label={t("Recordatorios enviados")}
          value={String(totals.reminded)}
          icon={BellRing}
          variant="info"
          context={t("En esta sesión (mock)")}
        />
        <StatCard
          label={t("Con batería iniciada")}
          value={`${totals.started}/${totals.total}`}
          icon={UserCheck}
          variant="success"
          context={t("Ya empezaron sus evaluaciones")}
        />
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Lista de pendientes")}
          description={t("Ordenados por prioridad y antigüedad de asignación")}
          icon={ClipboardList}
          variant="primary"
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  className="h-8 w-44 border-white/25 bg-white/15 pl-3 text-white placeholder:text-white/60 [&::placeholder]:text-white/60"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Buscar paciente...")}
                  aria-label={t("Buscar paciente")}
                />
              </div>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setPriority((value ?? "all") as PriorityFilter)
                }
              >
                <SelectTrigger
                  className="h-8 w-40 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
                  aria-label={t("Filtrar por prioridad")}
                >
                  <SelectValue>
                    {priority === "all"
                      ? t("Todas las prioridades")
                      : priorityLabel[priority]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("Todas las prioridades")}
                  </SelectItem>
                  <SelectItem value="alta">{priorityLabel.alta}</SelectItem>
                  <SelectItem value="media">{priorityLabel.media}</SelectItem>
                  <SelectItem value="baja">{priorityLabel.baja}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
        {filtered.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin pacientes pendientes")}
            description={
              isFiltered
                ? t("Ningún paciente coincide con los filtros aplicados.")
                : t(
                    "Todos los pacientes han completado su batería de evaluación.",
                  )
            }
            filtered={isFiltered}
            onClear={() => {
              setSearch("");
              setPriority("all");
            }}
          />
        ) : (
          <PendingTable
            rows={filtered}
            tests={data.tests}
            onRemind={sendReminder}
            reminded={data.reminded}
          />
        )}
      </section>
    </div>
  );
}

function PendingTable({
  rows,
  tests,
  onRemind,
  reminded,
}: {
  rows: PendingPatientRow[];
  tests: { id: string; name: string; icon: string }[];
  onRemind: (patientId: string) => void;
  reminded: Record<string, number>;
}) {
  const t = useT();
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t("Paciente")}</TableHead>
            <TableHead>{t("Tests pendientes")}</TableHead>
            <TableHead>{t("Días pendientes")}</TableHead>
            <TableHead>{t("Profesional")}</TableHead>
            <TableHead>{t("Prioridad")}</TableHead>
            <TableHead>{t("Acciones")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const sentCount = reminded[row.patient.id] ?? 0;
            return (
              <TableRow key={row.patient.id}>
                <TableCell>
                  <Link
                    href={`/health-tests/pacientes/${row.patient.id}`}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {initials(row.patient.firstName, row.patient.lastName)}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-foreground hover:underline">
                        {row.patient.firstName} {row.patient.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.patient.documentNumber} · {row.patient.clinic}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-72 flex-wrap gap-1.5">
                    {row.pendingTests.slice(0, 3).map((testId) => {
                      const test = tests.find((x) => x.id === testId);
                      if (!test) return null;
                      return (
                        <span
                          key={testId}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          <span aria-hidden>{test.icon}</span>
                          {test.name}
                        </span>
                      );
                    })}
                    {row.pendingTests.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        +{row.pendingTests.length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-semibold text-foreground">
                    {row.daysPending}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("desde asignación")}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-sm">
                    <Stethoscope className="size-3.5 text-muted-foreground" />
                    {row.professionalName}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: priorityStyle[row.priority].bg,
                      color: priorityStyle[row.priority].text,
                    }}
                  >
                    <Flag className="size-3" />
                    {priorityLabel[row.priority]}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link
                          href={`/health-tests/pacientes/${row.patient.id}`}
                        />
                      }
                    >
                      <Eye data-icon="inline-start" />
                      {t("Perfil")}
                    </Button>
                    <Button
                      variant={sentCount > 0 ? "ghost" : "outline"}
                      size="sm"
                      className={cn(
                        sentCount > 0 &&
                          "text-success hover:bg-success-soft hover:text-success",
                      )}
                      onClick={() => onRemind(row.patient.id)}
                      aria-label={t("Enviar recordatorio a {name}", {
                        name: `${row.patient.firstName} ${row.patient.lastName}`,
                      })}
                    >
                      {sentCount > 0 ? (
                        <Check data-icon="inline-start" />
                      ) : (
                        <BellRing data-icon="inline-start" />
                      )}
                      {sentCount > 0
                        ? t("Enviado {count}", { count: String(sentCount) })
                        : t("Recordatorio")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div
        className="flex items-center gap-2 border-t border-border px-5 py-3 text-[11.5px] text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Users className="size-3.5" />
        {t("{count} pacientes pendientes", { count: String(rows.length) })}
        <span aria-hidden>·</span>
        <History className="size-3.5" />
        {t("Recordatorios son simulados en esta versión")}
      </div>
    </div>
  );
}
