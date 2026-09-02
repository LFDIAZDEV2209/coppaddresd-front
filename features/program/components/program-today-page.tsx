"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarCheck,
  AlertTriangle,
  RefreshCw,
  Bell,
  Zap,
  HeartHandshake,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProgramToday } from "../hooks/use-program-today";
import { useProgramToast } from "../hooks/use-program-toast";
import { ProgramToastContainer } from "./program-toast";
import { PagedListFooter } from "./paged-list-footer";
import {
  MISSION_COLORS,
  MISSION_LABELS,
  MISSION_ORDER,
  initials,
  relativeTime,
} from "../services/program-erp-constants";


const DAYS = ["L", "M", "X", "J", "V", "S", "D"];



/** Misiones que se consideran "alertas" (acción clínica requerida). */
const ALERT_TASK_CODES = new Set(["vitals", "emocional"]);
/** Misiones de estado emocional — para "Notificar psicóloga". */
const EMOCIONAL_CODES = new Set(["emocional"]);

const FEED_FILTER_KEY = "program:today:feedfilter";
type FeedFilterValue = "all" | "alerts";

/** Persiste el filtro del feed en sessionStorage. */
function loadFeedFilter(): FeedFilterValue {
  if (typeof window === "undefined") return "all";
  const stored = sessionStorage.getItem(FEED_FILTER_KEY);
  if (stored === "alerts" || stored === "all") return stored;
  return "all";
}

// --- Componente principal ---

export function ProgramTodayPage() {
  const { data, loading, error, retry } = useProgramToday();
  const { toast, toasts, dismiss } = useProgramToast();
  const [feedFilter, setFeedFilter] = useState<FeedFilterValue>(loadFeedFilter);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Persistir filtro
  useEffect(() => {
    sessionStorage.setItem(FEED_FILTER_KEY, feedFilter);
  }, [feedFilter]);

  // Auto-refresh 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      retry();
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, retry]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Actividad de hoy"
        description="Misiones completadas, feed en vivo y pendientes críticos"
        icon={Activity}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
              <Switch
                size="sm"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              Actualización automática (30s)
            </label>
            <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
              <RefreshCw
                data-icon="inline-start"
                className={loading ? "animate-spin" : undefined}
              />
              Actualizar
            </Button>
          </div>
        }
      />

      {loading ? (
        <TodaySkeleton />
      ) : error ? (
        <TodayError message={error} onRetry={retry} />
      ) : data ? (
        <TodayContent
          data={data}
          feedFilter={feedFilter}
          onFeedFilterChange={setFeedFilter}
          toast={toast}
        />
      ) : null}

      <ProgramToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

// --- Contenido ---

