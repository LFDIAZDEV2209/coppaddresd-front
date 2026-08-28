"use client";

import {
  Stethoscope,
  TrendingUp,
  Info,
  Users,
  Flame,
  Award,
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

      {/* Row 2: chart + table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Participación vs Adherencia — 2/3 */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
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

        {/* Columna derecha — desglose + resumen para llenar hueco */}
        <div className="flex flex-col gap-4 lg:col-span-1 self-stretch">
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
            <SectionHeader
              title={t("Desglose detallado")}
              icon={Stethoscope}
              variant="primary"
            />
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="px-2 text-[11px]">{t("Diagnóstico")}</TableHead>
                      <TableHead className="px-2 text-right text-[11px]">{t("Miembros")}</TableHead>
                      <TableHead className="px-2 text-right text-[11px]">{t("Posts sem")}</TableHead>
                      <TableHead className="px-2 text-right text-[11px]">{t("Racha")}</TableHead>
                      <TableHead className="px-2 text-right text-[11px]">{t("XP")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(diagnosticsLoading ? [] : diagnostics).map((d) => (
                      <TableRow key={d.diagnosis} className="transition-colors hover:bg-muted/50">
                        <TableCell className="px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap">{d.diagnosis}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right text-[11px] whitespace-nowrap">{d.members}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right text-[11px] whitespace-nowrap">{d.postsPerWeek}</TableCell>
                        <TableCell className="px-2 py-1.5 text-right text-[11px] whitespace-nowrap">🔥 {d.avgStreak}d</TableCell>
                        <TableCell className="px-2 py-1.5 text-right text-[11px] font-semibold whitespace-nowrap">
                          {d.avgXp.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </div>
          </div>

          {/* Resumen — llena el hueco debajo del desglose */}
          {(() => {
            const totalMembers = diagnostics.reduce((s, d) => s + d.members, 0);
            const avgAdherence = diagnostics.length ? Math.round(diagnostics.reduce((s, d) => s + d.adherence, 0) / diagnostics.length) : 0;
            const avgRacha = diagnostics.length ? (diagnostics.reduce((s, d) => s + d.avgStreak, 0) / diagnostics.length).toFixed(1) : "0";
            const top = [...diagnostics].sort((a, b) => b.postsPerWeek - a.postsPerWeek)[0];
            return (
              <div className="flex flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
                <SectionHeader title={t("Resumen rápido")} icon={Award} variant="secondary" />
                <div className="grid flex-1 grid-cols-2 gap-3 p-4">
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/30 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Users className="size-3.5" /> {t("Total miembros")}</span>
                    <span className="text-[18px] font-bold leading-none">{totalMembers || "—"}</span>
                    <span className="text-[11px] text-muted-foreground">{t("en 4 diagnósticos")}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-success-soft p-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-success-foreground"><TrendingUp className="size-3.5" /> {t("Adherencia media")}</span>
                    <span className="text-[18px] font-bold leading-none text-success-foreground">{avgAdherence ? `${avgAdherence}%` : "—"}</span>
                    <span className="text-[11px] text-success-foreground/70">{t("promedio global")}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-primary-soft p-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary"><Flame className="size-3.5" /> {t("Racha media")}</span>
                    <span className="text-[18px] font-bold leading-none text-primary">{avgRacha}d</span>
                    <span className="text-[11px] text-muted-foreground">{t("días promedio")}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-warning-soft p-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-warning-foreground"><Award className="size-3.5" /> {t("Top diagnóstico")}</span>
                    <span className="truncate text-[13px] font-bold leading-none text-warning-foreground">{top ? top.diagnosis : "—"}</span>
                    <span className="text-[11px] text-warning-foreground/70">{top ? `${top.postsPerWeek} ${t("posts/sem")}` : ""}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
