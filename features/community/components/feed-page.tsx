"use client";

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
import { feedToday, mockGroups } from "../mock-data";
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
  const { feed } = useErp();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Feed en vivo")}
        description={t("Actividad en tiempo real de ANTARES Comunidad ADRED")}
        icon={Radio}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Feed list */}
        <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          <SectionHeader
            title={t("Actividad reciente")}
            description={t("Últimos 2 días de actividad")}
            icon={Activity}
            variant="primary"
            actions={
              <StatusBadge
                status={t("En vivo")}
                color={{ bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" }}
              />
            }
          />
          <div className="cp-stagger flex flex-col divide-y divide-border max-h-[500px] overflow-y-auto">
            {feed.map((item) => {
              const Icon = FEED_ICON[item.kind] ?? Activity;
              const iconBg = FEED_ICON_BG[item.kind] ?? "bg-muted text-muted-foreground";
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50">
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
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Hoy en números */}
          <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Hoy en números")}
              icon={Zap}
              variant="primary"
            />
            <div className="flex flex-col gap-3 p-4">
              {[
                { label: t("Posts publicados"), value: feedToday.posts, color: "var(--primary)" },
                { label: t("Comentarios"), value: feedToday.comments, color: "var(--success)" },
                { label: t("Reacciones"), value: feedToday.reactions, color: "var(--destructive)" },
                { label: t("Nuevos miembros"), value: feedToday.nuevos, color: "#B8860B" },
                { label: t("Rachas rotas"), value: feedToday.rachasRotas, color: "var(--destructive)" },
                { label: t("XP entregados"), value: feedToday.xp, color: "#B8860B" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs">{stat.label}</span>
                  <b className="text-sm" style={{ color: stat.color }}>{stat.value}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Grupos más activos */}
          <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Grupos más activos hoy")}
              icon={MessageCircle}
              variant="primary"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Grupo")}</TableHead>
                  <TableHead className="text-right">{t("Mensajes")}</TableHead>
                  <TableHead className="text-right">{t("Miembros")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockGroups.map((g) => (
                  <TableRow key={g.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="text-xs font-semibold">{g.name}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{g.posts}</TableCell>
                    <TableCell className="text-right text-xs">{g.members}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
