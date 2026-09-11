"use client";

import { useState, useRef, useCallback } from "react";
import { useT } from "@/providers/i18n-provider";
import {
  USA_STATE_PATHS,
  USA_VIEWBOX,
  STATE_NAMES,
} from "@/lib/geo/usa-states-paths";
import type { HealthGeoCity } from "../../services/health-geo-service";
import type { HealthGeoFilter } from "../../types";
import { mapRiskColor, mapRiskPalette } from "../shared/colors";

interface StateAgg {
  highRiskPct: number | null;
  avgScore: number | null;
  totalCount: number;
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
        cities: [],
      };
    map[key].cities.push(c);
    map[key].totalCount += c.count;
  }
  for (const agg of Object.values(map)) {
    const validRisk = agg.cities.filter((c) => c.highRiskPct != null);
    if (validRisk.length > 0)
      agg.highRiskPct =
        validRisk.reduce((s, c) => s + c.highRiskPct!, 0) / validRisk.length;
    const validScore = agg.cities.filter((c) => c.avgScore != null);
    if (validScore.length > 0)
      agg.avgScore =
        validScore.reduce((s, c) => s + c.avgScore!, 0) / validScore.length;
  }
  return map;
}

interface Props {
  cities: HealthGeoCity[];
  /** Filtro geo controlado por el dashboard (estado o ciudad). */
  value?: HealthGeoFilter;
  onFilterChange?: (filter: HealthGeoFilter) => void;
}

export function HealthTestsUsaMap({ cities, value, onFilterChange }: Props) {
  const t = useT();
  const [hovered, setHovered] = useState<string | null>(null);
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const stateData = aggregateByState(cities);

  const activeState = value?.stateCode
    ? value.stateCode.toUpperCase()
    : value?.cityId
      ? (cities
          .find((c) => c.cityId === value.cityId)
          ?.stateAbbr?.toUpperCase() ?? null)
      : null;
  const hasActiveFilter = Boolean(value?.stateCode || value?.cityId);

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

  const handlePathClick = useCallback(
    (abbr: string) => {
      const agg = stateData[abbr];
      if (!agg || agg.cities.length === 0) return;
      setPopoverFor((prev) => (prev === abbr ? null : abbr));
    },
    [stateData],
  );

  const handleCityClick = useCallback(
    (city: HealthGeoCity) => {
      if (!city.cityId) return;
      onFilterChange?.({ stateCode: city.stateAbbr ?? null, cityId: city.cityId });
      setPopoverFor(null);
    },
    [onFilterChange],
  );

  const handleStateTodosClick = useCallback(() => {
    if (!popoverFor) return;
    onFilterChange?.({ stateCode: popoverFor, cityId: null });
    setPopoverFor(null);
  }, [popoverFor, onFilterChange]);

  const handleClearFilter = useCallback(() => {
    onFilterChange?.({ stateCode: null, cityId: null });
    setPopoverFor(null);
  }, [onFilterChange]);

  const handlePathKeyDown = useCallback(
    (e: React.KeyboardEvent, abbr: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlePathClick(abbr);
      } else if (e.key === "Escape") {
        setPopoverFor(null);
      }
    },
    [handlePathClick],
  );

  const hoveredData = hovered ? stateData[hovered] : null;
  const popoverData = popoverFor ? stateData[popoverFor] : null;

  const tooltipStyle: React.CSSProperties = (() => {
    const width = 200;
    const height = 112;
    const pad = 8;
    if (typeof window === "undefined")
      return { left: tooltipPos.x + 14, top: tooltipPos.y - 12 };
    return {
      left: Math.max(pad, Math.min(tooltipPos.x + 14, window.innerWidth - width - pad)),
      top: Math.max(pad, Math.min(tooltipPos.y - 12, window.innerHeight - height - pad)),
    };
  })();

  return (
    <div className="relative flex w-full flex-col items-center rounded-xl">
      <svg
        ref={svgRef}
        viewBox={USA_VIEWBOX}
        className="h-[360px] w-full rounded-xl"
        role="img"
        aria-label={t("Mapa de riesgo por estado")}
        onMouseMove={handleMouseMove}
      >
        {Object.entries(USA_STATE_PATHS).map(([abbr, d]) => {
          const agg = stateData[abbr];
          const pct = agg?.highRiskPct ?? null;
          const isHovered = hovered === abbr;
          const isPopover = popoverFor === abbr;
          const isActive = activeState === abbr;
          const dimmed = hasActiveFilter && !isActive;
          return (
            <path
              key={abbr}
              d={d}
              fill={mapRiskColor(pct)}
              stroke={isActive ? "var(--primary)" : "#FFFFFF"}
              strokeWidth={isActive ? 1.6 : 0.9}
              role="button"
              tabIndex={0}
              aria-label={`${STATE_NAMES[abbr] ?? abbr}. ${
                pct != null
                  ? t("Alto riesgo: {value}%", { value: pct.toFixed(1) })
                  : t("Sin datos")
              }`}
              className="cursor-pointer outline-none transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
              style={{
                opacity: dimmed ? 0.45 : 1,
                filter: isHovered
                  ? "brightness(0.97) saturate(1.15) drop-shadow(0 2px 3px rgba(15, 42, 71, 0.25))"
                  : isPopover
                    ? "drop-shadow(0 2px 4px rgba(15, 42, 71, 0.18))"
                    : undefined,
              }}
              onMouseEnter={() => setHovered(abbr)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handlePathClick(abbr)}
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
      </svg>

      {hovered && !popoverFor && (
        <div
          className="pointer-events-none fixed z-50 w-[200px] rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm"
          style={tooltipStyle}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-foreground">
              {STATE_NAMES[hovered] ?? hovered}
            </p>
            <span
              className="size-2.5 shrink-0 rounded-full ring-1 ring-black/5"
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
                  : t("Sin datos")}
              </span>
              <span>{patientsLabel(hoveredData.totalCount)}</span>
              {hoveredData.avgScore != null && (
                <span>
                  {t("Score promedio: {value}", {
                    value: hoveredData.avgScore.toFixed(0),
                  })}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("Sin datos")}
            </p>
          )}
        </div>
      )}

      {popoverFor && popoverData && (
        <div className="absolute left-1/2 top-1/2 z-50 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {STATE_NAMES[popoverFor] ?? popoverFor}
            </p>
            <span
              className="size-2.5 shrink-0 rounded-full ring-1 ring-black/5"
              style={{
                backgroundColor: mapRiskColor(popoverData.highRiskPct),
              }}
            />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {popoverData.highRiskPct != null
              ? t("Alto riesgo: {value}%", {
                  value: popoverData.highRiskPct.toFixed(1),
                })
              : t("Sin datos")}{" "}
            · {patientsLabel(popoverData.totalCount)}
          </p>
          <div className="mt-2 flex max-h-44 flex-col gap-0.5 overflow-y-auto">
            {[...popoverData.cities]
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <button
                  key={c.cityId ?? c.name}
                  type="button"
                  disabled={!c.cityId}
                  onClick={() => handleCityClick(c)}
                  className="flex items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                    {c.count}
                  </span>
                </button>
              ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={handleStateTodosClick}
              className="flex-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("Ver todos en {state}", {
                state: STATE_NAMES[popoverFor] ?? popoverFor,
              })}
            </button>
            <button
              type="button"
              onClick={handleClearFilter}
              className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
              title={t("Limpiar filtro")}
              aria-label={t("Limpiar filtro")}
            >
              ✕
            </button>
          </div>
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
