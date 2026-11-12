"use client";

import { regionChartColor, chartColor, chartGradient } from "@/lib/ui/rainbow";

import { Map, Globe } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { GroupedBarChart } from "./charts";
import { RegionsMap } from "./regions-vector-map";

export function RegionsPage() {
  const t = useT();
  const { regions, regionsLoading } = useErp();

  const chartData = regions.map((r) => ({
    label: r.region,
    members: r.members,
    postsPerWeek: r.postsPerWeek,
  }));

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 min-w-0">
      <PageHeader
        title={t("Por región")}
        description={`${regions.length} ${t("ciudades")}`}
        icon={Map}
      />

      {/* Fila 1: Mapa — leaflet */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-brand-blue-soft/40 bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Distribución geográfica")}
          icon={Globe}
          variant="primary"
        />
        <div className="flex flex-col gap-4 p-4">
          <RegionsMap regions={regions} />

          {/* Leyenda */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {regions.map((r) => (
              <div
                key={r.region}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: regionChartColor(r.region),
                    backgroundImage: chartGradient(regionChartColor(r.region)),
                  }}
                />
                <span className="flex-1 truncate text-xs font-medium">
                  {r.region}
                </span>
                <span className="text-xs font-bold">{r.members}</span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {r.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fila 2: Miembros y engagement — ancho completo */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-brand-blue-soft/40 bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Miembros y engagement por ciudad")}
          icon={Map}
          variant="primary"
        />
        <div className="p-4">
          <GroupedBarChart
            data={chartData}
            loading={regionsLoading}
            bars={[
              { key: "members", name: t("Miembros"), color: chartColor("sky") },
              {
                key: "postsPerWeek",
                name: t("Posts/semana"),
                color: chartColor("teal"),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
