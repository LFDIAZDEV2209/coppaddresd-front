"use client";

import { useMemo, useState } from "react";
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
import { useI18n, useT } from "@/providers/i18n-provider";
import { MemberAvatar, profileName } from "./member-avatar";
import { CommunityPagination } from "./community-pagination";
import { SimpleBarChart } from "./charts";
import { AwardMemberDialog } from "./award-dialog";

const RANK_MEDAL: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function StreaksPage() {
  const t = useT();
  const { lang } = useI18n();
  // Mes/año actual localizado (es/en) para el encabezado.
  const rawMonth = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
  const { members, streaks, streaksLoading, analytics, feed, analyticsLoading, publishPost } = useErp();
  const [awardTargetId, setAwardTargetId] = useState<string | null>(null);
  const [awardOpen, setAwardOpen] = useState(false);
  const chartData = (analytics?.streakOverview.distribution ?? []).map((d) => ({ label: d.range, value: d.value }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const streakKpis = analytics
    ? [
        { label: "Racha más larga", value: String(analytics.streakOverview.longestStreak), context: "" },
        { label: "Miembros racha >7d", value: String(analytics.streakOverview.membersOverSevenDays), context: "" },
        { label: "Hitos del mes", value: String(analytics.streakOverview.milestonesThisMonth), context: "logros alcanzados" },
        { label: "Rachas rotas", value: String(analytics.streakOverview.streaksBroken), context: "esta semana" },
      ]
    : [];

  const milestones = feed
    .filter((f) => f.kind === "hito" || f.kind === "racha")
    .slice(0, 5)
    .map((f) => ({
      member: f.member,
      memberId: f.memberId,
      streak: 0,
      time: f.time,
      description: f.description,
    }));

  const paginatedStreaks = useMemo(() => {
    const data = streaksLoading ? [] : streaks;
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [streaks, streaksLoading, page, pageSize]);

  const totalStreaks = streaksLoading ? 0 : streaks.length;

  /** Publica el ranking real como publicación de la comunidad. */
  const handlePublishRanking = () => {
    const top5 = streaks.slice(0, 5);
    const lines = top5.map(
      (s, i) => `${RANK_MEDAL[i + 1] ?? `${i + 1}.`} ${s.member} — 🔥 ${s.streak} · ${s.xp.toLocaleString()} XP`,
    );
    const body = [
      `🏆 ${t("Ranking de rachas de la comunidad")}`,
      "",
      ...lines,
      "",
      t("¡Sigue publicando para subir en el ranking!"),
    ].join("\n");
    publishPost({ type: "Texto", destination: "Todas las comunidades", body, pinned: false });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Rachas y logros")}
        description={`${members.length} ${t("miembros")} · ${monthLabel}`}
        icon={Flame}
        actions={
          <Button size="sm" onClick={handlePublishRanking}>
            <TrendingUp data-icon="inline-start" />
            {t("Publicar ranking")}
          </Button>
        }
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {streakKpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={t(kpi.label)}
            value={kpi.value}
            context={kpi.context ? t(kpi.context) : undefined}
            icon={Flame}
            variant="info"
          />
        ))}
      </section>

      {/* Ranking + chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ranking table — paginada */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
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
                <TableHead className="w-[72px] text-right">{t("Racha")}</TableHead>
                <TableHead className="hidden text-right md:table-cell w-[64px]">{t("Meta")}</TableHead>
                <TableHead className="hidden text-right md:table-cell w-[80px]">{t("Compartió")}</TableHead>
                <TableHead className="w-[88px] text-right">XP</TableHead>
                <TableHead className="w-16 text-right">{t("Premio")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStreaks.map((s, i) => {
                const rank = (page - 1) * pageSize + i + 1;
                const member = members.find((m) => m.id === s.memberId);
                const memberObj = member
                  ? { id: member.id, firstName: member.firstName, lastName: member.lastName, streak: s.streak, isSystem: member.isSystem }
                  : { id: s.memberId, firstName: s.member.split(" ")[0], lastName: s.member.split(" ").slice(1).join(" "), streak: s.streak };

                return (
                  <TableRow
                    key={s.id}
                    style={rank === 1 && page === 1 ? { backgroundColor: "var(--warning-soft)" } : undefined}
                  >
                    <TableCell className="py-2 text-sm font-bold">
                      {RANK_MEDAL[rank] ?? rank}
                    </TableCell>
                    <TableCell className="py-2">
                      <MemberAvatar
                        member={memberObj}
                        subtitle={member?.diagnosis ?? ""}
                      />
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm font-bold whitespace-nowrap">
                      🔥 {s.streak}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell py-2 text-xs">
                      {s.goal}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell py-2">
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
                    <TableCell className="py-2 text-right">
                      <span className="inline-flex items-center rounded-lg bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-[var(--warning-foreground)]">
                        {s.xp.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            setAwardTargetId(s.memberId);
                            setAwardOpen(true);
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
          {totalStreaks > 0 && (
            <CommunityPagination page={page} pageSize={pageSize} total={totalStreaks} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Streak distribution chart */}
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
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
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
            <SectionHeader
              title={t("Hitos alcanzados hoy")}
              icon={Star}
              variant="primary"
            />
            <div className="flex flex-col divide-y divide-border">
              {(analyticsLoading ? [] : milestones).map((ms, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-[var(--warning-foreground)]">
                    <Flame className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[12px]">
                      <span className="font-semibold">{profileName(ms.member, false, t)}</span>{" "}
                      <span className="text-muted-foreground">
                        {ms.description}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{ms.time}</span>
                  </div>
                </div>
              ))}
              {!analyticsLoading && milestones.length === 0 && (
                <p className="p-6 text-center text-xs text-muted-foreground">{t("Sin hitos hoy")}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de premiar (controlado, tipo racha destacada) */}
      {awardTargetId && (
        <AwardMemberDialog
          key={awardTargetId}
          memberId={awardTargetId}
          open={awardOpen}
          onOpenChange={setAwardOpen}
          initialTipo="Racha destacada"
        />
      )}
    </div>
  );
}
