"use client";

import { useState, useMemo, useCallback } from "react";
import { MousePointerClick } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import {
  USA_STATE_PATHS,
  USA_VIEWBOX,
  STATE_NAMES,
} from "@/lib/geo/usa-states-paths";
import type { HealthGeoCity } from "../../services/health-geo-service";
import { mapRiskColor, mapRiskPalette } from "../shared/colors";

/** Realce suave del hover y anillo doble de selección (sin glow neón). */
const HOVER_STROKE = "#334155";
const SELECTED_STROKE = "var(--primary)";
const SELECTED_HALO_OPACITY = 0.18;

interface StateAgg {
  highRiskPct: number | null;
  avgScore: number | null;
  totalCount: number;
  evaluatedCount: number;
  cities: HealthGeoCity[];
}

function aggregateByState(cities: HealthGeoCity[]): Record<string, StateAgg> {
  const map: Record<string, StateAgg> = {};
  for (const c of cities) {
    if (!c.stateAbbr) continue;
    const key = c.stateAbbr.toUpperCase();
    if (!map[key])
      map[key] = {
        highRiskPct: null,
        avgScore: null,
        totalCount: 0,
        evaluatedCount: 0,
        cities: [],
      };
    const agg = map[key];
    agg.cities.push(c);
    agg.totalCount += c.count;
    agg.evaluatedCount += c.evaluatedCount;
  }
  for (const agg of Object.values(map)) {
    // % ponderado por pacientes evaluados (Σ altos / Σ evaluados); sin
    // evaluaciones queda null → gris "Sin datos" (nunca un 0% engañoso).
    if (agg.evaluatedCount > 0) {
      const highCount = agg.cities.reduce(
        (s, c) => s + ((c.highRiskPct ?? 0) / 100) * c.evaluatedCount,
        0,
      );
      agg.highRiskPct = (highCount / agg.evaluatedCount) * 100;
    }
    if (agg.evaluatedCount > 0) {
      agg.avgScore =
        agg.cities.reduce(
          (s, c) => s + (c.avgScore ?? 0) * c.evaluatedCount,
          0,
        ) / agg.evaluatedCount;
    }
  }
  return map;
}

interface Props {
  cities: HealthGeoCity[];
  /** Códigos de estado seleccionados (multi-selección: la unión acota los charts). */
  selectedStates?: string[];
  onToggleState?: (stateCode: string) => void;
  /** Limpia la selección completa (tecla Escape). */
  onClear?: () => void;
}

