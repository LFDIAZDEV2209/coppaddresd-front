"use client";

import {
  Gift,
  Trophy,
  Star,
  RefreshCw,
  Lock,
  CheckCircle2,
  Flame,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgramCofres } from "../hooks/use-program-cofres";
import {
  initials,
  CHART_TOOLTIP,
  xpCategoryLabel,
  xpCategoryColor,
} from "../services/program-erp-constants";
import { ChartTabs, usePersistedTab } from "./chart-tabs";
import { PagedListFooter } from "./paged-list-footer";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ErpCofresHitos, ProgramErpCofresDto } from "../types/erp";

const MILESTONE_KEYS = [7, 11, 22, 50] as const;

// --- Componente principal ---

export function ProgramCofresPage() {
  const { data, loading, error, retry } = useProgramCofres();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Cofres & XP"
        description="Hitos de racha, distribución de XP y progreso de pacientes"
        icon={Gift}
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

      {loading ? (
        <CofresSkeleton />
      ) : error ? (
        <CofresError message={error} onRetry={retry} />
      ) : data ? (
        <CofresContent data={data} />
      ) : null}
    </div>
  );
}

// --- Contenido ---

function CofresContent({
  data,
}: {
  data: import("../types/erp").ProgramErpCofresDto;
}) {
  const { xp_por_categoria, milestones, tabla } = data;

  const totalPatients = tabla.length;
  const totalXp = tabla.reduce((sum, r) => sum + r.total_xp, 0);
  const totalPending = tabla.reduce(
    (sum, r) => sum + r.pending_clinical_count,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Pacientes activos"
          value={String(totalPatients)}
          icon={Gift}
          variant="info"
        />
        <StatCard
          label="XP total otorgado"
          value={totalXp.toLocaleString()}
          icon={Trophy}
          variant="success"
        />
        <StatCard
          label="Revisión clínica pendiente"
          value={String(totalPending)}
          icon={Star}
          variant={totalPending > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Hitos 50+ racha"
          value={String(milestones.streak_50)}
          icon={CheckCircle2}
          variant="primary"
        />
        <StatCard
          label="Próximos (≤3 d)"
          value={data.proximos_a_desbloquear !== undefined ? String(data.proximos_a_desbloquear) : "—"}
          icon={Clock}
          variant="warning"
          context="≤3 días"
        />
      </section>

      {/* Milestones — tabbed: tarjetas / resumen */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CofresHitosCard data={data} totalPatients={totalPatients} />

        {/* XP por categoría (standalone) */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="XP por categoría"
            description="Total de experiencia por origen de XP"
            icon={Trophy}
            variant="secondary"
          />
          <div className="mt-4 h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={xp_por_categoria.map((x) => ({
                  ...x,
                  label: xpCategoryLabel(x.category),
                }))}
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) =>
                    v.length > 16 ? `${v.slice(0, 15).trimEnd()}…` : v
                  }
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  width={42}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  {...CHART_TOOLTIP}
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(value) => [String(value ?? 0), "XP"]}
                />
                <Bar
                  dataKey="total"
                  name="XP"
                  radius={[6, 6, 0, 0]}
                  barSize={38}
                  maxBarSize={52}
                >
                  {xp_por_categoria.map((entry) => (
                    <Cell key={entry.category} fill={xpCategoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Patient table — paginated */}
      <CofresTablaPaginada tabla={tabla} />
    </div>
  );
}

function CofresTablaPaginada({ tabla }: { tabla: ProgramErpCofresDto["tabla"] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.max(1, Math.ceil(tabla.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = tabla.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <section className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${tabla.length} pacientes`}
        description="Progreso individual de cofres y XP"
        icon={Gift}
        variant="primary"
      />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="text-right">Racha</TableHead>
              <TableHead className="text-right">XP Total</TableHead>
              <TableHead className="text-center">Nivel</TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <span className="text-[10px]">7d</span>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <span className="text-[10px]">11d</span>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <span className="text-[10px]">22d</span>
              </TableHead>
              <TableHead className="hidden text-center md:table-cell">
                <span className="text-[10px]">50d</span>
              </TableHead>
              <TableHead className="text-right">Próximo cofre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No hay datos de cofres disponibles.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.patient_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {initials(row.patient_name)}
                      </span>
                      {row.patient_id ? (
                        <Link
                          href={`/program/gestion?view=perfil-360&patient=${row.patient_id}`}
                          className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                        >
                          {row.patient_name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-medium">
                          {row.patient_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-warning-soft text-warning">
                      <Flame className="size-3" /> {row.current_streak}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {row.total_xp.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[11px]">
                      {row.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <HitoIcon unlocked={row.hitos.streak_7} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <HitoIcon unlocked={row.hitos.streak_11} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <HitoIcon unlocked={row.hitos.streak_22} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <HitoIcon unlocked={row.hitos.streak_50} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {row.next_milestone_days > 0
                      ? `${row.next_milestone_days}d`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PagedListFooter
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />
    </section>
  );
}

function HitoIcon({ unlocked }: { unlocked: boolean }) {
  return unlocked ? (
    <CheckCircle2 className="inline size-4 text-success" />
  ) : (
    <Lock className="inline size-4 text-muted-foreground/40" />
  );
}

/** Card: Hitos — tabs for tarjetas / resumen. */
function CofresHitosCard({
  data,
  totalPatients,
}: {
  data: ProgramErpCofresDto;
  totalPatients: number;
}) {
  const [tab, setTab] = usePersistedTab("cofres-hitos", "tarjetas");
  const { milestones } = data;

  return (
    <ChartTabs
      tabs={[
        { key: "tarjetas", label: "Tarjetas" },
        { key: "resumen", label: "Resumen" },
      ]}
      value={tab}
      onChange={setTab}
      title="Hitos de racha"
      description="Pacientes que alcanzaron cada ronda"
      icon={Star}
    >
      {tab === "tarjetas" && (
        <div className="grid grid-cols-2 gap-4">
          {MILESTONE_KEYS.map((days) => {
            const count =
              milestones[`streak_${days}` as keyof typeof milestones];
            const unlocked = count > 0;
            return (
              <div
                key={days}
                className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border p-6 transition-all ${
                  unlocked
                    ? "border-warning/40 bg-warning-soft/30 hover:shadow-md"
                    : "border-border bg-muted/50"
                }`}
              >
                {unlocked ? (
                  <Gift className="mb-1 size-7 text-warning" />
                ) : (
                  <Lock className="mb-1 size-7 text-muted-foreground" />
                )}
                <span
                  className={`text-4xl font-bold tabular-nums ${
                    unlocked ? "text-warning" : "text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {days}+ días
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {count} / {totalPatients} pacientes
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === "resumen" && (
        <div className="flex flex-col gap-4 py-2">
          {MILESTONE_KEYS.map((days) => {
            const count =
              milestones[`streak_${days}` as keyof typeof milestones];
            const pct = totalPatients > 0 ? (count / totalPatients) * 100 : 0;
            return (
              <div key={days} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <span className="w-20 text-sm font-semibold text-foreground">
                  {days}+ días
                </span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-bold tabular-nums">
                  {count} <span className="text-xs font-normal text-muted-foreground">({pct.toFixed(0)}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ChartTabs>
  );
}

// --- Skeleton & Error ---

function CofresSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-4"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </section>
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border py-3 last:border-0"
          >
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <div className="flex-1" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CofresError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        Error al cargar cofres y XP
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
