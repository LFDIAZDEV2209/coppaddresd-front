"use client";

import { chartGradient } from "@/lib/ui/rainbow";

import { chartColor, MAP_NO_DATA } from "@/lib/ui/rainbow";

import { useState, useRef, useCallback } from "react";
import type { BiometriaCityPoint } from "../types/erp";
import {
  USA_STATE_PATHS,
  USA_VIEWBOX,
  STATE_NAMES,
} from "@/lib/geo/usa-states-paths";

// IMC color bands
function getImcColor(avgImc: number | null): string {
  if (avgImc == null) return MAP_NO_DATA;
  if (avgImc < 25) return chartColor("green");
  if (avgImc < 30) return chartColor("amber");
  return chartColor("rose");
}

interface StateAgg {
  avgImc: number | null;
  totalCount: number;
  cities: BiometriaCityPoint[];
}

function aggregateByState(
  cities: BiometriaCityPoint[],
): Record<string, StateAgg> {
  const map: Record<string, StateAgg> = {};
  for (const c of cities) {
    if (!c.state_abbr) continue;
    const key = c.state_abbr.toUpperCase();
    if (!map[key]) {
      map[key] = { avgImc: null, totalCount: 0, cities: [] };
    }
    map[key].cities.push(c);
    map[key].totalCount += c.count;
  }
  // compute averages
  for (const agg of Object.values(map)) {
    const valid = agg.cities.filter((c) => c.avg_imc != null);
    if (valid.length > 0) {
      agg.avgImc = valid.reduce((sum, c) => sum + c.avg_imc!, 0) / valid.length;
    }
  }
  return map;
}

interface BiometriaUsaSvgMapProps {
  cities: BiometriaCityPoint[];
  onCitySelect?: (cityId: string | null, cityName?: string) => void;
  onStateSelect?: (stateAbbr: string | null, stateName?: string) => void;
}

export function BiometriaUsaSvgMap({
  cities,
  onCitySelect,
  onStateSelect,
}: BiometriaUsaSvgMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);

  const stateData = aggregateByState(cities);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePathClick = useCallback(
    (abbr: string) => {
      const agg = stateData[abbr];
      if (agg && agg.cities.length > 0) {
        setSelected(selected === abbr ? null : abbr);
      } else {
        setSelected(null);
        onCitySelect?.(null);
      }
    },
    [stateData, selected, onCitySelect],
  );

  const handleCityClick = useCallback(
    (cityId: string, cityName?: string) => {
      onCitySelect?.(cityId, cityName);
      setSelected(null);
    },
    [onCitySelect],
  );

  const handleStateTodosClick = useCallback(() => {
    if (!selected) return;
    onStateSelect?.(selected, STATE_NAMES[selected] ?? selected);
    setSelected(null);
  }, [selected, onStateSelect]);

  const handleClearFilter = useCallback(() => {
    onCitySelect?.(null);
    onStateSelect?.(null);
    setSelected(null);
  }, [onCitySelect, onStateSelect]);

  const hoveredData = hovered ? stateData[hovered] : null;
  const selectedData = selected ? stateData[selected] : null;

  return (
    <div className="relative w-full rounded-xl">
      <svg
        data-slot="chart-map"
        ref={svgRef}
        viewBox={USA_VIEWBOX}
        className="h-[320px] w-full rounded-xl"
        role="img"
        aria-label="Mapa de IMC por estado"
        onMouseMove={handleMouseMove}
      >
        {Object.entries(USA_STATE_PATHS).map(([abbr, d]) => {
          const agg = stateData[abbr];
          const fillColor = agg ? getImcColor(agg.avgImc) : MAP_NO_DATA;
          const isHovered = hovered === abbr;
          const isSelected = selected === abbr;

          return (
            <path
              key={abbr}
              d={d}
              fill={fillColor}
              stroke="var(--card)"
              strokeWidth={0.8}
              className="cursor-pointer transition-[fill] duration-200"
              style={{
                filter: isHovered ? "brightness(0.92)" : undefined,
                stroke: isSelected
                  ? "var(--spectrum-sky-chart)"
                  : "var(--card)",
                strokeWidth: isSelected ? 1.5 : 0.8,
              }}
              onMouseEnter={() => setHovered(abbr)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handlePathClick(abbr)}
            >
              <title>
                {STATE_NAMES[abbr] ?? abbr} — IMC{" "}
                {agg?.avgImc?.toFixed(1) ?? "sin datos"}{" "}
                {agg ? `(${agg.totalCount} pacientes)` : ""}
              </title>
            </path>
          );
        })}
      </svg>

      {/* Tooltip following cursor */}
      {hovered && !selected && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
          }}
        >
          <p className="font-semibold text-foreground">
            {STATE_NAMES[hovered] ?? hovered}
          </p>
          {hoveredData ? (
            <>
              <p className="text-muted-foreground">
                IMC promedio:{" "}
                <span className="tabular-nums font-medium">
                  {hoveredData.avgImc?.toFixed(1) ?? "—"}
                </span>
              </p>
              <p className="text-muted-foreground">
                {hoveredData.totalCount} paciente
                {hoveredData.totalCount !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Sin datos</p>
          )}
        </div>
      )}

      {/* City popover when a state is selected */}
      {selected && selectedData && (
        <div className="absolute left-1/2 top-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-3 shadow-xl">
          <p className="mb-2 text-sm font-semibold text-foreground">
            {STATE_NAMES[selected] ?? selected}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            IMC prom: {selectedData.avgImc?.toFixed(1) ?? "—"} ·{" "}
            {selectedData.totalCount} pacientes
          </p>
          <div className="flex flex-col gap-1">
            {selectedData.cities
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <button
                  key={c.city_id ?? c.name}
                  type="button"
                  onClick={() => handleCityClick(c.city_id ?? "", c.name)}
                  className="flex items-center justify-between rounded-md px-2 py-1 text-left text-xs hover:bg-muted transition-colors"
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
              className="flex-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Ver todos en {STATE_NAMES[selected] ?? selected}
            </button>
            <button
              type="button"
              onClick={handleClearFilter}
              className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
              title="Limpiar filtro"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 right-3 z-[400] flex items-center gap-3 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{
              backgroundColor: chartColor("green"),
              backgroundImage: chartGradient(chartColor("green")),
            }}
          />
          &lt;25
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{
              backgroundColor: chartColor("amber"),
              backgroundImage: chartGradient(chartColor("amber")),
            }}
          />
          25–29.9
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{
              backgroundColor: chartColor("rose"),
              backgroundImage: chartGradient(chartColor("rose")),
            }}
          />
          ≥30
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{
              backgroundColor: MAP_NO_DATA,
              backgroundImage: chartGradient(MAP_NO_DATA),
            }}
          />
          sin datos
        </span>
      </div>
    </div>
  );
}
