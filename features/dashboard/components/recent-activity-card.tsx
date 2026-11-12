"use client";

import Link from "next/link";
import { Activity, Bot, FileSearch, ShieldCheck } from "lucide-react";
import { useI18n, useT } from "@/providers/i18n-provider";
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
 * enmascara, icono de tipo de evento y hover suave por fila. Sin eventos
 * muestra un estado vacío amigable (t. 2.4) en lugar de timeline vacía.
 */
export function RecentActivityCard({ data }: RecentActivityCardProps) {
  const t = useT();
  const { lang } = useI18n();
  return (
    <div className="@container/feed flex flex-col">
      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground">
            {t("Sin actividad reciente")}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {t(
              "Los movimientos del equipo aparecerán aquí a medida que ocurran",
            )}
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col">
          {data.map((event) => {
            const EventIcon = inferIcon(event.action);
            return (
              <div
                key={event.id}
                className="group grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border/60 py-3 first:pt-0 last:border-0 @min-[600px]/feed:grid-cols-[2rem_minmax(0,1fr)_auto]"
              >
                <div className="relative shrink-0">
                  <div className="bg-brand-gradient flex size-8 items-center justify-center rounded-full text-[10px] font-bold text-white">
                    {event.initials}
                  </div>
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full border border-border bg-card">
                    <EventIcon
                      className="size-2 text-brand-teal"
                      aria-hidden="true"
                    />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[12.5px] [overflow-wrap:anywhere] font-medium text-foreground">
                    {event.user}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t(
                      (
                        {
                          completado: "Completado",
                          error: "Error",
                          ejecutando: "En ejecución",
                        } as Record<string, string>
                      )[event.action] ?? event.action,
                    )}
                  </span>
                </div>
                <time
                  dateTime={event.time}
                  title={new Date(event.time).toLocaleString(
                    lang === "en" ? "en-US" : "es-CO",
                  )}
                  className="col-start-2 text-[11px] text-muted-foreground @min-[600px]/feed:col-start-auto @min-[600px]/feed:text-right"
                >
                  {new Date(event.time).toLocaleString(
                    lang === "en" ? "en-US" : "es-CO",
                    {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </time>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/agents/monitoring"
        className="mt-2 self-end rounded-md py-2 text-xs font-medium text-primary transition-colors hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("Ver ejecuciones →")}
      </Link>
    </div>
  );
}
