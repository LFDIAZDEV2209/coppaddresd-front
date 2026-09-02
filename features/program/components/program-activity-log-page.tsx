"use client";

import { useState, useEffect } from "react";
import {
  History,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLog } from "../hooks/use-activity-log";
import type { ActivityLogEntry } from "../types";

// --- Catálogo de tablas del módulo (espejo del whitelist del backend) ---

const TABLE_LABELS: Record<string, string> = {
  program_templates: "Plantillas",
  weekly_day_templates: "Tareas de plantilla",
  program_enrollments: "Inscripciones",
  program_weeks: "Semanas",
  daily_checkins: "Check-ins diarios",
  task_completions: "Completaciones",
  xp_rules: "Reglas XP",
  xp_ledger: "Libro mayor XP",
  streak_states: "Estado de racha",
  streak_freezes: "Congelamientos",
  clinical_baselines: "Líneas base",
  health_score_weights: "Pesos del Índice",
  health_scores: "Índice de Salud",
  transformation_scores: "Índice de Transformación",
  clinical_xp_reviews: "Revisiones clínicas XP",
  adaptation_recommendations: "Adaptaciones",
  habit_templates: "Plantillas de hábitos",
  habit_checks: "Registros de hábitos",
  emotional_records: "Registros emocionales",
  notifications: "Notificaciones",
  weaknesses: "Debilidades",
  interventions: "Intervenciones",
};

const ACTION_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Plus }
> = {
  INSERT: {
    label: "Creación",
    className: "bg-success-soft text-success-foreground",
    icon: Plus,
  },
  UPDATE: {
    label: "Actualización",
    className: "bg-info-soft text-info-foreground",
    icon: Pencil,
  },
  DELETE: {
    label: "Eliminación",
    className: "bg-destructive-soft text-destructive",
    icon: Trash2,
  },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tableLabel(table: string): string {
  return TABLE_LABELS[table] ?? table;
}

// --- Componente principal ---

export function ProgramActivityLogPage() {
  const {
    result,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    setPageSize,
    retry,
  } = useActivityLog();

  const [actorSearch, setActorSearch] = useState(filters.actor ?? "");
  const [tableFilter, setTableFilter] = useState(filters.table ?? "");
  const [actionFilter, setActionFilter] = useState(filters.action ?? "");
  const [fromFilter, setFromFilter] = useState(filters.from ?? "");
  const [toFilter, setToFilter] = useState(filters.to ?? "");

  // Debounce del filtro de actor: aplica 400 ms después de dejar de escribir.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        table: tableFilter || undefined,
        action: actionFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        actor: actorSearch.trim() || undefined,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    actorSearch,
    tableFilter,
    actionFilter,
    fromFilter,
    toFilter,
    setFilters,
  ]);

  const clearFilters = () => {
    setTableFilter("");
    setActionFilter("");
    setFromFilter("");
    setToFilter("");
    setActorSearch("");
  };

  const hasFilters =
    tableFilter || actionFilter || fromFilter || toFilter || actorSearch;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Bitácora de actividad"
        description="Auditoría de las acciones sobre las tablas del programa"
        icon={History}
      />

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Filtros de la bitácora"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Bitácora</h2>
            <p className="text-xs text-muted-foreground">
              Registro de auditoría (audit.activity_logs) de las tablas del
              módulo programa.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={loading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Filtrar por actor (email)..."
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              aria-label="Filtrar por actor"
            />
          </div>
          <select
            className="h-9 min-w-[170px] flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-none"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            aria-label="Filtrar por tabla"
          >
            <option value="">Todas las tablas</option>
            {Object.entries(TABLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-none"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filtrar por acción"
          >
            <option value="">Todas las acciones</option>
            <option value="INSERT">Creación</option>
            <option value="UPDATE">Actualización</option>
            <option value="DELETE">Eliminación</option>
          </select>
          <div className="flex min-w-[260px] flex-1 gap-2 md:flex-none">
            <input
              type="date"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={fromFilter}
              max={toFilter || undefined}
              onChange={(e) => setFromFilter(e.target.value)}
              aria-label="Desde"
            />
            <input
              type="date"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={toFilter}
              min={fromFilter || undefined}
              onChange={(e) => setToFilter(e.target.value)}
              aria-label="Hasta"
            />
          </div>
        </div>
        {hasFilters && (
          <div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </section>

      {/* Contenido */}
      {loading ? (
        <ActivityLogSkeleton />
      ) : error ? (
        <ActivityLogErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "registro" : "registros"}`}
            description="La más reciente primero"
            icon={History}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Tabla</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Registro
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((entry) => (
                  <ActivityLogRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <ActivityLogEmptyState />
      )}

      {/* Paginación */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          <span>
            Página {result.page} de {result.totalPages}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={result.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Registros por página"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Filas ---

function ActivityLogRow({ entry }: { entry: ActivityLogEntry }) {
  const action = ACTION_CONFIG[entry.action] ?? {
    label: entry.action,
    className: "bg-muted text-muted-foreground",
    icon: History,
  };
  const Icon = action.icon;

  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {formatDateTime(entry.occurredAt)}
      </TableCell>
      <TableCell>
        <Badge className={action.className}>
          <Icon className="mr-1 size-3" />
          {action.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {tableLabel(entry.tableName)}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {entry.tableName}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden max-w-40 truncate font-mono text-xs text-muted-foreground md:table-cell">
        {entry.recordId}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {entry.actorEmail ?? "Sistema"}
          </span>
          {entry.actorRole && (
            <span className="truncate text-xs text-muted-foreground">
              {entry.actorRole}
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// --- Skeleton / Error / Empty ---

function ActivityLogSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-40 md:block" />
        </div>
      ))}
    </div>
  );
}

function ActivityLogErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar la bitácora
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function ActivityLogEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <History className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Sin registros de actividad</p>
        <p className="text-xs text-muted-foreground">
          Las acciones sobre las tablas del programa aparecerán aquí. Ajusta
          los filtros si esperabas resultados.
        </p>
      </div>
    </div>
  );
}
