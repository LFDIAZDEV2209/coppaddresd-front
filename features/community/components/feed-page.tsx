"use client";

import { useMemo, useState } from "react";
import {
  Radio,
  Image as ImageIcon,
  Trophy,
  MessageCircle,
  Users,
  Pill,
  Send,
  Flame,
  Zap,
  Activity,
  Video,
  Award,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
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
import { profileName } from "./member-avatar";
import { CommunityPagination } from "./community-pagination";
import type { FeedKind } from "../types";

const FEED_ICON: Record<FeedKind, typeof ImageIcon> = {
  foto: ImageIcon,
  hito: Trophy,
  comentario: MessageCircle,
  grupo: Users,
  nutriobiotico: Pill,
  publicacion: Send,
  racha: Flame,
  video: Video,
  logro: Award,
};

const FEED_ICON_BG: Record<FeedKind, string> = {
  foto: "bg-success-soft text-success-foreground",
  hito: "bg-warning-soft text-[var(--warning-foreground)]",
  comentario: "bg-primary-soft text-primary",
  grupo: "bg-warning-soft text-warning-foreground",
  nutriobiotico: "bg-info-soft text-info-foreground",
  publicacion: "bg-primary-soft text-primary",
  racha: "bg-warning-soft text-warning-foreground",
  video: "bg-info-soft text-info-foreground",
  logro: "bg-success-soft text-success-foreground",
};

export function FeedPage() {
  const t = useT();
  const { feed, analytics, communityGroups, analyticsLoading } = useErp();
  const [feedPage, setFeedPage] = useState(1);
  const [feedPageSize, setFeedPageSize] = useState(10);

  const paginatedFeed = useMemo(() => {
    const start = (feedPage - 1) * feedPageSize;
    return feed.slice(start, start + feedPageSize);
  }, [feed, feedPage, feedPageSize]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Feed en vivo")}
        description={t("Actividad en tiempo real de ANTARES Comunidad ADRED")}
        icon={Radio}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Feed list — paginada */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
          <SectionHeader
            title={t("Actividad reciente")}
            description={t("Últimos 2 días de actividad")}
            icon={Activity}
            variant="primary"
            actions={
              <StatusBadge
                status={t("En vivo")}
                color={{ bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }}
              />
            }
          />
          <div className="flex flex-col divide-y divide-border">
            {paginatedFeed.map((item) => {
              const Icon = FEED_ICON[item.kind] ?? Activity;
              const iconBg = FEED_ICON_BG[item.kind] ?? "bg-muted text-muted-foreground";
              return (
                <div key={item.id} className={`flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 ${item.isNew ? "animate-feed-slide bg-primary-soft/40" : ""}`}>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[12.5px] leading-relaxed">
                      <span className="font-semibold">{profileName(item.member, item.isSystem, t)}</span>{" "}
                      <span className="text-muted-foreground">{item.description}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  </div>
                  {item.xp ? (
                    <StatusBadge
                      status={`+${item.xp} XP`}
                      color={{ bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }}
                    />
                  ) : null}
                </div>
              );
            })}
            {feed.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("Sin actividad reciente")}</p>
            )}
          </div>
          {feed.length > 0 && (
            <CommunityPagination
              page={feedPage}
              pageSize={feedPageSize}
              total={feed.length}
              onPageChange={setFeedPage}
              onPageSizeChange={(s) => { setFeedPageSize(s); setFeedPage(1); }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 self-stretch">
          {/* Hoy en números */}
          <div className="flex flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
            <SectionHeader
              title={t("Hoy en números")}
              icon={Zap}
              variant="primary"
            />
            <div className="flex flex-1 flex-col justify-center gap-1 p-5">
              {[
                { label: t("Posts publicados"), value: analytics?.feedToday.posts ?? 0, color: "var(--primary)" },
                { label: t("Comentarios"), value: analytics?.feedToday.comments ?? 0, color: "var(--success)" },
                { label: t("Reacciones"), value: analytics?.feedToday.reactions ?? 0, color: "var(--destructive)" },
                { label: t("Nuevos miembros"), value: analytics?.feedToday.newMembers ?? 0, color: "var(--warning)" },
                { label: t("Rachas rotas"), value: analytics?.feedToday.streaksBroken ?? 0, color: "var(--destructive)" },
                { label: t("XP entregados"), value: (analytics?.feedToday.xpDelivered ?? 0).toLocaleString("es-ES"), color: "var(--warning)" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-1">
                  <span className="text-xs">{stat.label}</span>
                  <b className="text-sm" style={{ color: stat.color }}>{stat.value}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Grupos más activos — columnas compactas para caber bien */}
          <div className="flex flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
            <SectionHeader
              title={t("Grupos más activos hoy")}
              icon={MessageCircle}
              variant="primary"
            />
            <div className="flex flex-1 flex-col">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-0">{t("Grupo")}</TableHead>
                  <TableHead className="w-[72px] text-right">{t("Mensajes")}</TableHead>
                  <TableHead className="w-[72px] text-right">{t("Miembros")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analyticsLoading ? [] : communityGroups).slice(0, 8).map((g) => (
                  <TableRow key={g.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="max-w-[140px] truncate py-2 text-xs font-semibold">{g.name}</TableCell>
                    <TableCell className="py-2 text-right text-xs font-bold">{g.posts.toLocaleString()}</TableCell>
                    <TableCell className="py-2 text-right text-xs">{g.members}</TableCell>
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
