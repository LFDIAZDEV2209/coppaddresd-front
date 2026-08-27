"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const REGION_LATLNG: Record<string, [number, number]> = {
  Miami: [25.7617, -80.1918],
  NY: [40.7128, -74.006],
  Orlando: [28.5383, -81.3792],
  Barranquilla: [10.9685, -74.7813],
  "Bogotá": [4.711, -74.0721],
  Bogota: [4.711, -74.0721],
  CDMX: [19.4326, -99.1332],
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
  return (
    <MapContainer
      center={[18, -78]}
      zoom={3}
      scrollWheelZoom={false}
      className="h-[320px] w-full rounded-xl"
      style={{ background: "#EFF2F7" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {regions.map((r) => {
        const latlng = REGION_LATLNG[r.region];
        if (!latlng) return null;
        const color = REGION_COLOR_HEX[r.region] ?? "#64748B";
        return (
          <CircleMarker
            key={r.region}
            center={latlng}
            radius={8 + Math.min(r.members / 12, 10)}
            pathOptions={{ color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.9 }}
          >
            <Popup>
              <b>{r.region}</b> — {r.members} {r.members === 1 ? "miembro" : "miembros"}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
