"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Activity, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";
import type { ClubAnalytics } from "../types";
import { fetchClubAnalytics } from "../mock/clubs-api";

export function ClubAnalyticsTab({ clubId }: { clubId: string }) {
  const t = useT();
  const [analytics, setAnalytics] = useState<ClubAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchClubAnalytics(clubId).then((data) => {
      if (active) {
        setAnalytics(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [clubId]);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {t("Cargando analítica…")}
      </div>
    );
  }

  const stats = [
    {
      icon: Users,
      label: t("Miembros activos"),
      value: analytics.activeMembers,
    },
    {
      icon: TrendingUp,
      label: t("Crecimiento semanal"),
      value: `${analytics.weeklyGrowth}%`,
    },
    {
      icon: Activity,
      label: t("Engagement"),
      value: `${analytics.engagement}%`,
    },
    {
      icon: Target,
      label: t("Retención (30 días)"),
      value: `${analytics.retention}%`,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-semibold">
                  {stat.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-2xl font-extrabold">
                {stat.value}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Publicaciones más exitosas")}
            description={t("Por reacciones y comentarios")}
            icon={Activity}
            variant="primary"
          />
          {analytics.topPosts.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              {t("Sin datos todavía")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {analytics.topPosts.map((post, index) => (
                <div
                  key={post.postId}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {post.likes} {t("reacciones")} · {post.comments}{" "}
                      {t("comentarios")}
                    </span>
                  </div>
                  <div className="flex items-end gap-1">
                    {Array.from({
                      length: Math.min(post.likes + post.comments, 10),
                    }).map((_, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-primary/70"
                        style={{ height: `${6 + i * 2}px` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Participación por evento")}
            description={t("Asistentes confirmados")}
            icon={Users}
            variant="primary"
          />
          {analytics.eventParticipation.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              {t("Sin eventos con datos todavía")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {analytics.eventParticipation.map((event) => (
                <div
                  key={event.eventId}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <span className="truncate text-sm font-semibold">
                    {event.title}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                    {event.confirmed} {t("confirmados")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
