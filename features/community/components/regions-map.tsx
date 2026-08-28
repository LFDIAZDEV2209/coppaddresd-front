"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldData from "./world-110m.json";
import { useT } from "@/providers/i18n-provider";

const REGION_LATLNG: Record<string, [number, number]> = {
  Miami: [25.76, -80.19],
  NY: [40.71, -74.0],
  Orlando: [28.53, -81.37],
  Barranquilla: [11.0, -74.8],
  "Bogotá": [4.71, -74.07],
  Bogota: [4.71, -74.07],
  CDMX: [19.43, -99.13],
};

const REGION_COLOR_HEX: Record<string, string> = {
  Miami: "#3B82F6",
  NY: "#059669",
  Barranquilla: "#92400E",
  Orlando: "#D97706",
  "Bogotá": "#0E7490",
  Bogota: "#0E7490",
  CDMX: "#DC2626",
};

export function RegionsMap({ regions }: { regions: { region: string; members: number }[] }) {
  const t = useT();
  const [hovered, setHovered] = useState<string | null>(null);

  const { countryPaths, markers } = useMemo(() => {
    const topology = worldData as unknown as Topology;
    const countriesGeo = feature(
      topology as unknown as Topology,
      // @ts-expect-error — topojson objects typing is loose
      (topology as unknown as { objects: { countries: unknown } }).objects.countries,
    ) as unknown as {
      type: string;
      features: { id?: string | number; properties: unknown; geometry: unknown }[];
    };

    const width = 800;
    const height = 320;
    const projection = geoMercator();

    const coords: [number, number][] = [];
    for (const r of regions) {
      const ll = REGION_LATLNG[r.region];
      if (ll) coords.push([ll[1], ll[0]]); // [lng, lat]
    }

    if (coords.length >= 2) {
      const geo = {
        type: "Feature" as const,
        geometry: { type: "MultiPoint" as const, coordinates: coords },
        properties: {},
      };
      projection.fitExtent(
        [
          [40, 20],
          [760, 300],
        ],
        geo as never,
      );
      // Soften: pull zoom ~0.85x to keep surrounding land visible
      const s = projection.scale();
      projection.scale(s * 0.82);
    } else if (coords.length === 1) {
      projection.center(coords[0]).scale(420).translate([width / 2, height / 2]);
    } else {
      // Fallback: show Americas-centered world
      projection.fitExtent(
        [
          [10, 10],
          [790, 310],
        ],
        countriesGeo as never,
      );
    }

    const path = geoPath(projection);

    const paths: { d: string; key: string | number }[] = [];
    for (let i = 0; i < countriesGeo.features.length; i++) {
      const f = countriesGeo.features[i];
      const d = path(f as never);
      if (d) paths.push({ d, key: (f.id as string | number) ?? i });
    }

    const projected = regions
      .map((r) => {
        const ll = REGION_LATLNG[r.region];
        if (!ll) return null;
        const p = projection([ll[1], ll[0]]);
        if (!p) return null;
        const color = REGION_COLOR_HEX[r.region] ?? "#64748B";
        const radius = 8 + Math.min(r.members / 12, 10);
        return { region: r.region, members: r.members, x: p[0], y: p[1], color, radius };
      })
      .filter(Boolean) as { region: string; members: number; x: number; y: number; color: string; radius: number }[];

    return { countryPaths: paths, markers: projected };
  }, [regions]);

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-[#EFF2F7]">
      <svg viewBox="0 0 800 320" className="h-full w-full" role="img" aria-label={t("Mapa de regiones")}>
        {/* Land */}
        <g>
          {countryPaths.map((p) => (
            <path key={p.key} d={p.d} fill="var(--muted)" stroke="var(--border)" strokeWidth={0.7} />
          ))}
        </g>

        {/* Graticule subtle already via land border; markers */}
        <g>
          {markers.map((m) => {
            const isHovered = hovered === m.region;
            return (
              <g
                key={m.region}
                onMouseEnter={() => setHovered(m.region)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                {/* outer pulse when hovered */}
                {isHovered && (
                  <circle cx={m.x} cy={m.y} r={m.radius + 6} fill={m.color} opacity={0.18} />
                )}
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={m.radius}
                  fill={m.color}
                  fillOpacity={0.92}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.18))" }}
                />
              </g>
            );
          })}
        </g>

        {/* Hover tooltip inside SVG (avoids HTML positioning math) */}
        {markers
          .filter((m) => hovered === m.region)
          .map((m) => {
            const label = `${m.region} — ${m.members} ${m.members === 1 ? t("miembro") : t("miembros")}`;
            // Estimate width ~ 6.5px per char at 11px font + 16 padding
            const w = Math.min(220, Math.max(110, label.length * 6.2 + 24));
            const h = 28;
            const tx = Math.min(800 - w - 8, Math.max(8, m.x - w / 2));
            const ty = Math.max(8, m.y - m.radius - h - 10);
            return (
              <g key={`tip-${m.region}`} pointerEvents="none">
                <rect x={tx} y={ty} width={w} height={h} rx={8} fill="var(--card)" stroke="var(--border)" />
                <text x={tx + w / 2} y={ty + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill="var(--foreground)">
                  {label}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
