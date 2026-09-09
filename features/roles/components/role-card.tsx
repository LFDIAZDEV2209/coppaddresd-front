"use client";

import { Check, Key, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/feedback/status-badge";
import { useT } from "@/providers/i18n-provider";
import type { Role } from "../types";
import { getStatusColor } from "../services/roles-service";

interface RoleCardProps {
  role: Role;
  selected: boolean;
  /** Cantidad de permisos del rol (undefined mientras carga en segundo plano). */
  permissionCount?: number;
  onSelect: () => void;
}

/**
 * Tarjeta de rol para el listado lateral del módulo de roles. La selección
 * se comunica con fondo + borde + ring + check (no solo color).
 */
export function RoleCard({
  role,
  selected,
  permissionCount,
  onSelect,
}: RoleCardProps) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-all duration-200 ${
        selected
          ? "border-primary bg-primary-soft shadow-sm ring-1 ring-primary/25"
          : "border-border bg-card hover:border-border-strong hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
        </div>
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
          {role.name}
        </h3>
        {selected && (
          <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
        )}
      </div>
      <p className="line-clamp-1 text-[11.5px] leading-snug text-muted-foreground">
        {role.description || t("Sin descripción")}
      </p>
      <div className="flex items-center gap-2">
        <StatusBadge
          status={role.isActive ? t("Activo") : t("Inactivo")}
          color={getStatusColor(role.isActive)}
        />
        {role.isSystem && (
          <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {t("Sistema")}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Key className="size-3" aria-hidden="true" />
          {permissionCount === undefined ? (
            <Skeleton className="h-3 w-10" />
          ) : (
            t("{count} permisos", { count: String(permissionCount) })
          )}
        </span>
      </div>
    </button>
  );
}
