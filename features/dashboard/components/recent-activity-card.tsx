"use client";

import Link from "next/link";
import { Activity, Bot, FileSearch, ShieldCheck } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { ActivityEvent } from "../types";

interface RecentActivityCardProps {
  data: ActivityEvent[];
}

/** Infiere el icono del evento a partir de la acción (sin tocar datos). */
function inferIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes("agente")) return Bot;
  if (a.includes("permiso") || a.includes("rol")) return ShieldCheck;
  if (a.includes("auditor")) return FileSearch;
  return Activity;
}

/**
 * Feed de actividad reciente: timeline con línea vertical, avatar que la
 * enmascara, icono de tipo de evento y hover suave por fila.
 */
export function RecentActivityCard({ data }: RecentActivityCardProps) {
  const t = useT();
  return (
    <div className="flex flex-col">
      <div className="relative flex flex-col">
        {/* Línea de la timeline */}
        <div
          aria-hidden="true"
          className="absolute top-4 bottom-4 left-[15px] w-px bg-border"
        />
        {data.map((event) => {
          const EventIcon = inferIcon(event.action);
          return (
            <div
              key={event.id}
              className="group relative z-10 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-muted/50"
            >
              <div className="relative shrink-0">
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sidebar)] to-brand-teal text-[10px] font-bold text-white shadow-sm ring-2 ring-card">
                  {event.initials}
                </div>
                <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full border border-border bg-card">
                  <EventIcon
                    className="size-2 text-brand-teal"
                    aria-hidden="true"
                  />
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-px overflow-hidden">
                <span className="truncate text-[12.5px] font-medium text-foreground">
                  {event.user}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {event.action}
                </span>
              </div>
              <span className="shrink-0 text-[10px] whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground/70">
                {event.time}
              </span>
            </div>
          );
        })}
      </div>

      <Link
        href="/settings/audit"
        className="mt-2 text-center text-[12px] font-medium text-primary transition-colors hover:text-primary-strong"
      >
        {t("Ver toda la actividad →")}
      </Link>
    </div>
  );
}
