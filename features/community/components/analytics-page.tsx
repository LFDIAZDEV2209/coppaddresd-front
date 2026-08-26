"use client";

import {
  BarChart3,
  Heart,
  MessageCircle,
  MessagesSquare,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunity } from "../hooks/useCommunity";
import { useT } from "@/providers/i18n-provider";

export function AnalyticsPage() {
  const t = useT();
  const { profiles, profilesLoading, feed, feedLoading, feedError } =
    useCommunity();

  const totalLikes = feed.reduce((sum, view) => sum + view.likeCount, 0);
  const totalComments = feed.reduce(
    (sum, view) => sum + view.commentCount,
    0,
  );

  const bannedCount = profiles.filter((p) => p.status === "BANNED").length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t('Analítica de comunidad')}
        description={t('Indicadores básicos de la actividad de la comunidad')}
        icon={BarChart3}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('Perfiles')}
          value={profilesLoading ? "…" : String(profiles.length)}
          context={t('{count} baneados', { count: String(bannedCount) })}
          icon={Users}
          variant="primary"
        />
        <StatCard
          label={t('Publicaciones')}
          value={feedLoading ? "…" : String(feed.length)}
          context={t('Basado en las últimas {count} publicaciones', { count: String(feed.length) })}
          icon={MessagesSquare}
          variant="primary"
        />
        <StatCard
          label={t('Me gusta')}
          value={feedLoading ? "…" : String(totalLikes)}
          context={t('En las publicaciones recientes')}
          icon={Heart}
          variant="info"
        />
        <StatCard
          label={t('Comentarios')}
          value={feedLoading ? "…" : String(totalComments)}
          context={t('En las publicaciones recientes')}
          icon={MessageCircle}
          variant="success"
        />
      </section>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t('Últimas publicaciones')}
          description={t('Actividad más reciente del feed')}
          icon={BarChart3}
          variant="primary"
        />
        {feedLoading ? (
          <div className="p-5">
            {[1, 2, 3].map((item) => (
              <div className="flex gap-4 border-b border-border py-4 last:border-0" key={item}>
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : feedError ? (
          <div className="p-10 text-center text-sm text-destructive">
            {t('No pudimos cargar la actividad de la comunidad.')}
          </div>
        ) : feed.length ? (
          <div className="divide-y divide-border">
            {feed.slice(0, 8).map((view) => {
              const { post } = view;
              return (
                <div
                  className="flex items-start gap-3 p-4"
                  key={post.id}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                    {initials(post.profile.displayName)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {post.profile.displayName}
                      </span>
                      {post.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-[2px] text-[11px] font-semibold text-primary">
                          {t('Fijada')}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {post.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3.5" />
                      {view.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" />
                      {view.commentCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center text-sm text-muted-foreground">
            {t('Todavía no hay publicaciones en la comunidad.')}
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
