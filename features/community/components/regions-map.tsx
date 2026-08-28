"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
  "bogotá": [4.711, -74.0721],
  bogota: [4.711, -74.0721],
  cdmx: [19.4326, -99.1332],
};

const REGION_COLOR_HEX: Record<string, string> = {
  miami: "#3B82F6",
  ny: "#059669",
  barranquilla: "#92400E",
  orlando: "#D97706",
  houston: "#7C3AED",
  dallas: "#DC2626",
  atlanta: "#0E7490",
  seattle: "#0EA5E9",
  denver: "#F59E0B",
  "bogotá": "#0E7490",
  bogota: "#0E7490",
  cdmx: "#DC2626",
};

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

export function RegionsMap({ regions }: { regions: { region: string; members: number }[] }) {
  // Escala de área (r²): el radio crece con la raíz del conteo relativo al máximo.
  const maxMembers = Math.max(...regions.map((r) => r.members), 1);

  return (
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
      {regions.map((r) => {
        const key = normKey(r.region);
        const latlng = REGION_LATLNG[key];
        if (!latlng) return null;
        const color = REGION_COLOR_HEX[key] ?? "#64748B";
        // 6px (mínimo visible) → 22px (el metro con más miembros).
        const radius = 6 + Math.sqrt(r.members / maxMembers) * 16;
        return (
          <>
            {/* Halo translúcido que amplifica la percepción de tamaño */}
            <CircleMarker
              key={`${r.region}-halo`}
              center={latlng}
              radius={radius * 1.7}
              pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.18 }}
            />
            <CircleMarker
              key={r.region}
              center={latlng}
              radius={radius}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85 }}
            >
              <Popup>
                <b>{r.region}</b> — {r.members} {r.members === 1 ? "miembro" : "miembros"}
              </Popup>
            </CircleMarker>
          </>
        );
      })}
    </MapContainer>
  );
}
