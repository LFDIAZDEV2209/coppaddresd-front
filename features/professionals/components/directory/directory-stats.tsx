"use client";

import { useT } from "@/providers/i18n-provider";
import {
  MailPlus,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Definición de cada tarjeta de estadísticas. */
interface StatDef {
  key: string;
  label: string;
  icon: typeof Users;
  iconBg: string;
  accent: string;
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
  const defs: StatDef[] = [
    {
      key: "total",
      label: "Total de profesionales",
      icon: Users,
      iconBg: "bg-brand-gradient text-white shadow-sm",
      accent: "var(--brand-gradient)",
      getValue: (s) => s.total,
      context: "Directorio completo",
      isActive: () => filters.status === "all",
      filter: { status: "all" },
    },
    {
      key: "active",
      label: "Activos",
      icon: UserCheck,
      iconBg: "bg-success text-white",
      accent: "var(--success)",
      getValue: (s) => s.active,
      context: "En el equipo activo",
      isActive: (f) => f.status === "Active",
      filter: { status: "Active" },
    },
    {
      key: "invited",
      label: "Invitados",
      icon: MailPlus,
      iconBg: "bg-warning text-white",
      accent: "var(--warning)",
      getValue: (s) => s.invited,
      context: "Pendientes de primer acceso",
      isActive: (f) => f.status === "Invited",
      filter: { status: "Invited" },
    },
    {
      key: "inactive",
      label: "Inactivos",
      icon: UserX,
      iconBg: "bg-slate-400 text-white",
      accent: "#94a3b8",
      getValue: (s) => s.inactive,
      context: "Sin actividad en el ERP",
      isActive: (f) => f.status === "Inactive",
      filter: { status: "Inactive" },
    },
  ];

  return (
    <div className="stagger-children grid grid-cols-2 gap-3 xl:grid-cols-4">
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
                {stats ? t(def.context) : "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
