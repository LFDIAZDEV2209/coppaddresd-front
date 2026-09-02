"use client";

import { useState } from "react";
import type { BiometriaCityPoint } from "../types/erp";

// --- Hardcoded city coordinates (lat/lng) for the 8+ known cities ---
// Fallback to state centroid if not found.
const CITY_COORDS: Record<string, [number, number]> = {
  // lat, lng
  "fairview,mi": [43.33, -83.54],
  "los angeles,ca": [34.05, -118.24],
  "fairview,pa": [41.88, -80.25],
  "detroit,mi": [42.33, -83.05],
  "chicago,il": [41.88, -87.63],
  "miami,fl": [25.76, -80.19],
  "new york,ny": [40.71, -74.01],
  "houston,tx": [29.76, -95.37],
  "phoenix,az": [33.45, -112.07],
  "philadelphia,pa": [39.95, -75.17],
  "san antonio,tx": [29.42, -98.49],
  "san diego,ca": [32.72, -117.16],
  "dallas,tx": [32.78, -96.80],
  "san jose,ca": [37.34, -121.89],
  "austin,tx": [30.27, -97.74],
  "jacksonville,fl": [30.33, -81.66],
  "fort worth,tx": [32.76, -97.33],
  "columbus,oh": [39.96, -82.99],
  "charlotte,nc": [35.23, -80.84],
  "san francisco,ca": [37.77, -122.42],
  "seattle,wa": [47.61, -122.33],
  "denver,co": [39.74, -104.99],
  "boston,ma": [42.36, -71.06],
  "nashville,tn": [36.16, -86.78],
  "portland,or": [45.52, -122.68],
  "las vegas,nv": [36.17, -115.14],
  "memphis,tn": [35.15, -90.05],
  "louisville,ky": [38.25, -85.76],
  "baltimore,md": [39.29, -76.61],
  "milwaukee,wi": [43.04, -87.91],
  "albuquerque,nm": [35.08, -106.65],
  "tucson,az": [32.22, -110.93],
  "fresno,ca": [36.74, -119.79],
  "sacramento,ca": [38.58, -121.49],
  "mesa,az": [33.42, -111.83],
  "kansas city,mo": [39.10, -94.58],
  "atlanta,ga": [33.75, -84.39],
  "omaha,ne": [41.26, -95.94],
  "colorado springs,co": [38.83, -104.82],
  "raleigh,nc": [35.78, -78.64],
  "long beach,ca": [33.77, -118.19],
  "virginia beach,va": [36.85, -75.98],
  "oakland,ca": [37.80, -122.27],
  "minneapolis,mn": [44.98, -93.27],
  "tampa,fl": [27.95, -82.46],
  "tulsa,ok": [36.15, -95.99],
  "arlington,tx": [32.74, -97.11],
  "new orleans,la": [29.95, -90.07],
  "wichita,ks": [37.69, -97.34],
  "cleveland,oh": [41.50, -81.69],
  "bakersfield,ca": [35.37, -119.02],
  "aurora,co": [39.73, -104.83],
  "anaheim,ca": [33.84, -117.91],
  "honolulu,hi": [21.31, -157.86],
  "anchorage,ak": [61.22, -149.90],
};

const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.80, -86.80], AK: [64.24, -152.50], AZ: [34.05, -111.09],
  AR: [34.80, -92.20], CA: [36.78, -119.42], CO: [39.55, -105.78],
  CT: [41.60, -72.70], DE: [38.90, -75.52], FL: [27.66, -81.52],
  GA: [32.16, -82.90], HI: [19.90, -155.58], ID: [44.07, -114.74],
  IL: [40.63, -89.40], IN: [40.27, -86.13], IA: [42.01, -93.63],
  KS: [39.01, -98.48], KY: [37.84, -85.76], LA: [30.98, -92.34],
  ME: [45.37, -69.00], MD: [39.04, -76.64], MA: [42.41, -71.38],
  MI: [44.31, -85.60], MN: [46.73, -94.69], MS: [32.35, -89.40],
  MO: [38.57, -92.60], MT: [47.05, -110.26], NE: [41.49, -100.02],
  NV: [38.80, -116.42], NH: [43.66, -71.57], NJ: [40.06, -74.41],
  NM: [34.52, -105.87], NY: [42.95, -75.52], NC: [35.76, -79.02],
  ND: [47.55, -100.44], OH: [40.42, -82.91], OK: [35.56, -97.52],
  OR: [44.00, -120.56], PA: [41.20, -77.19], RI: [41.58, -71.48],
  SC: [34.00, -81.03], SD: [44.50, -100.24], TN: [35.52, -86.58],
  TX: [31.00, -99.00], UT: [39.32, -111.09], VT: [44.00, -72.70],
  VA: [37.43, -78.66], WA: [47.75, -120.74], WV: [38.60, -80.63],
  WI: [44.26, -89.82], WY: [43.08, -107.29],
};

