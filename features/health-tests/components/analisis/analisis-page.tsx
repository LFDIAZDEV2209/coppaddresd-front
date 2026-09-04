"use client";

import { useState } from "react";
import {
  BarChart3,
  PieChart,
  Hourglass,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useT } from "@/providers/i18n-provider";
import { CoveragePage } from "../coverage/coverage-page";
import { FollowUpPage } from "../followup/follow-up-page";
import { IndicatorsPage } from "../indicators/indicators-page";
import { DofaPage } from "../dofa/dofa-page";

const TABS = [
  { value: "cobertura", label: "Cobertura", icon: PieChart },
  { value: "seguimiento", label: "Seguimiento", icon: Hourglass },
  { value: "indicadores", label: "Indicadores", icon: Activity },
  { value: "dofa", label: "DOFA poblacional", icon: TrendingUp },
] as const;

export function AnalisisPage() {
  const t = useT();
  const [active, setActive] =
    useState<(typeof TABS)[number]["value"]>("cobertura");

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <PageHeader
          title={t("Análisis")}
          description={t(
            "Cobertura, seguimiento, indicadores y DOFA en un solo lugar",
          )}
          icon={BarChart3}
        />
      </div>

      <div className="px-4 sm:px-6">
        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as typeof active)}
          className="w-full"
        >
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-xl bg-muted p-1.5 gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-foreground"
                  >
                    <Icon className="size-4" />
                    {t(tab.label)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="mt-6 -mx-4 sm:-mx-6">
            <TabsContent value="cobertura" className="m-0">
              <CoveragePage />
            </TabsContent>
            <TabsContent value="seguimiento" className="m-0">
              <FollowUpPage />
            </TabsContent>
            <TabsContent value="indicadores" className="m-0">
              <IndicatorsPage />
            </TabsContent>
            <TabsContent value="dofa" className="m-0">
              <DofaPage />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
