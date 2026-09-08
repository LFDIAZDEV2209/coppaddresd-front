"use client";

import type { LucideIcon } from "lucide-react";
import { ShieldAlert, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  iconBg: string;
  /** Color de la barra de acento superior (estilo dashboard). */
  accent: string;
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

  const defs: StatDef[] = [
    {
      key: "total",
      label: "Total usuarios",
      icon: Users,
      iconBg: "bg-brand-gradient text-white shadow-sm",
      accent: "var(--brand-gradient)",
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
      iconBg: "bg-success text-white",
      accent: "var(--success)",
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
      iconBg: "bg-slate-400 text-white",
      accent: "#94a3b8",
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
      iconBg: "bg-warning text-white",
      accent: "var(--warning)",
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
      iconBg: "bg-info text-white",
      accent: "var(--info)",
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
    <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {defs.map((def) => {
        const value = stats ? def.getValue(stats) : null;
        const active = def.isActive(filters);
        return (
          <button
            key={def.key}
            type="button"
            disabled={!stats}
            onClick={() => onStatFilter(def.filter)}
            aria-pressed={active}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3.5 pl-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none",
              active
                ? "border-primary ring-1 ring-primary/30"
                : "border-border/70 hover:border-border",
            )}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: def.accent }}
            />
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                def.iconBg,
              )}
            >
              <def.icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t(def.label)}
              </span>
              {stats ? (
                <span className="text-xl leading-none font-bold tabular-nums text-foreground">
                  {value}
                </span>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
              <span className="truncate text-[10.5px] text-muted-foreground">
                {stats ? def.context(stats) : "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
