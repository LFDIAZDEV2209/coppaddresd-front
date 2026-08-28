"use client";

import {
  Stethoscope,
  TrendingUp,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { GroupedBarChart } from "./charts";

export function DiagnosticsPage() {
  const t = useT();
  const { diagnostics, diagnosticsLoading } = useErp();

  const diagnosticKpis = diagnostics.map((d) => ({
    label: d.diagnosis,
    value: String(d.members),
    context: d.adherence > 0 ? `${d.adherence}%` : undefined,
  }));

  const chartData = diagnostics.map((d) => ({
    label: d.diagnosis,
    postsProm: d.postsPerWeek,
    adherencia: d.adherence,
    rachaProm: d.avgStreak,
  }));

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title={t("Por diagnóstico")}
        description={t("Participación y adherencia por condición clínica")}
        icon={Stethoscope}
      />

      {/* Row 1: KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {diagnosticKpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={t(kpi.label)}
            value={kpi.value}
            context={kpi.context ? t(kpi.context) : undefined}
            icon={Stethoscope}
            variant="info"
          />
        ))}
      </section>

      {/* Row 2: 2/3 chart + 1/3 table — taller, fits screen */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Participación vs Adherencia — 2/3 */}
        <div className="flex min-h-[400px] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
          <SectionHeader
            title={t("Participación vs Adherencia por diagnóstico")}
            icon={TrendingUp}
            variant="primary"
          />
          <div className="flex flex-1 flex-col p-4">
            <GroupedBarChart
              data={chartData}
              loading={diagnosticsLoading}
              height="h-[340px]"
              bars={[
                { key: "postsProm", name: t("Posts semanales prom."), color: "var(--info)" },
                { key: "adherencia", name: t("Adherencia %"), color: "var(--success)" },
                { key: "rachaProm", name: t("Racha prom. (días)"), color: "var(--primary)" },
              ]}
            />
            {/* Insight — footer inside chart card, keeps 2-row fit + readability */}
            <div className="mt-3 rounded-xl bg-success-soft p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                <p className="text-[11.5px] leading-snug text-success-foreground">
                  <b>{t("Insight:")}</b>{" "}
                  {t("Los pacientes con DM2+HTA tienen la mayor participación semanal (9.1 posts) y la racha promedio más alta (21 días). Son los más comprometidos con el programa.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desglose detallado — 1/3 */}
        <div className="flex h-full min-h-[400px] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-1">
          <SectionHeader
            title={t("Desglose detallado")}
            icon={Stethoscope}
            variant="primary"
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Diagnóstico")}</TableHead>
                    <TableHead className="text-right">{t("Miembros")}</TableHead>
                    <TableHead className="text-right">{t("Posts sem")}</TableHead>
                    <TableHead className="text-right">{t("Racha prom")}</TableHead>
                    <TableHead className="text-right">{t("XP prom")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(diagnosticsLoading ? [] : diagnostics).map((d) => (
                    <TableRow key={d.diagnosis} className="transition-colors hover:bg-muted/50">
                      <TableCell className="py-2 text-xs font-semibold">{d.diagnosis}</TableCell>
                      <TableCell className="py-2 text-right text-xs">{d.members}</TableCell>
                      <TableCell className="py-2 text-right text-xs">{d.postsPerWeek}</TableCell>
                      <TableCell className="py-2 text-right text-xs">🔥 {d.avgStreak}d</TableCell>
                      <TableCell className="py-2 text-right text-xs font-semibold">
                        {d.avgXp.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
