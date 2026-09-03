"use client";

// Componentes compartidos de visualización de scores del programa.
// Extraídos de program-scores-page.tsx para reutilizarse en el panel del
// paciente (EnrollmentScoresTab) y en la página de scores original.

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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
import type { ScoresResponse } from "../types/scores";

// --- Constantes de dimensiones ---

export const DIMENSION_LABELS: Record<string, string> = {
  adherence: "Adherencia",
  clinical: "Clínico",
  nutrition: "Nutrición",
  psychology: "Psicología",
  exercise: "Ejercicio",
};

export const DIMENSION_COLORS: Record<string, string> = {
  adherence: "bg-blue-500",
  clinical: "bg-green-500",
  nutrition: "bg-amber-500",
  psychology: "bg-purple-500",
  exercise: "bg-rose-500",
};

// --- Sub-componentes ---

export function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="size-4 text-green-600" />;
    case "down":
      return <TrendingDown className="size-4 text-red-600" />;
    default:
      return <Minus className="size-4 text-muted-foreground" />;
  }
}

export function TrendBadge({ trend }: { trend: string }) {
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

export function DimensionBar({
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

export function ScoresDisplay({ data }: { data: ScoresResponse }) {
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

export function ScoresSkeleton() {
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

export function ScoresErrorState({
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