export function HealthTestsUsaMap({
  cities,
  selectedStates,
  onToggleState,
  onClear,
}: Props) {
  const t = useT();
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const stateData = aggregateByState(cities);
  const selected = useMemo(
    () => new Set((selectedStates ?? []).map((s) => s.toUpperCase())),
    [selectedStates],
  );
  const hasSelection = selected.size > 0;

  const patientsLabel = useCallback(
    (count: number) =>
      count === 1
        ? t("{count} paciente", { count: String(count) })
        : t("{count} pacientes", { count: String(count) }),
    [t],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleToggle = useCallback(
    (abbr: string) => {
      const agg = stateData[abbr];
      if (!agg || agg.cities.length === 0) return;
      onToggleState?.(abbr);
    },
    [stateData, onToggleState],
  );

  const handlePathKeyDown = useCallback(
    (e: React.KeyboardEvent, abbr: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle(abbr);
      } else if (e.key === "Escape" && hasSelection) {
        onClear?.();
      }
    },
    [handleToggle, hasSelection, onClear],
  );

  const hoveredData = hovered ? stateData[hovered] : null;
  const hoveredSelected = hovered ? selected.has(hovered) : false;

  const tooltipStyle: React.CSSProperties = (() => {
    const width = 220;
    const height = 155;
    const pad = 8;
    if (typeof window === "undefined")
      return { left: tooltipPos.x + 14, top: tooltipPos.y - 12 };
    return {
      left: Math.max(
        pad,
        Math.min(tooltipPos.x + 14, window.innerWidth - width - pad),
      ),
      top: Math.max(
        pad,
        Math.min(tooltipPos.y - 12, window.innerHeight - height - pad),
      ),
    };
  })();

  return (
    <div className="relative flex w-full flex-col items-center rounded-xl">
      <svg
        viewBox={USA_VIEWBOX}
        className="h-[360px] w-full rounded-xl"
        role="img"
        aria-label={t("Mapa de riesgo por estado")}
        onMouseMove={handleMouseMove}
      >
        {Object.entries(USA_STATE_PATHS).map(([abbr, d]) => {
          const agg = stateData[abbr];
          const pct = agg?.highRiskPct ?? null;
          const interactive = Boolean(agg && agg.cities.length > 0);
          const isHovered = hovered === abbr;
          const isSelected = selected.has(abbr);
          const dimmed = hasSelection && !isSelected;

          // Hover: elevación sutil con borde pizarra. Selección: separación
          // blanca + anillo primary superpuesto (ver <g> al final del svg).
          const stroke = isHovered ? HOVER_STROKE : "#FFFFFF";
          const strokeWidth = isHovered ? 1.75 : isSelected ? 1.5 : 0.9;
          const filter = isHovered
            ? "brightness(1.04) drop-shadow(0 2px 5px rgb(15 23 42 / 0.22))"
            : isSelected
              ? "brightness(1.02)"
              : undefined;

          return (
            <path
              key={abbr}
              d={d}
              fill={mapRiskColor(pct)}
              stroke={stroke}
              strokeWidth={strokeWidth}
              role={interactive ? "button" : "img"}
              tabIndex={interactive ? 0 : -1}
              aria-label={`${STATE_NAMES[abbr] ?? abbr}. ${
                pct != null
                  ? t("Alto riesgo: {value}%", { value: pct.toFixed(1) })
                  : t("Sin datos")
              }`}
              className={`outline-none transition-all duration-200 ease-out motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)] ${
                interactive ? "cursor-pointer" : "cursor-default"
              }`}
              style={{
                opacity: dimmed ? 0.4 : 1,
                filter,
                // "Pop" sutil del estado bajo el cursor (origen en su propio centro).
                transformBox: isHovered ? "fill-box" : undefined,
                transformOrigin: isHovered ? "center" : undefined,
                transform: isHovered ? "scale(1.015)" : undefined,
              }}
              onMouseEnter={() => setHovered(abbr)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleToggle(abbr)}
              onKeyDown={(e) => handlePathKeyDown(e, abbr)}
            >
              <title>
                {STATE_NAMES[abbr] ?? abbr} —{" "}
                {pct != null
                  ? t("Alto riesgo: {value}%", { value: pct.toFixed(1) })
                  : t("Sin datos")}{" "}
                {agg ? `(${patientsLabel(agg.totalCount)})` : ""}
              </title>
            </path>
          );
        })}
        {/* Anillo de selección sobre el resto: halo tenue + contorno primary.
            Se dibuja al final para que ningún estado vecino lo recorte y se
            anima con un pop sutil al agregar/estrenar la selección. */}
        {hasSelection && (
          <g pointerEvents="none" aria-hidden="true">
            {[...selected].map((abbr) => {
              const d = USA_STATE_PATHS[abbr];
              if (!d) return null;
              return (
                <g
                  key={abbr}
                  className="animate-select-ring-in motion-reduce:animate-none"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                >
                  <path
                    d={d}
                    fill="none"
                    stroke={SELECTED_STROKE}
                    strokeWidth={6}
                    strokeLinejoin="round"
                    opacity={SELECTED_HALO_OPACITY}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={SELECTED_STROKE}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none fixed z-50 w-[220px] animate-in fade-in zoom-in-95 rounded-xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/5 backdrop-blur-sm duration-150"
          style={tooltipStyle}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-foreground">
              {STATE_NAMES[hovered] ?? hovered}
            </p>
            <span
              className="size-2.5 shrink-0 rounded-full ring-1 ring-border"
              style={{
                backgroundColor: mapRiskColor(hoveredData?.highRiskPct ?? null),
              }}
            />
          </div>
          {hoveredData ? (
            <div className="mt-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
              <span>
                {hoveredData.highRiskPct != null
                  ? t("Alto riesgo: {value}%", {
                      value: hoveredData.highRiskPct.toFixed(1),
                    })
                  : t("Sin evaluaciones")}
              </span>
              <span>{patientsLabel(hoveredData.totalCount)}</span>
              <span>
                {t("{count} evaluados", {
                  count: String(hoveredData.evaluatedCount),
                })}
              </span>
              {hoveredData.avgScore != null && (
                <span>
                  {t("Score promedio: {value}", {
                    value: hoveredData.avgScore.toFixed(0),
                  })}
                </span>
              )}
              <span className="mt-1 flex items-center gap-1 border-t border-border pt-1.5 text-[10.5px] font-semibold text-primary">
                <MousePointerClick className="size-3 shrink-0" />
                {hoveredSelected
                  ? t("Clic para quitar del filtro")
                  : t("Clic para agregar al filtro")}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("Sin datos")}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex w-full flex-wrap justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-1.5 text-[11px] text-muted-foreground shadow-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: mapRiskPalette.low }}
            />
            &lt;20%
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: mapRiskPalette.medium }}
            />
            20–40%
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: mapRiskPalette.high }}
            />
            &gt;40%
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: mapRiskPalette.none }}
            />
            {t("Sin datos")}
          </span>
        </div>
      </div>
    </div>
  );
}
