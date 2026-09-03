"use client";

import { Fragment } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { BiometriaCityPoint } from "../types/erp";

// --- Hardcoded city coordinates (lat/lng) for the known cities ---
// Fallback to state centroid if not found.
const CITY_COORDS: Record<string, [number, number]> = {
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

function getImcColor(avgImc: number | null): string {
  if (avgImc == null) return "var(--muted)";
  if (avgImc < 25) return "var(--success)";
  if (avgImc < 30) return "#D4AF37";
  return "var(--destructive)";
}

interface BiometriaLeafletMapProps {
  cities: BiometriaCityPoint[];
  onCitySelect?: (cityId: string | null) => void;
}

export function BiometriaLeafletMap({ cities, onCitySelect }: BiometriaLeafletMapProps) {
  const maxCount = Math.max(...cities.map((c) => c.count), 1);

  return (
    <div className="relative w-full rounded-xl">
      <MapContainer
        center={[39.8, -98.5]}
        zoom={4}
        scrollWheelZoom={false}
        className="h-[320px] w-full rounded-xl"
        style={{ background: "#EFF2F7" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cities.map((c) => {
          const key = `${c.name},${c.state_abbr}`.toLowerCase();
          const latlng: [number, number] =
            CITY_COORDS[key] ??
            (c.state_abbr ? STATE_CENTROIDS[c.state_abbr] : null) ??
            [39.8, -98.5];

          const color = getImcColor(c.avg_imc);
          const radius = 6 + Math.sqrt(c.count / maxCount) * 16;

          return (
            <Fragment key={`${c.name}-${c.state_abbr}`}>
              {/* Halo translúcido que amplifica la percepción de tamaño */}
              <CircleMarker
                center={latlng}
                radius={radius * 1.7}
                pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.18 }}
              />
              <CircleMarker
                center={latlng}
                radius={radius}
                pathOptions={{
                  color: "#fff",
                  weight: 1.5,
                  fillColor: color,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{ click: () => onCitySelect?.(c.city_id) }}
              >
                <Tooltip>
                  {c.name}
                  {c.state_abbr ? `, ${c.state_abbr}` : ""} — {c.count} pacientes —
                  IMC {c.avg_imc?.toFixed(1) ?? "\u2014"}
                </Tooltip>
                <Popup>
                  <b>
                    {c.name}
                    {c.state_abbr ? `, ${c.state_abbr}` : ""}
                  </b>
                  <br />
                  {c.count} pacientes
                  <br />
                  IMC promedio: {c.avg_imc?.toFixed(1) ?? "\u2014"}
                </Popup>
              </CircleMarker>
            </Fragment>
          );
        })}
      </MapContainer>

      {/* Legend — offset above Leaflet attribution (bottom-right) */}
      <div className="absolute bottom-8 right-3 z-[400] flex items-center gap-3 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "var(--success)" }}
          />
          &lt;25
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "#D4AF37" }}
          />
          25–29.9
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: "var(--destructive)" }}
          />
          ≥30
        </span>
      </div>
    </div>
  );
}
