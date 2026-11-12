"use client";

import { useT } from "@/providers/i18n-provider";
import { type DirectoryIconKind } from "./directory-icon";
import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";
import { Users, UserCheck, UserPlus, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Definición de cada tarjeta de estadísticas. */
interface StatDef {
  key: string;
  label: string;
  icon: DirectoryIconKind;
  getValue: (stats: {
    total: number;
    active: number;
    invited: number;
    inactive: number;
  }) => number;
  context: string;
  isActive: (filters: { status: string }) => boolean;
  filter: { status: string };
}

// --- Stats clicables (patrón del módulo Usuarios) ---

export function DirectoryStats({
  stats,
  filters,
  onStatFilter,
}: {
  stats: {
    total: number;
    active: number;
    invited: number;
    inactive: number;
  } | null;
  filters: { status: string };
  onStatFilter: (partial: { status: string }) => void;
}) {
  const t = useT();
  const tones: Record<string, RainbowTone> = {
    total: "sky",
    active: "green",
    invited: "violet",
    inactive: "slate",
  };
  const icons = {
    team: Users,
    active: UserCheck,
    invited: UserPlus,
    inactive: UserX,
  };
  const defs: StatDef[] = [
    {
      key: "total",
      label: "Total de profesionales",
      icon: "team",
      getValue: (s) => s.total,
      context: "Directorio completo",
      isActive: () => filters.status === "all",
      filter: { status: "all" },
    },
    {
      key: "active",
      label: "Activos",
      icon: "active",
      getValue: (s) => s.active,
      context: "En el equipo activo",
      isActive: (f) => f.status === "Active",
      filter: { status: "Active" },
    },
    {
      key: "invited",
      label: "Invitados",
      icon: "invited",
      getValue: (s) => s.invited,
      context: "Pendientes de primer acceso",
      isActive: (f) => f.status === "Invited",
      filter: { status: "Invited" },
    },
    {
      key: "inactive",
      label: "Inactivos",
      icon: "inactive",
      getValue: (s) => s.inactive,
      context: "Sin actividad en el ERP",
      isActive: (f) => f.status === "Inactive",
      filter: { status: "Inactive" },
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 @min-[420px]/workspace:grid-cols-2 @min-[1000px]/workspace:grid-cols-4">
      {defs.map((def) => {
        const value = stats ? def.getValue(stats) : null;
        const active = def.isActive(filters);
        const Icon = icons[def.icon];
        return (
          <button
            data-slot="stat-card"
            style={rainbowStyle(tones[def.key])}
            key={def.key}
            type="button"
            disabled={!stats}
            onClick={() => onStatFilter(def.filter)}
            aria-pressed={active}
            className={cn(
              "spectrum-card group relative flex min-h-[92px] min-w-0 items-center gap-3 rounded-2xl border bg-primary-soft/25 p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none",
              active
                ? "border-primary ring-1 ring-primary"
                : "border-brand-blue-soft/40 hover:border-brand-blue-soft",
            )}
          >
            <span
              aria-hidden="true"
              className="spectrum-icon flex size-9 shrink-0 items-center justify-center rounded-full text-white"
            >
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] leading-3.5 font-semibold uppercase tracking-[0.02em] text-muted-foreground">
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
                {stats ? t(def.context) : "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
