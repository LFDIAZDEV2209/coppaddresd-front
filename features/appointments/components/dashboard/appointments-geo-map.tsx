"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/providers/i18n-provider";
import {
  STATE_NAMES,
  USA_STATE_PATHS,
  USA_VIEWBOX,
} from "@/lib/geo/usa-states-paths";
import type { AppointmentStateCountDto } from "../../types";

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
 * Mapa coroplético display-only de citas por estado de EE. UU. (paleta de
 * marca): toggle cantidad/porcentaje, tooltip y top-5. Sin selección ni
 * filtrado — es visualización del rango, no control.
 */
export function AppointmentsGeoMap({
  states,
  loading,
}: {
  states: AppointmentStateCountDto[];
  loading: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"count" | "pct">("count");
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const total = useMemo(
    () => states.reduce((sum, state) => sum + state.count, 0),
    [states],
  );
  const byCode = useMemo(
    () => new Map(states.map((state) => [state.code.toUpperCase(), state])),
    [states],
  );
  const max = useMemo(
    () => states.reduce((top, state) => Math.max(top, state.count), 0),
    [states],
  );
  const top = useMemo(
    () => [...states].sort((a, b) => b.count - a.count).slice(0, 5),
    [states],
  );
  const percentage = (count: number) => (total > 0 ? (count / total) * 100 : 0);

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
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Mapa de calor — Citas")}
          description={t("Citas por estado del paciente en el rango")}
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
          <svg
            viewBox={USA_VIEWBOX}
            role="img"
            aria-label={t("Mapa de citas por estado de EE. UU.")}
            className="h-auto max-h-[430px] w-full"
          >
            {Object.entries(USA_STATE_PATHS).map(([abbr, d]) => {
              const state = byCode.get(abbr);
              const isHovered = hovered === abbr;
              return (
                <g
                  key={abbr}
                  aria-label={
                    state
                      ? `${STATE_NAMES[abbr] ?? abbr}: ${state.count} ${t("citas")} (${percentage(state.count).toFixed(1)}%)`
                      : `${STATE_NAMES[abbr] ?? abbr}: ${t("sin citas")}`
                  }
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
                >
                  <path
                    d={d}
                    fill={state ? colorFor(state.count, max) : "#e5e7eb"}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    style={{
                      filter: isHovered ? "brightness(0.93)" : undefined,
                      transition: "fill 200ms ease-out",
                    }}
                  >
                    <title>
                      {state
                        ? `${STATE_NAMES[abbr] ?? abbr} — ${state.count} ${t("citas")} (${percentage(state.count).toFixed(1)}%)`
                        : `${STATE_NAMES[abbr] ?? abbr} — ${t("sin citas")}`}
                    </title>
                  </path>
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
                <p className="text-muted-foreground">
                  {mode === "count"
                    ? `${byCode.get(hovered)!.count} ${t("citas")}`
                    : `${percentage(byCode.get(hovered)!.count).toFixed(1)}%`}{" "}
                  · {percentage(byCode.get(hovered)!.count).toFixed(1)}%
                </p>
              ) : (
                <p className="text-muted-foreground">{t("Sin citas")}</p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
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
            <span>{t("Más citas")}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Top estados")}
          description={t("Por volumen de citas")}
          icon={MapPin}
          variant="primary"
        />
        <div className="flex flex-col gap-1 p-4">
          {top.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {t("Sin citas con estado registrado en el alcance.")}
            </p>
          ) : (
            top.map((state) => (
              <div
                key={state.code}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
              >
                <span className="flex-1 truncate text-sm font-medium">
                  {STATE_NAMES[state.code] ?? state.code}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {state.code}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {percentage(state.count).toFixed(1)}%
                </span>
                <span className="w-10 text-right text-sm font-bold tabular-nums">
                  {mode === "count"
                    ? state.count
                    : `${percentage(state.count).toFixed(1)}%`}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
