"use client";

import { regionChartColor, MAP_NO_DATA } from "@/lib/ui/rainbow";

import { USA_STATE_PATHS } from "@/lib/geo/usa-states-paths";

// Coordenadas lat/lng de las 12 metrópolis — misma tabla que regions-map leaflet.
const REGION_LATLNG: Record<string, [number, number]> = {
  miami: [25.7617, -80.1918],
  ny: [40.7128, -74.006],
  orlando: [28.5383, -81.3792],
  barranquilla: [10.9685, -74.7813],
  houston: [29.7604, -95.3698],
  dallas: [32.7767, -96.797],
  atlanta: [33.749, -84.388],
  seattle: [47.6062, -122.3321],
  denver: [39.7392, -104.9903],
  bogotá: [4.711, -74.0721],
  bogota: [4.711, -74.0721],
  cdmx: [19.4326, -99.1332],
};

/* ── Proyección lineal lat/lng → SVG ──────────────────────────────────────
 * viewBox extendido a 959×820 para cubrir LATAM (Bogotá, Barranquilla, CDMX).
 * Los paths de estados US siguen en su rango original (0‑593) y se renderizan
 * en la porción superior.  Los círculos usan la proyección extendida.
 */
const SVG_W = 959;
const SVG_H = 820;
const LAT_MAX = 50;
const LAT_MIN = 3; // cubre Bogotá ~4.7
const LNG_MIN = -130;
const LNG_MAX = -60;
const LAT_RANGE = LAT_MAX - LAT_MIN; // 47
const LNG_RANGE = LNG_MAX - LNG_MIN; // 70

function latLngToSvg(lat: number, lng: number): [number, number] {
  const x = ((lng - LNG_MIN) / LNG_RANGE) * SVG_W;
  const y = ((LAT_MAX - lat) / LAT_RANGE) * SVG_H;
  return [x, y];
}

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

/* ── Componente ─────────────────────────────────────────────────────────── */

export function RegionsMap({
  regions,
}: {
  regions: { region: string; members: number }[];
}) {
  const maxMembers = Math.max(...regions.map((r) => r.members), 1);

  return (
    <svg
      data-slot="chart-map"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="h-[320px] w-full rounded-xl border bg-background"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Estados US — fondo neutro */}
      <g>
        {Object.entries(USA_STATE_PATHS).map(([state, d]) => (
          <path
            key={state}
            d={d}
            fill={MAP_NO_DATA}
            stroke="var(--card)"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Círculos de región */}
      <g>
        {regions.map((r) => {
          const key = normKey(r.region);
          const latlng = REGION_LATLNG[key];
          if (!latlng) return null;
          const color = regionChartColor(r.region);
          const [cx, cy] = latLngToSvg(latlng[0], latlng[1]);
          const radius = 6 + Math.sqrt(r.members / maxMembers) * 16;

          return (
            <g key={r.region}>
              {/* Halo translúcido — amplifica percepción de tamaño */}
              <circle
                cx={cx}
                cy={cy}
                r={radius * 1.7}
                fill={color}
                opacity={0.18}
              />
              {/* Círculo principal */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                stroke="var(--card)"
                strokeWidth={1.5}
                opacity={0.85}
                className="cursor-pointer hover:opacity-100"
              >
                <title>
                  {r.region} — {r.members} miembros
                </title>
              </circle>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
