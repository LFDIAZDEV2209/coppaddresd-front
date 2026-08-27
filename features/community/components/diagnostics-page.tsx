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
import { useT } from "@/providers/i18n-provider";
import { diagnosticKpis, mockDiagnostics } from "../mock-data";
import { GroupedBarChart } from "./charts";

export function DiagnosticsPage() {
  const t = useT();

  const chartData = mockDiagnostics.map((d) => ({
    label: d.diagnosis,
    postsProm: d.postsPerWeek,
    adherencia: d.adherence,
    rachaProm: d.avgStreak,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Por diagnóstico")}
        description={t("Participación y adherencia por condición clínica")}
        icon={Stethoscope}
      />

      {/* KPIs */}
      <section className="cp-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {diagnosticKpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={t(kpi.label)}
            value={kpi.value}
            context={kpi.context ? t(kpi.context) : undefined}
            trend={kpi.trend}
            icon={Stethoscope}
            variant="info"
          />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          <SectionHeader
            title={t("Participación vs Adherencia por diagnóstico")}
            icon={TrendingUp}
            variant="primary"
          />
          <div className="p-4">
            <GroupedBarChart
              data={chartData}
              bars={[
                { key: "postsProm", name: t("Posts semanales prom."), color: "var(--info)" },
                { key: "adherencia", name: t("Adherencia %"), color: "var(--success)" },
                { key: "rachaProm", name: t("Racha prom. (días)"), color: "var(--primary)" },
              ]}
            />
          </div>
        </div>

        {/* Detail table + insight */}
        <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Desglose detallado")}
            icon={Stethoscope}
            variant="primary"
          />
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
              {mockDiagnostics.map((d) => (
                <TableRow key={d.diagnosis}>
                  <TableCell className="text-xs font-semibold">{d.diagnosis}</TableCell>
                  <TableCell className="text-right text-xs">{d.members}</TableCell>
                  <TableCell className="text-right text-xs">{d.postsPerWeek}</TableCell>
                  <TableCell className="text-right text-xs">🔥 {d.avgStreak}d</TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {d.avgXp.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Insight */}
          <div className="mx-4 mb-4 rounded-xl bg-success-soft p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-success-foreground" />
              <p className="text-[11.5px] text-success-foreground">
                <b>{t("Insight:")}</b>{" "}
                {t("Los pacientes con DM2+HTA tienen la mayor participación semanal (9.1 posts) y la racha promedio más alta (21 días). Son los más comprometidos con el programa.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
