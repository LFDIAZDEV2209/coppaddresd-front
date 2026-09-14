"use client";

import { useT } from "@/providers/i18n-provider";
import { DirectoryIcon, type DirectoryIconKind } from "./directory-icon";
import { cn } from "@/lib/utils";
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
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {defs.map((def) => {
        const value = stats ? def.getValue(stats) : null;
        const active = def.isActive(filters);
        return (
          <button
            data-icon-motion
            key={def.key}
            type="button"
            disabled={!stats}
            onClick={() => onStatFilter(def.filter)}
            aria-pressed={active}
            className={cn(
              "directory-stat group relative flex items-center gap-3 rounded-2xl border bg-card p-4 text-left disabled:pointer-events-none",
              active
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-border",
            )}
          >
            <DirectoryIcon kind={def.icon} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">
                {t(def.label)}
              </span>
              {stats ? (
                <span className="text-3xl leading-tight font-bold tabular-nums text-foreground">
                  {value}
                </span>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
              <span className="text-xs text-muted-foreground">
                {stats ? t(def.context) : "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
