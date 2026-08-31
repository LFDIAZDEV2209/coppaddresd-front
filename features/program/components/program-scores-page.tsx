"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";
import { useScores } from "../hooks/use-scores";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { PaginatedResult } from "../types";

// --- Types locales ---

interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  medicalRecordNumber: string | null;
}

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

// --- Constantes de dimensiones ---

const DIMENSION_LABELS: Record<string, string> = {
  adherence: "Adherencia",
  clinical: "Clínico",
  nutrition: "Nutrición",
  psychology: "Psicología",
  exercise: "Ejercicio",
};

const DIMENSION_COLORS: Record<string, string> = {
  adherence: "bg-blue-500",
  clinical: "bg-green-500",
  nutrition: "bg-amber-500",
  psychology: "bg-purple-500",
  exercise: "bg-rose-500",
};

// --- Componente principal ---

export function ProgramScoresPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const { result, loading, error, calculate, clear } = useScores();

  // Patient picker state
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PickerItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Debounced patient search
  useEffect(() => {
    if (patientSearch.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLoadingPatients(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "10",
          search: patientSearch.trim(),
        });
        const result = await apiFetch<PaginatedResult<PatientListItem>>(
          `${env.apiUrl}/api/v1/patients?${params.toString()}`,
        );
        setPatientResults(
          result.data.map((p) => ({
            id: p.id,
            label: `${p.firstName} ${p.lastName}`,
            sublabel: p.email ?? p.medicalRecordNumber ?? undefined,
          })),
        );
      } catch {
        setPatientResults([]);
      } finally {
        setLoadingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleSelectPatient = useCallback((p: PickerItem) => {
    setPatientId(p.id);
    setPatientLabel(p.label);
    setPatientSearch("");
    setPatientResults([]);
  }, []);

  const handleClearPatient = useCallback(() => {
    setPatientId(null);
    setPatientLabel("");
    clear();
  }, [clear]);

  const handleCalculate = useCallback(() => {
    if (patientId) calculate(patientId);
  }, [patientId, calculate]);

  const handleRetry = useCallback(() => {
    if (patientId) calculate(patientId);
  }, [patientId, calculate]);

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Activity className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Acceso restringido</p>
          <p className="text-xs text-muted-foreground">
            No tienes permiso para ver los scores del programa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Scores del programa"
        description="Consulta el índice de salud y transformación de un paciente"
        icon={BarChart3}
      />

      {/* Selector de paciente + acción */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Selector de paciente"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Paciente</h2>
            <p className="text-xs text-muted-foreground">
              Selecciona un paciente para calcular sus scores.
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            disabled={!patientId || loading}
            onClick={handleCalculate}
          >
            {loading ? "Calculando..." : "Calcular scores"}
          </Button>
        </div>

        {/* Patient picker */}
        <div className="flex flex-col gap-2">
          {patientId ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
              <span className="flex-1 text-sm font-medium">
                {patientLabel}
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={handleClearPatient}
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente por nombre..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setPatientId(null);
                    setPatientLabel("");
                    setPatientResults([]);
                  }}
                  className="h-9 pl-8"
                />
              </div>
              {loadingPatients && (
                <p className="text-xs text-muted-foreground">Buscando...</p>
              )}
              {patientResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <span>{p.label}</span>
                      {p.sublabel && (
                        <span className="text-xs text-muted-foreground">
                          {p.sublabel}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {patientSearch.length >= 2 &&
                !loadingPatients &&
                patientResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No se encontraron pacientes.
                  </p>
                )}
            </>
          )}
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <ScoresSkeleton />
      ) : error ? (
        <ScoresErrorState message={error} onRetry={handleRetry} />
      ) : result ? (
        <ScoresDisplay data={result} />
      ) : (
        <ScoresEmptyState />
      )}
    </div>
  );
}

// --- Sub-componentes ---

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="size-4 text-green-600" />;
    case "down":
      return <TrendingDown className="size-4 text-red-600" />;
    default:
      return <Minus className="size-4 text-muted-foreground" />;
  }
}

function TrendBadge({ trend }: { trend: string }) {
  const config = {
    up: { label: "Mejorando", className: "bg-green-100 text-green-800" },
    down: { label: "Empeorando", className: "bg-red-100 text-red-800" },
    stable: { label: "Estable", className: "bg-gray-100 text-gray-800" },
  } as const;

  const c = config[trend as keyof typeof config] ?? config.stable;
  return (
    <Badge className={c.className}>
      <TrendIcon trend={trend} />
      {c.label}
    </Badge>
  );
}

function DimensionBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium">{value}</span>
    </div>
  );
}

function ScoresDisplay({ data }: { data: import("../types/scores").ScoresResponse }) {
  const { healthScore, transformationScore } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Health Score */}
      <section
        className="rounded-2xl border border-border bg-card p-5"
        aria-label="Índice de Salud"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Índice de Salud</h3>
          <TrendBadge trend={healthScore.trend} />
        </div>

        <div className="flex items-baseline gap-4 mb-5">
          <span className="text-4xl font-bold tabular-nums">
            {healthScore.current}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          {healthScore.previous !== null && (
            <span className="text-xs text-muted-foreground">
              anterior: {healthScore.previous}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(healthScore.dimensions).map(([key, value]) => (
            <DimensionBar
              key={key}
              label={DIMENSION_LABELS[key] ?? key}
              value={value}
              color={DIMENSION_COLORS[key] ?? "bg-gray-500"}
            />
          ))}
        </div>
      </section>

      {/* Transformation Score */}
      <section
        className="rounded-2xl border border-border bg-card p-5"
        aria-label="Índice de Transformación"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Índice de Transformación</h3>
            <Badge variant="outline" className="text-xs">
              Semana {transformationScore.week}
            </Badge>
          </div>
          <TrendBadge trend={transformationScore.trend} />
        </div>

        <div className="flex items-baseline gap-4 mb-5">
          <span className="text-4xl font-bold tabular-nums">
            {transformationScore.current}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          {transformationScore.previous !== null && (
            <span className="text-xs text-muted-foreground">
              anterior: {transformationScore.previous}
            </span>
          )}
        </div>

        {/* Tabla de indicadores */}
        {Object.keys(transformationScore.detail).length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-center">Favorable</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(transformationScore.detail).map(
                  ([code, detail]) => (
                    <TableRow key={code}>
                      <TableCell className="font-medium text-sm">
                        {code}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {detail.baseline} {detail.unit}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">
                        {detail.current} {detail.unit}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        <span
                          className={
                            detail.delta > 0
                              ? "text-green-600"
                              : detail.delta < 0
                                ? "text-red-600"
                                : ""
                          }
                        >
                          {detail.delta > 0 ? "+" : ""}
                          {detail.delta}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        <span
                          className={
                            detail.deltaPct > 0
                              ? "text-green-600"
                              : detail.deltaPct < 0
                                ? "text-red-600"
                                : ""
                          }
                        >
                          {detail.deltaPct > 0 ? "+" : ""}
                          {detail.deltaPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {detail.favorable ? (
                          <span className="text-green-600 text-sm">✓</span>
                        ) : (
                          <span className="text-red-600 text-sm">✗</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {detail.score}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No hay indicadores disponibles para esta semana.
          </p>
        )}
      </section>
    </div>
  );
}

function ScoresSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-20 mb-5" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-20 mb-5" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoresErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos calcular los scores
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function ScoresEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <BarChart3 className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Selecciona un paciente</p>
        <p className="text-xs text-muted-foreground">
          Busca y selecciona un paciente para ver sus scores de salud y
          transformación.
        </p>
      </div>
    </div>
  );
}
