"use client";

import { useState, useRef, useCallback } from "react";
import {
  USA_STATE_PATHS,
  USA_VIEWBOX,
  STATE_NAMES,
} from "@/lib/geo/usa-states-paths";
import type { HealthGeoCity } from "../../services/health-geo-service";

// Colores por % alto riesgo (alto+crítico) — semáforo clínico profesional
function getRiskColor(pct: number | null): string {
  if (pct == null) return "#e5e7eb"; // sin datos
  if (pct < 20) return "#10B981"; // verde bajo riesgo
  if (pct < 40) return "#D4AF37"; // ámbar moderado
  return "#ef4444"; // rojo alto
}

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
  onCitySelect?: (cityId: string | null, cityName?: string) => void;
  onStateSelect?: (stateAbbr: string | null, stateName?: string) => void;
}

export function HealthTestsUsaMap({
  cities,
  onCitySelect,
  onStateSelect,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const stateData = aggregateByState(cities);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePathClick = useCallback(
    (abbr: string) => {
      const agg = stateData[abbr];
      if (agg && agg.cities.length > 0)
        setSelected(selected === abbr ? null : abbr);
      else {
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
    <div className="relative flex w-full flex-col items-center rounded-xl">
      <svg
        ref={svgRef}
        viewBox={USA_VIEWBOX}
        className="h-[360px] w-full rounded-xl"
        role="img"
        aria-label="Mapa de riesgo por estado"
        onMouseMove={handleMouseMove}
      >
        {Object.entries(USA_STATE_PATHS).map(([abbr, d]) => {
          const agg = stateData[abbr];
          const fillColor = agg ? getRiskColor(agg.highRiskPct) : "#e5e7eb";
          const isHovered = hovered === abbr;
          const isSelected = selected === abbr;
          return (
            <path
              key={abbr}
              d={d}
              fill={fillColor}
              stroke="#fff"
              strokeWidth={0.8}
              className="cursor-pointer transition-[fill] duration-200"
              style={{
                filter: isHovered ? "brightness(0.92)" : undefined,
                stroke: isSelected ? "#1e293b" : "#fff",
                strokeWidth: isSelected ? 1.5 : 0.8,
              }}
              onMouseEnter={() => setHovered(abbr)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handlePathClick(abbr)}
            >
              <title>
                {STATE_NAMES[abbr] ?? abbr} — Alto riesgo{" "}
                {agg?.highRiskPct?.toFixed(1) ?? "sin datos"}%{" "}
                {agg ? `(${agg.totalCount} pacientes)` : ""}
              </title>
            </path>
          );
        })}
      </svg>

      {hovered && !selected && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          <p className="font-semibold text-foreground">
            {STATE_NAMES[hovered] ?? hovered}
          </p>
          {hoveredData ? (
            <>
              <p className="text-muted-foreground">
                Alto riesgo:{" "}
                <span className="tabular-nums font-medium">
                  {hoveredData.highRiskPct?.toFixed(1) ?? "—"}%
                </span>
              </p>
              <p className="text-muted-foreground">
                {hoveredData.totalCount} paciente
                {hoveredData.totalCount !== 1 ? "s" : ""}
              </p>
              {hoveredData.avgScore != null && (
                <p className="text-muted-foreground">
                  Score promedio: {hoveredData.avgScore.toFixed(0)}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Sin datos</p>
          )}
        </div>
      )}

      {selected && selectedData && (
        <div className="absolute left-1/2 top-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-3 shadow-xl">
          <p className="mb-2 text-sm font-semibold text-foreground">
            {STATE_NAMES[selected] ?? selected}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Alto riesgo: {selectedData.highRiskPct?.toFixed(1) ?? "—"}% ·{" "}
            {selectedData.totalCount} pacientes
          </p>
          <div className="flex flex-col gap-1">
            {selectedData.cities
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <button
                  key={c.cityId ?? c.name}
                  type="button"
                  onClick={() => handleCityClick(c.cityId ?? "", c.name)}
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

      <div className="mt-3 flex w-full justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-1.5 text-[11px] text-muted-foreground shadow-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "#10B981" }}
            />{" "}
            &lt;20%
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "#D4AF37" }}
            />{" "}
            20–40%
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "#ef4444" }}
            />{" "}
            &gt;40%
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "#e5e7eb" }}
            />{" "}
            sin datos
          </span>
        </div>
      </div>
    </div>
  );
}
