"use client";

import {
  Share2,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";
import { mockNetworks } from "../mock-data";
import { XpLineChart } from "./charts";

const CHANNEL_ICONS: Record<string, string> = {
  TikTok: "🎵",
  Instagram: "📸",
  Facebook: "f",
  YouTube: "▶️",
  WhatsApp: "💬",
};

const CHANNEL_HANDLES: Record<string, string> = {
  TikTok: "@antaresbiohacking",
  Instagram: "@antares.biohacking",
  Facebook: "ANTARES Biohacking",
  YouTube: "SUMMITs · Clases",
  WhatsApp: "Grupo COPP-ADRESD",
};

const CHANNEL_LABEL: Record<string, string> = {
  TikTok: "seguidores",
  Instagram: "seguidores",
  Facebook: "miembros",
  YouTube: "suscriptores",
  WhatsApp: "miembros",
};

export function NetworksPage() {
  const t = useT();

  // Build growth chart data from mockNetworks
  const months = ["Abr", "May", "Jun", "Jul", "Ago"];
  const growthData = months.map((month) => {
    const point: Record<string, string | number> = { label: month };
    mockNetworks.forEach((n) => {
      point[n.name] = n.growth.find((g) => g.month === month)?.value ?? 0;
    });
    return point;
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Redes ANTARES")}
        description={t("Canales externos de ANTARES Comunidad")}
        icon={Share2}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Channel cards */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Métricas por canal")}
            icon={Share2}
            variant="primary"
          />
          <div className="flex flex-col gap-2.5 p-4">
            {mockNetworks.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center gap-3 rounded-xl p-3 text-white"
                style={{ backgroundColor: ch.color }}
              >
                <span className="text-2xl">{CHANNEL_ICONS[ch.name] ?? "🌐"}</span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-bold">{ch.name} ANTARES</span>
                  <span className="text-[10px] opacity-60">{CHANNEL_HANDLES[ch.name] ?? ch.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-base font-black">{ch.followers}</div>
                  <div className="text-[9px] opacity-60">{CHANNEL_LABEL[ch.name] ?? "seguidores"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth chart */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Crecimiento de canales")}
            icon={TrendingUp}
            variant="primary"
          />
          <div className="p-4">
            <XpLineChart
              data={growthData}
              lines={mockNetworks.map((ch) => ({
                key: ch.name,
                name: ch.name,
                color: ch.color,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
