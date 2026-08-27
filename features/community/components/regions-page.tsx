"use client";

import {
  Map,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { GroupedBarChart } from "./charts";

const REGION_COLORS: Record<string, string> = {
  Miami: "var(--primary)",
  NY: "var(--success)",
  Barranquilla: "var(--warning-foreground)",
  Orlando: "var(--warning)",
  Bogotá: "var(--info)",
  CDMX: "var(--destructive)",
};

export function RegionsPage() {
  const t = useT();
  const { regions, regionsLoading } = useErp();

  const chartData = regions.map((r) => ({
    label: r.region,
    members: r.members,
    postsPerWeek: r.postsPerWeek,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Por región")}
        description={`${regions.length} ${t("ciudades")}`}
        icon={Map}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
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
                { key: "members", name: t("Miembros"), color: "var(--primary)" },
                { key: "postsPerWeek", name: t("Posts/semana"), color: "var(--success)" },
              ]}
            />
          </div>
        </div>

        {/* Region legend */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader
            title={t("Mapa de presencia")}
            icon={Globe}
            variant="primary"
          />
          <div className="flex flex-col gap-4 p-4">
            {/* Map placeholder */}
            <div className="relative flex h-[180px] items-center justify-center rounded-xl bg-gradient-to-br from-info-soft to-primary-soft">
              <div className="flex flex-col items-center gap-2">
                <Globe className="size-8 text-primary" />
                <span className="text-xs text-muted-foreground text-center">
                  Miami · New York · Orlando<br />
                  Barranquilla · Bogotá · CDMX
                </span>
              </div>
              {/* Colored dots */}
              <div className="absolute top-[30px] left-[60px] size-4 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: REGION_COLORS.Miami }} title="Miami" />
              <div className="absolute top-[20px] left-[90px] size-3.5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: REGION_COLORS.NY }} title="New York" />
              <div className="absolute top-[40px] left-[75px] size-3 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: REGION_COLORS.Orlando }} title="Orlando" />
              <div className="absolute top-[70px] left-[35px] size-4 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: REGION_COLORS.Barranquilla }} title="Barranquilla" />
              <div className="absolute top-[85px] left-[50px] size-2.5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: REGION_COLORS.Bogotá }} title="Bogotá" />
              <div className="absolute top-[60px] left-[20px] size-2.5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: REGION_COLORS.CDMX }} title="CDMX" />
            </div>

            {/* Legend list */}
            <div className="flex flex-col gap-2">
              {regions.map((r) => (
                <div key={r.region} className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: REGION_COLORS[r.region] ?? "var(--muted)" }}
                  />
                  <span className="flex-1 text-xs">{r.region}</span>
                  <span className="text-xs font-bold">{r.members}</span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    {r.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
