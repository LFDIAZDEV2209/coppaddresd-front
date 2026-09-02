"use client";

import { Users, TrendingUp, Activity, Target, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/providers/i18n-provider";
import type { Club } from "../types";
import { formatRelative } from "./clubs-helpers";

export function ClubOverviewTab({ club }: { club: Club }) {
  const t = useT();

  const stats = [
    { icon: Users, label: t("Miembros"), value: String(club.memberCount) },
    {
      icon: Activity,
      label: t("Capacidad"),
      value: club.maxMembers ? String(club.maxMembers) : t("Sin límite"),
    },
    {
      icon: TrendingUp,
      label: t("Creado"),
      value: formatRelative(club.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ScrollText className="size-4 text-primary" />
            <h3 className="text-sm font-bold">{t("Reglas del club")}</h3>
          </div>
          {club.rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Sin reglas definidas")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {club.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {rule}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h3 className="text-sm font-bold">{t("Objetivos")}</h3>
          </div>
          {club.objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Sin objetivos definidos")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {club.objectives.map((objective, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {objective}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
