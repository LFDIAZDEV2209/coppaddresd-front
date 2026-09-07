"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  UserRound,
  Users,
  Video,
  Wallet,
  HeartPulse,
  Search,
  CheckCircle2,
  ChevronDown,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { groupPermissionsByModule } from "@/features/permissions/types";
import type { Permission } from "@/features/permissions/types";

interface PermissionSelectorProps {
  permissions: Permission[];
  /** Ids heredados por los roles seleccionados (no repetibles como directos). */
  inheritedIds: Set<string>;
  /** Mapa id permiso → nombre del rol que lo hereda (para el badge). */
  inheritedOrigin?: Map<string, string>;
  selected: Set<string>;
  onToggle: (permissionId: string) => void;
  disabled?: boolean;
}

/** Icono por módulo de permiso (fallback KeyRound). */
const MODULE_ICONS: Record<string, LucideIcon> = {
  Users: Users,
  Roles: ShieldCheck,
  Permissions: KeyRound,
  Agents: Bot,
  Appointments: CalendarDays,
  Patients: UserRound,
  Documents: FileText,
  ClinicalRecords: Stethoscope,
  Telemedicine: Video,
  HealthTests: HeartPulse,
  Finance: Wallet,
  Reports: BarChart3,
  Inventory: Package,
  Store: ShoppingBag,
  Media: ImageIcon,
  Audit: ScrollText,
  System: Settings,
  Community: Users,
  Organizations: Building2,
  Clinics: Building2,
  Locations: FolderKanban,
  Employees: UserRound,
  Professionals: Stethoscope,
};

/**
 * Selector de permisos directos en ACORDEÓN por módulo:
 * - cabecera clicable con contador seleccionado/total y chevron,
 * - descripción humana + código técnico por permiso,
 * - búsqueda instantánea (expande los grupos con coincidencias),
 * - permisos heredados por roles bloqueados ("ya incluidos").
 */
export function PermissionSelector({
  permissions,
  inheritedIds,
  inheritedOrigin,
  selected,
  onToggle,
  disabled = false,
}: PermissionSelectorProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => groupPermissionsByModule(permissions),
    [permissions],
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.name.toLowerCase().includes(q) ||
            permission.code.toLowerCase().includes(q) ||
            (permission.description ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, query]);

  const directCount = useMemo(
    () => [...selected].filter((id) => !inheritedIds.has(id)).length,
    [selected, inheritedIds],
  );

  const toggleModule = (module: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  // Grupos abiertos por defecto: los que ya tienen selección (solo la primera
  // vez; después manda el estado del usuario).
  const [initialized, setInitialized] = useState(false);
  if (!initialized && groups.length > 0) {
    setInitialized(true);
    const initial = new Set<string>();
    for (const group of groups) {
      if (group.permissions.some((permission) => selected.has(permission.id))) {
        initial.add(group.module);
      }
    }
    if (initial.size === 0 && groups[0]) initial.add(groups[0].module);
    setOpenModules(initial);
  }

  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Buscar permiso...")}
            className="h-9 bg-card pl-9"
            aria-label={t("Buscar permisos")}
          />
        </div>
        <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary">
          {directCount}{" "}
          {directCount === 1 ? t("permiso directo") : t("permisos directos")}
        </span>
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-card/60 p-2">
        {filteredGroups.map((group) => {
          const grantable = group.permissions.filter(
            (permission) => !inheritedIds.has(permission.id),
          );
          const selectedCount = grantable.filter((permission) =>
            selected.has(permission.id),
          ).length;
          const open = searching || openModules.has(group.module);
          const Icon = MODULE_ICONS[group.module] ?? KeyRound;

          return (
            <section
              key={group.module}
              className={cn(
                "overflow-hidden rounded-xl border transition-colors",
                open
                  ? "border-primary/30 bg-card"
                  : "border-border/60 bg-card/70 hover:border-border",
              )}
            >
              {/* Cabecera del acordeón */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleModule(group.module)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleModule(group.module);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                  !disabled && "cursor-pointer hover:bg-muted/50",
                )}
                aria-expanded={open}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    open || selectedCount > 0
                      ? "bg-brand-gradient text-white shadow-sm"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[12px] font-bold tracking-wide text-foreground uppercase">
                    {group.module}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {grantable.length} {t("permisos")}
                    {selectedCount > 0 &&
                      ` · ${selectedCount} ${t("seleccionados")}`}
                  </span>
                </span>
                {selectedCount > 0 && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10.5px] font-bold text-success-foreground">
                    {selectedCount}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180 text-primary",
                  )}
                />
              </div>

              {/* Contenido */}
              {open && (
                <div className="flex flex-col gap-0.5 border-t border-border/50 px-2 py-2">
                  {grantable.length > 1 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        const allSelected = grantable.every((permission) =>
                          selected.has(permission.id),
                        );
                        grantable.forEach((permission) => {
                          const isChecked = selected.has(permission.id);
                          if (allSelected ? isChecked : !isChecked) {
                            onToggle(permission.id);
                          }
                        });
                      }}
                      className="self-start rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                    >
                      {grantable.every((permission) =>
                        selected.has(permission.id),
                      )
                        ? t("Quitar todos")
                        : t("Agregar todos")}
                    </button>
                  )}
                  {group.permissions.map((permission) => {
                    const inherited = inheritedIds.has(permission.id);
                    const checked = selected.has(permission.id) || inherited;
                    const originRole = inheritedOrigin?.get(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg p-2 transition-colors",
                          inherited
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-muted/60",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled || inherited}
                          onCheckedChange={() => onToggle(permission.id)}
                          className="mt-0.5"
                          aria-label={permission.name}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[12.5px] leading-tight font-medium text-foreground">
                              {permission.name}
                            </span>
                            {inherited && originRole && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-teal-50 px-1.5 py-px text-[9.5px] font-semibold text-teal-700">
                                <CheckCircle2 className="size-2.5" />
                                {t("Rol")}: {originRole}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground/80">
                            {permission.code}
                          </span>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            {permission.description ??
                              t("Permite usar esta función de la plataforma.")}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {filteredGroups.length === 0 && (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            {t("Sin permisos que coincidan con la búsqueda.")}
          </p>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
        <Lock className="mt-0.5 size-3 shrink-0" />
        {t(
          "Los permisos que tus roles ya incluyen aparecen bloqueados: no hace falta concederlos de nuevo.",
        )}
      </p>
    </div>
  );
}
