"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, X } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import {
  STATE_NAMES,
  USA_STATE_PATHS,
  USA_VIEWBOX,
} from "@/lib/geo/usa-states-paths";
import type { PatientDashboardStateSlice } from "../types";

const SCALE = ["#e8f1fa", "#bcd9f2", "#7fb5e6", "#3f81c2", "#123b63"];

function colorFor(count: number, max: number): string {
  if (max <= 0) return SCALE[0];
  const ratio = count / max;
  if (ratio <= 0.15) return SCALE[0];
  if (ratio <= 0.4) return SCALE[1];
  if (ratio <= 0.7) return SCALE[2];
  if (ratio < 1) return SCALE[3];
  return SCALE[4];
}

/**
 * Mapa coroplético de pacientes por estado de EE. UU. (paleta de marca),
 * toggle Cantidad/Porcentaje, selección por clic o teclado y lista de estados
 * principales. La selección filtra el Resumen y el Directorio vía URL.
 */
export function PatientGeoView({
  states,
  selected,
  onSelect,
  loading,
}: {
  states: PatientDashboardStateSlice[];
  selected: string | null;
  onSelect: (code: string | null) => void;
  loading: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"count" | "pct">("count");
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const byCode = useMemo(
    () => new Map(states.map((state) => [state.code.toUpperCase(), state])),
    [states],
  );
  const max = useMemo(
    () => states.reduce((top, state) => Math.max(top, state.count), 0),
    [states],
  );
  const top = useMemo(
    () => [...states].sort((a, b) => b.count - a.count).slice(0, 10),
    [states],
  );

  const handleSelect = (code: string) => {
    onSelect(selected === code ? null : code);
  };

  const handleKey = (event: KeyboardEvent, code: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(code);
    }
    if (event.key === "Escape") onSelect(null);
  };

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-muted/40" />
        <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <section className="patient-map-card flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Distribución geográfica — EE. UU.")}
          description={t("Pacientes por estado · total del alcance")}
          icon={MapPin}
          variant="primary"
          actions={
            <ToggleGroup
              value={[mode]}
              onValueChange={(values) => {
                const next = values[0];
                if (next === "count" || next === "pct") setMode(next);
              }}
              aria-label={t("Métrica del mapa")}
            >
              <ToggleGroupItem
                value="count"
                className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
              >
                {t("Cantidad")}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="pct"
                className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
              >
                {t("Porcentaje")}
              </ToggleGroupItem>
            </ToggleGroup>
          }
        />
        <div ref={containerRef} className="relative p-4">
          {selected && (
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                {STATE_NAMES[selected] ?? selected}
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  aria-label={t("Quitar filtro de estado")}
                  className="rounded-full p-0.5 hover:bg-primary/10"
                >
                  <X className="size-3" />
                </button>
              </span>
            </div>
          )}
          <svg
            viewBox={USA_VIEWBOX}
            role="img"
            aria-label={t("Mapa de pacientes por estado de EE. UU.")}
            className="h-auto max-h-[430px] w-full"
          >
            {Object.entries(USA_STATE_PATHS).map(([abbr, d]) => {
              const state = byCode.get(abbr);
              const isSelected = selected === abbr;
              const isHovered = hovered === abbr;
              return (
                <g
                  key={abbr}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={
                    state
                      ? `${STATE_NAMES[abbr] ?? abbr}: ${state.count} ${t("pacientes")} (${state.percentage.toFixed(1)}%)`
                      : `${STATE_NAMES[abbr] ?? abbr}: ${t("sin pacientes")}`
                  }
                  className="cursor-pointer outline-none focus-visible:opacity-90"
                  onMouseEnter={(event) => {
                    setHovered(abbr);
                    const rect = containerRef.current?.getBoundingClientRect();
                    setTooltip(
                      rect
                        ? {
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top,
                          }
                        : null,
                    );
                  }}
                  onMouseMove={(event) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect)
                      setTooltip({
                        x: event.clientX - rect.left,
                        y: event.clientY - rect.top,
                      });
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    setTooltip(null);
                  }}
                  onClick={() => state && handleSelect(abbr)}
                  onKeyDown={(event) => state && handleKey(event, abbr)}
                >
                  <path
                    d={d}
                    fill={state ? colorFor(state.count, max) : "#e5e7eb"}
                    stroke={isSelected ? "#123b63" : "#ffffff"}
                    strokeWidth={isSelected ? 1.6 : 0.8}
                    style={{
                      filter: isHovered ? "brightness(0.93)" : undefined,
                      transition: "fill 200ms ease-out",
                    }}
                  />
                  <title>
                    {state
                      ? `${STATE_NAMES[abbr] ?? abbr} — ${state.count} ${t("pacientes")} (${state.percentage.toFixed(1)}%)`
                      : `${STATE_NAMES[abbr] ?? abbr} — ${t("sin pacientes")}`}
                  </title>
                </g>
              );
            })}
          </svg>

          {hovered && tooltip && (
            <div
              className="pointer-events-none absolute z-20 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
              style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
            >
              <p className="font-semibold text-foreground">
                {STATE_NAMES[hovered] ?? hovered}
              </p>
              {byCode.get(hovered) ? (
                <>
                  <p className="text-muted-foreground">
                    {byCode.get(hovered)!.count} {t("pacientes")} ·{" "}
                    {byCode.get(hovered)!.percentage.toFixed(1)}%
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {t("Haz clic para filtrar")}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">{t("Sin pacientes")}</p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{t("Menos")}</span>
              <span className="flex">
                {SCALE.map((color) => (
                  <span
                    key={color}
                    className="size-3.5 border border-white/70"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ))}
              </span>
              <span>{t("Más pacientes")}</span>
            </div>
            <span>{t("Haz clic en un estado para filtrar la vista")}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Top estados")}
          description={t("Por volumen de pacientes")}
          icon={MapPin}
          variant="primary"
        />
        <div className="flex flex-col gap-1 p-4">
          {top.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {t("Sin pacientes con estado registrado en el alcance.")}
            </p>
          ) : (
            top.map((state) => (
              <button
                key={state.code}
                type="button"
                onClick={() => handleSelect(state.code)}
                aria-pressed={selected === state.code}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  selected === state.code
                    ? "bg-primary-soft"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="flex-1 truncate text-sm font-medium">
                  {STATE_NAMES[state.code] ?? state.name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {state.code}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {state.percentage.toFixed(1)}%
                </span>
                <span className="w-10 text-right text-sm font-bold tabular-nums">
                  {state.count}
                </span>
              </button>
            ))
          )}
          {selected && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onSelect(null)}
            >
              <X data-icon="inline-start" />
              {t("Limpiar filtro")}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
