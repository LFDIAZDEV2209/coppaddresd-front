"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Archive,
  ArchiveRestore,
  RefreshCw,
  LayoutDashboard,
  FileText,
  CalendarPlus,
  Radio,
  UserCog,
  Inbox,
  ShieldAlert,
  BarChart3,
  UserPlus,
} from "lucide-react";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import type { Club } from "../types";
import { archiveClub, fetchClub } from "../mock/clubs-api";
import {
  CLUB_STATUS_COLORS,
  VISIBILITY_COLORS,
  categoryColor,
  clubCoverStyle,
  initials,
} from "./clubs-helpers";
import { ClubOverviewTab } from "./club-overview-tab";
import { ClubMembersTab } from "./club-members-tab";
import { ClubRequestsTab } from "./club-requests-tab";
import { ClubPostsTab } from "./club-posts-tab";
import { ClubEventsTab } from "./club-events-tab";
import { ClubLivesTab } from "./club-lives-tab";
import { ClubModerationTab } from "./club-moderation-tab";
import { ClubAnalyticsTab } from "./club-analytics-tab";

export function ClubDetailPage({ clubId }: { clubId: string }) {
  const t = useT();
  const { can } = useAppContext();
  const canManage = can("Community.Manage");

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchClub(clubId).then((data) => {
      if (active) {
        setClub(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [clubId]);

  const reload = async () => {
    setClub(await fetchClub(clubId));
  };

  const toggleArchive = async () => {
    if (!club) return;
    setClub(await archiveClub(club.id));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <Users className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {t("Club no encontrado")}
        </p>
        <Link
          href="/community/clubs"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("Volver a clubes")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/community/clubs"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("Volver a clubes")}
      </Link>

      {/* Cabecera del club */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-36 sm:h-44" style={clubCoverStyle(club.category)} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl border-4 border-card text-lg font-black text-white shadow-lg"
              style={clubCoverStyle(club.category)}
            >
              {initials(club.name)}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">
                  {club.name}
                </h1>
                <StatusBadge
                  status={t(club.status === "ACTIVO" ? "Activo" : "Archivado")}
                  color={CLUB_STATUS_COLORS[club.status]}
                />
                <StatusBadge
                  status={t(visibilityLabel(club.visibility))}
                  color={VISIBILITY_COLORS[club.visibility]}
                />
                <StatusBadge
                  status={t(club.category)}
                  color={categoryColor(club.category)}
                />
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {club.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  {club.memberCount} {t("miembros")}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserPlus className="size-3.5 text-primary" />
                  {club.maxMembers
                    ? `${club.maxMembers} ${t("Capacidad")}`
                    : t("Sin límite")}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarPlus className="size-3.5 text-primary" />
                  {t("Creado")} {new Date(club.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {club.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleArchive}>
                {club.status === "ACTIVO" ? (
                  <>
                    <Archive data-icon="inline-start" />
                    {t("Archivar")}
                  </>
                ) : (
                  <>
                    <ArchiveRestore data-icon="inline-start" />
                    {t("Restaurar")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={reload}
                title={t("Actualizar")}
              >
                <RefreshCw data-icon="inline-start" />
                {t("Actualizar")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs del club */}
      <Tabs defaultValue="overview">
        <TabsList className="data-horizontal/tabs:h-10 gap-0.5">
          <TabsTrigger
            value="overview"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <LayoutDashboard data-icon="inline-start" />
            {t("Resumen")}
          </TabsTrigger>
          <TabsTrigger
            value="posts"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <FileText data-icon="inline-start" />
            {t("Publicaciones")}
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <CalendarPlus data-icon="inline-start" />
            {t("Eventos")}
          </TabsTrigger>
          <TabsTrigger
            value="lives"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <Radio data-icon="inline-start" />
            {t("Lives")}
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <UserCog data-icon="inline-start" />
            {t("Miembros")}
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <Inbox data-icon="inline-start" />
            {t("Solicitudes")}
          </TabsTrigger>
          <TabsTrigger
            value="moderation"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <ShieldAlert data-icon="inline-start" />
            {t("Moderación")}
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-active:bg-primary data-active:text-white data-active:shadow-sm"
          >
            <BarChart3 data-icon="inline-start" />
            {t("Analítica")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClubOverviewTab club={club} />
        </TabsContent>
        <TabsContent value="posts">
          <ClubPostsTab clubId={club.id} canManage={canManage} />
        </TabsContent>
        <TabsContent value="events">
          <ClubEventsTab clubId={club.id} canManage={canManage} />
        </TabsContent>
        <TabsContent value="lives">
          <ClubLivesTab clubId={club.id} canManage={canManage} />
        </TabsContent>
        <TabsContent value="members">
          <ClubMembersTab clubId={club.id} />
        </TabsContent>
        <TabsContent value="requests">
          <ClubRequestsTab clubId={club.id} />
        </TabsContent>
        <TabsContent value="moderation">
          <ClubModerationTab clubId={club.id} />
        </TabsContent>
        <TabsContent value="analytics">
          <ClubAnalyticsTab clubId={club.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function visibilityLabel(visibility: Club["visibility"]): string {
  switch (visibility) {
    case "PUBLICO":
      return "Público";
    case "PRIVADO":
      return "Privado";
    case "INVITACION":
      return "Solo invitación";
  }
}
