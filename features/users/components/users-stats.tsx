"use client";

import type { LucideIcon } from "lucide-react";
import { ShieldAlert, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import type { UserStats, UsersFilters } from "../types";

interface UsersStatsProps {
  stats: UserStats | null;
  filters: UsersFilters;
  /** Aplica el filtro asociado al stat (toggle: clic de nuevo = limpiar). */
  onStatFilter: (partial: Partial<UsersFilters>) => void;
}

interface StatDef {
  key: string;
  label: string;
  icon: LucideIcon;
  getValue: (stats: UserStats) => number;
  context: (stats: UserStats) => string;
  isActive: (filters: UsersFilters) => boolean;
  filter: Partial<UsersFilters>;
}

/**
 * Fila compacta de stats del módulo. Cada card es clicable y aplica el
 * filtro asociado (clic de nuevo lo quita) — los números conducen a acción,
 * no son decorativos.
 */
export function UsersStats({ stats, filters, onStatFilter }: UsersStatsProps) {
  const t = useT();
  const tones: Record<string, RainbowTone> = {
    total: "sky",
    active: "green",
    inactive: "slate",
    withoutRoles: "amber",
    newThisWeek: "violet",
  };

  const defs: StatDef[] = [
    {
      key: "total",
      label: "Total usuarios",
      icon: Users,
      getValue: (s) => s.total,
      context: () => t("En la plataforma"),
      isActive: () =>
        filters.status === "all" &&
        filters.role === "all" &&
        filters.createdWithin === "all",
      filter: { status: "all", role: "all", createdWithin: "all" },
    },
    {
      key: "active",
      label: "Activos",
      icon: UserCheck,
      getValue: (s) => s.active,
      context: (s) =>
        s.total > 0
          ? `${Math.round((s.active / s.total) * 100)}% ${t("del total")}`
          : "—",
      isActive: (f) => f.status === "active",
      filter: {
        status: "active",
        role: filters.role,
        createdWithin: filters.createdWithin,
      },
    },
    {
      key: "inactive",
      label: "Inactivos",
      icon: UserX,
      getValue: (s) => s.inactive,
      context: (s) =>
        s.total > 0
          ? `${Math.round((s.inactive / s.total) * 100)}% ${t("del total")}`
          : "—",
      isActive: (f) => f.status === "inactive",
      filter: {
        status: "inactive",
        role: filters.role,
        createdWithin: filters.createdWithin,
      },
    },
    {
      key: "withoutRoles",
      label: "Sin roles",
      icon: ShieldAlert,
      getValue: (s) => s.withoutRoles,
      context: () => t("Sin acceso asignado"),
      isActive: (f) => f.role === "none",
      filter: {
        role: "none",
        status: filters.status,
        createdWithin: filters.createdWithin,
      },
    },
    {
      key: "newThisWeek",
      label: "Nuevos",
      icon: UserPlus,
      getValue: (s) => s.newThisWeek,
      context: () => t("Últimos 7 días"),
      isActive: (f) => f.createdWithin === "7d",
      filter: {
        createdWithin: "7d",
        status: filters.status,
        role: filters.role,
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 @min-[420px]/workspace:grid-cols-2 @min-[700px]/workspace:grid-cols-3 @min-[1100px]/workspace:grid-cols-5">
      {defs.map((def) => {
        const value = stats ? def.getValue(stats) : null;
        const active = def.isActive(filters);
        return (
          <button
            key={def.key}
            data-slot="stat-card"
            style={rainbowStyle(tones[def.key])}
            type="button"
            disabled={!stats}
            onClick={() => onStatFilter(def.filter)}
            aria-pressed={active}
            className={cn(
              "spectrum-card group relative flex min-h-[92px] min-w-0 items-center gap-3 rounded-2xl border bg-primary-soft/25 p-3.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none",
              active
                ? "border-primary ring-1 ring-primary/30"
                : "border-brand-blue-soft/40 hover:border-brand-blue-soft",
            )}
          >
            <span
              className={cn(
                "spectrum-icon flex size-9 shrink-0 items-center justify-center rounded-full text-white",
              )}
            >
              <def.icon aria-hidden="true" className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] leading-3.5 font-semibold tracking-[0.02em] text-muted-foreground uppercase">
                {t(def.label)}
              </span>
              {stats ? (
                <span className="text-2xl leading-7 font-bold tabular-nums text-primary-soft-foreground">
                  {value}
                </span>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
              <span className="text-[11px] leading-3.5 text-muted-foreground">
                {stats ? def.context(stats) : "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
