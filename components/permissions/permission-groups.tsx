"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PermissionGroup } from "@/features/permissions/types";
import { useT } from "@/providers/i18n-provider";

interface PermissionGroupsProps {
  groups: PermissionGroup[];
  selected: Set<string>;
  onToggle: (permissionId: string) => void;
  disabled?: boolean;
  className?: string;
  /**
   * Texto de búsqueda: filtra permisos por nombre/código y oculta los grupos
   * sin coincidencias (con búsqueda activa todos los grupos quedan expandidos).
   */
  search?: string;
}

/**
 * Checkboxes de permisos agrupados por módulo (Users, Roles, Permissions,
 * Agents, ...) como tarjetas colapsables con contador. Compartido por los
 * módulos de usuarios y roles para la asignación de permisos.
 */
export function PermissionGroups({
  groups,
  selected,
  onToggle,
  disabled = false,
  className,
  search = "",
}: PermissionGroupsProps) {
  const t = useT();
  const query = search.trim().toLowerCase();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const visibleGroups = useMemo(() => {
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.name.toLowerCase().includes(query) ||
            permission.code.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, query]);

  const toggleCollapse = (module: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-4 md:grid-cols-2",
        className,
      )}
    >
      {visibleGroups.map((group) => {
        const groupChecked = group.permissions.every((permission) =>
          selected.has(permission.id),
        );
        const groupIndeterminate =
          !groupChecked &&
          group.permissions.some((permission) => selected.has(permission.id));
        const open = Boolean(query) || !collapsed.has(group.module);

        const toggleGroup = () => {
          if (disabled) return;
          // Marca/desmarca el grupo completo: cuando está completo se quitan
          // todos, si no se agregan los que faltan.
          group.permissions.forEach((permission) => {
            const isChecked = selected.has(permission.id);
            if (groupChecked ? isChecked : !isChecked) {
              onToggle(permission.id);
            }
          });
        };

        const checkedCount = group.permissions.filter((permission) =>
          selected.has(permission.id),
        ).length;

        return (
          <div
            key={group.module}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/40 px-3 py-2.5">
              <Checkbox
                checked={groupChecked}
                indeterminate={groupIndeterminate}
                onCheckedChange={toggleGroup}
                disabled={disabled}
                aria-label={t("Seleccionar todos los permisos de {module}", {
                  module: group.module,
                })}
              />
              <button
                type="button"
                onClick={() => toggleCollapse(group.module)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="truncate text-[11px] font-bold uppercase tracking-wide text-foreground">
                  {group.module}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-border/80 bg-card text-[10px] font-semibold text-muted-foreground"
                  >
                    {checkedCount}/{group.permissions.length}
                  </Badge>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform duration-200",
                      !open && "-rotate-90",
                    )}
                    aria-hidden="true"
                  />
                </span>
              </button>
            </div>

            {open && (
              <div className="flex flex-col gap-0.5 px-2 py-2">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(permission.id)}
                      onCheckedChange={() => {
                        if (!disabled) onToggle(permission.id);
                      }}
                      disabled={disabled}
                      aria-label={permission.name}
                    />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-[12px] text-foreground">
                        {permission.name}
                      </span>
                      <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                        {permission.code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