// Mercator projection: lat/lng → SVG viewBox coords
const VIEWBOX = { w: 960, h: 600 };
const MIN_LAT = 24;
const MAX_LAT = 50;
const MIN_LNG = -130;
const MAX_LNG = -65;

function latLngToSvg(lat: number, lng: number): [number, number] {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * VIEWBOX.w;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * VIEWBOX.h;
  return [x, y];
}

function getImcColor(avgImc: number | null): string {
  if (avgImc == null) return "var(--muted)";
  if (avgImc < 25) return "var(--success)";
  if (avgImc < 30) return "#D4AF37";
  return "var(--destructive)";
}

interface BiometriaUsaMapProps {
  cities: BiometriaCityPoint[];
  onCitySelect?: (cityId: string | null) => void;
}

export function BiometriaUsaMap({ cities, onCitySelect }: BiometriaUsaMapProps) {
  const [hoveredCity, setHoveredCity] = useState<BiometriaCityPoint | null>(null);

  // Resolve city → SVG coords
  const resolved = cities.map((c) => {
    const key = `${c.name},${c.state_abbr}`.toLowerCase();
    const coords = CITY_COORDS[key]
      ?? (c.state_abbr ? STATE_CENTROIDS[c.state_abbr] : null)
      ?? [39.83, -98.58]; // center of US fallback
    const [lat, lng] = coords;
    const [x, y] = latLngToSvg(lat, lng);
    return { ...c, x, y };
  });

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-muted/20">
      <svg
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        className="h-auto w-full"
        aria-label="Mapa de calor IMC por ciudad"
      >
        {/* Simplified contiguous US outline */}
        <path
          d="M 180 280 Q 170 260 200 240 L 280 230 340 220 420 210 500 220 560 240 620 250 680 260 740 270 790 280 830 300 850 330 860 360 850 400 830 430 800 450 760 470 700 490 640 500 580 510 520 520 460 530 400 520 340 510 280 490 220 460 180 420 160 380 150 340 160 300 Z"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.5"
          opacity="0.5"
        />
        {/* Alaska box */}
        <rect x="30" y="30" width="140" height="100" rx="4" fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.3" />
        <text x="100" y="85" textAnchor="middle" fill="var(--muted-foreground)" fontSize="10" opacity="0.5">Alaska</text>
        {/* Hawaii box */}
        <rect x="30" y="150" width="140" height="80" rx="4" fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.3" />
        <text x="100" y="195" textAnchor="middle" fill="var(--muted-foreground)" fontSize="10" opacity="0.5">Hawái</text>

        {/* City circles */}
        {resolved.map((c) => {
          const r = Math.max(6, Math.min(30, Math.sqrt(c.count) * 2.8 + 4));
          const fill = getImcColor(c.avg_imc);
          return (
            <g
              key={`${c.name}-${c.state_abbr}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredCity(c)}
              onMouseLeave={() => setHoveredCity(null)}
              onClick={() => onCitySelect?.(c.city_id)}
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={fill}
                fillOpacity={0.7}
                stroke={fill}
                strokeWidth={1.5}
                strokeOpacity={0.9}
              />
              <text
                x={c.x}
                y={c.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={Math.max(8, Math.min(12, r * 0.7))}
                fontWeight="bold"
              >
                {c.count}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredCity && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-foreground">
            {hoveredCity.name}
            {hoveredCity.state_abbr ? `, ${hoveredCity.state_abbr}` : ""}
          </p>
          <p className="text-muted-foreground">
            {hoveredCity.count} pacientes · IMC avg:{" "}
            {hoveredCity.avg_imc?.toFixed(1) ?? "—"}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
          &lt;25
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: "#D4AF37" }} />
          25–29.9
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: "var(--destructive)" }} />
          ≥30
        </span>
      </div>
    </div>
  );
}
