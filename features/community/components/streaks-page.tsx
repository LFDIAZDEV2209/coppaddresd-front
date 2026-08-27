"use client";

import {
  Flame,
  Trophy,
  Star,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
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
import { streakKpis, streakDistribution } from "../mock-data";
import { MemberAvatar } from "./member-avatar";
import { SimpleBarChart } from "./charts";

const RANK_MEDAL: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function StreaksPage() {
  const t = useT();
  const { members, awardXp, toast, streaks, streaksLoading } = useErp();
  const chartData = streakDistribution.map((d) => ({ label: d.range, value: d.value }));

  const milestones = [
    { member: "Andrés Cárdenas", memberId: "m-andres", streak: 38, time: "Hace 18 min" },
    { member: "María González", memberId: "m-maria", streak: 18, time: "Hace 2h" },
    { member: "Patricia Soto", memberId: "m-patricia", streak: 14, time: "Hace 4h" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Rachas y logros")}
        description={`${members.length} ${t("miembros")} · ${t("Agosto 2026")}`}
        icon={Flame}
        actions={
          <Button size="sm" onClick={() => toast(t("Ranking publicado en ANTARES"))}>
            <TrendingUp data-icon="inline-start" />
            {t("Publicar ranking")}
          </Button>
        }
      />

      {/* KPIs */}
      <section className="cp-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {streakKpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={t(kpi.label)}
            value={kpi.value}
            context={kpi.context ? t(kpi.context) : undefined}
            trend={kpi.trend}
            icon={Flame}
            variant="info"
          />
        ))}
      </section>

      {/* Ranking + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ranking table */}
        <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          <SectionHeader
            title={t("Ranking de rachas")}
            description={t("Puedes premiar desde aquí")}
            icon={Flame}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t("Miembro")}</TableHead>
                <TableHead className="text-right">{t("Racha")}</TableHead>
                <TableHead className="text-right hidden md:table-cell">{t("Meta")}</TableHead>
                <TableHead className="text-right hidden md:table-cell">{t("Compartió")}</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="w-16 text-right">{t("Premio")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(streaksLoading ? [] : streaks).map((s, i) => {
                const rank = i + 1;
                const member = members.find((m) => m.id === s.memberId);
                const memberObj = member
                  ? { id: member.id, firstName: member.firstName, lastName: member.lastName, streak: s.streak, isSystem: member.isSystem }
                  : { id: s.memberId, firstName: s.member.split(" ")[0], lastName: s.member.split(" ").slice(1).join(" "), streak: s.streak };

                return (
                  <TableRow
                    key={s.id}
                    style={rank === 1 ? { backgroundColor: "var(--warning-soft)" } : undefined}
                  >
                    <TableCell className="text-sm font-bold">
                      {RANK_MEDAL[rank] ?? rank}
                    </TableCell>
                    <TableCell>
                      <MemberAvatar
                        member={memberObj}
                        subtitle={member?.diagnosis ?? ""}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">
                      🔥 {s.streak}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell text-xs">
                      {s.goal}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {s.shared ? (
                        <StatusBadge
                          status={t("Sí")}
                          color={{ bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }}
                        />
                      ) : (
                        <StatusBadge
                          status={t("No")}
                          color={{ bg: "var(--muted)", text: "var(--muted-foreground)", dot: "var(--muted-foreground)" }}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-[#B8860B] to-[#D9A929] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        {s.xp.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            if (member) {
                              awardXp({
                                memberId: s.memberId,
                                typeLabel: "Racha destacada",
                                xp: 100,
                                message: `¡${s.streak} días de racha! 🔥`,
                                publishInFeed: false,
                              });
                            } else {
                              toast(t("Premio enviado a") + " " + s.member);
                            }
                          }}
                          title={t("Premiar")}
                        >
                          <Trophy className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Streak distribution chart */}
          <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Distribución de rachas")}
              icon={BarChart3}
              variant="primary"
            />
            <div className="p-4">
              <SimpleBarChart data={chartData} color="var(--chart-1)" />
            </div>
          </div>

          {/* Hitos alcanzados hoy */}
          <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Hitos alcanzados hoy")}
              icon={Star}
              variant="primary"
            />
            <div className="flex flex-col divide-y divide-border">
              {milestones.map((ms, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-[var(--warning-foreground)]">
                    <Flame className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[12px]">
                      <span className="font-semibold">{ms.member}</span>{" "}
                      <span className="text-muted-foreground">
                        {t("alcanzó")} <b>🔥 {ms.streak} {t("días")}</b>
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{ms.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