function TodayContent({
  data,
  feedFilter,
  onFeedFilterChange,
  toast,
}: {
  data: import("../types/erp").ProgramErpTodayDto;
  feedFilter: FeedFilterValue;
  onFeedFilterChange: (v: FeedFilterValue) => void;
  toast: (msg: string, type?: "success" | "info" | "error") => void;
}) {
  const router = useRouter();
  const { mission_kpis, feed, pendientes_criticos, heatmap_semana } = data;

  // Paginación client-side de pendientes críticos (5 por defecto, cambiable).
  const [pendientesPage, setPendientesPage] = useState(1);
  const [pendientesPageSize, setPendientesPageSize] = useState(5);
  const pendientesTotalPages = Math.max(
    1,
    Math.ceil(pendientes_criticos.length / pendientesPageSize),
  );
  const pendientesSafePage = Math.min(pendientesPage, pendientesTotalPages);
  const pendientesItems = pendientes_criticos.slice(
    (pendientesSafePage - 1) * pendientesPageSize,
    pendientesSafePage * pendientesPageSize,
  );

  const filteredFeed = useMemo(() => {
    const sliced = feed.slice(0, 10);
    if (feedFilter === "alerts") {
      return sliced.filter((e) => ALERT_TASK_CODES.has(e.task_code));
    }
    return sliced;
  }, [feed, feedFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* 6 Mission KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {MISSION_ORDER.map((code) => {
          const kpi = mission_kpis.find((k) => k.task_code === code);
          const completed = kpi?.completed ?? 0;
          const total = kpi?.total ?? 0;
          return (
            <div
              key={code}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: MISSION_COLORS[code] }}
                />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {MISSION_LABELS[code]}
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {completed}
                <span className="text-sm font-normal text-muted-foreground">
                  /{total}
                </span>
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Feed en vivo */}
        <div className="flex min-w-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          <SectionHeader
            title="Feed en vivo"
            description="Últimas acciones de los pacientes"
            icon={Activity}
            variant="primary"
          />
          {/* Filtro del feed */}
          <div className="flex items-center gap-1 border-b border-border px-5 py-2">
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                feedFilter === "all"
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => onFeedFilterChange("all")}
            >
              Todos
            </button>
            <button
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                feedFilter === "alerts"
                  ? "bg-warning-soft text-warning"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => onFeedFilterChange("alerts")}
            >
              Solo alertas
            </button>
          </div>
          {filteredFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <Activity className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No hay actividad registrada hoy.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredFeed.map((entry) => {
                const isIntervenable = entry.task_code === "vitals";
                const isEmocional = EMOCIONAL_CODES.has(entry.task_code);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        backgroundColor:
                          MISSION_COLORS[entry.task_code] ?? "#6B7280",
                      }}
                    >
                      {initials(entry.patient_name)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {entry.patient_id ? (
                        <Link
                          href={`/program/patients/${entry.patient_id}`}
                          className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                        >
                          {entry.patient_name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-medium">
                          {entry.patient_name}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-[10px]"
                          style={{
                            backgroundColor: MISSION_COLORS[entry.task_code],
                            color: "white",
                          }}
                        >
                          {MISSION_LABELS[entry.task_code] ?? entry.task_code}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          +{entry.points_awarded} XP
                        </span>
                      </div>
                    </div>
                    {/* Botones de acción en feed */}
                    {(isIntervenable || isEmocional) && (
                      <div className="flex shrink-0 items-center gap-1">
                        {isIntervenable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-primary"
                            title="Intervenir"
                            onClick={() =>
                              router.push("/program/interventions")
                            }
                          >
                            <Zap className="size-3.5" />
                            Intervenir
                          </Button>
                        )}
                        {isEmocional && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-info"
                            title="Notificar psicóloga"
                            onClick={() =>
                              toast("Psicóloga notificada", "info")
                            }
                          >
                            <HeartHandshake className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(entry.completed_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna derecha: heatmap + pendientes críticos */}
        <div className="flex min-w-0 flex-col gap-4">
        {/* Heatmap */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Heatmap semanal"
            description="Comunidad · % completado vs programado · L–D"
            icon={CalendarCheck}
            variant="secondary"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground">
                    Misión
                  </th>
                  {DAYS.map((d) => (
                    <th
                      key={d}
                      className="pb-2 px-1 text-center text-[11px] font-medium text-muted-foreground"
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MISSION_ORDER.map((code) => (
                  <tr key={code}>
                    <td className="py-1 pr-2 text-[11px] font-medium">
                      {MISSION_LABELS[code]}
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const cell = heatmap_semana.find(
                        (h) =>
                          h.task_code === code &&
                          h.day_index === dayIdx + 1,
                      );
                      const pct = cell?.pct ?? 0;
                      const shade =
                        pct >= 75
                          ? "bg-teal-500"
                          : pct >= 50
                            ? "bg-teal-400"
                            : pct >= 25
                              ? "bg-teal-300"
                              : pct > 0
                                ? "bg-teal-200"
                                : "bg-muted";
                      return (
                        <td key={dayIdx} className="px-1 py-1">
                          <div
                            className={`h-6 w-6 rounded ${shade}`}
                            title={`${MISSION_LABELS[code]}: ${pct}%`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Pendientes críticos */}
        <section className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title="Pendientes críticos"
          description="Pacientes con 0 misiones completadas hoy"
          icon={AlertTriangle}
          variant="primary"
        />
        {pendientes_criticos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <AlertTriangle className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No hay pacientes pendientes hoy.
            </p>
          </div>
        ) : (
          <>
            <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden text-right md:table-cell lg:hidden">
                  Semana
                </TableHead>
                <TableHead className="w-20 text-right">Pendientes</TableHead>
                <TableHead className="w-16 text-center">Misiones</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientesItems.map((p) => (
                <TableRow key={p.patient_id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-xs font-bold text-destructive">
                        {initials(p.patient_name)}
                      </span>
                      {p.patient_id ? (
                        <Link
                          href={`/program/patients/${p.patient_id}`}
                          className="truncate text-sm font-medium hover:text-primary hover:underline cursor-pointer"
                        >
                          {p.patient_name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-medium">
                          {p.patient_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums md:table-cell lg:hidden">
                    {p.current_week}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-destructive">
                    {p.pending_tasks}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-destructive-soft text-destructive text-[11px]">
                      0/6
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      title="Enviar recordatorio"
                      onClick={() =>
                        toast(
                          `Recordatorio enviado a ${p.patient_name}`,
                          "success",
                        )
                      }
                    >
                      <Bell className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            <PagedListFooter
              page={pendientesSafePage}
              totalPages={pendientesTotalPages}
              onPageChange={setPendientesPage}
              pageSize={pendientesPageSize}
              onPageSizeChange={(size) => {
                setPendientesPageSize(size);
                setPendientesPage(1);
              }}
            />
          </>
        )}
        </section>
        </div>
      </section>
    </div>
  );
}

// --- Skeleton & Error ---

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <Skeleton className="h-5 w-28 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border py-3 last:border-0"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full rounded" />
        </div>
      </div>
    </div>
  );
}

function TodayError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        Error al cargar la actividad
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
