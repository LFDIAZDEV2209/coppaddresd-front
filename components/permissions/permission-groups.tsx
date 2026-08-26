"use client";

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
}

/**
 * Checkboxes de permisos agrupados por módulo (Users, Roles, Permissions,
 * Agents, ...). Componente presentacional compartido por los módulos de
 * usuarios y roles para la asignación de permisos.
 */
export function PermissionGroups({
  groups,
  selected,
  onToggle,
  disabled = false,
  className,
}: PermissionGroupsProps) {
  const t = useT();
  return (
    <div className={cn("grid grid-cols-1 gap-6 md:grid-cols-2", className)}>
      {groups.map((group) => {
        const groupChecked = group.permissions.every((permission) =>
          selected.has(permission.id),
        );
        const groupIndeterminate =
          !groupChecked &&
          group.permissions.some((permission) => selected.has(permission.id));

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

        return (
          <div key={group.module} className="flex flex-col gap-2">
            <label className="flex items-center gap-2 py-1">
              <Checkbox
                checked={groupChecked}
                indeterminate={groupIndeterminate}
                onCheckedChange={toggleGroup}
                disabled={disabled}
                aria-label={t("Seleccionar todos los permisos de {module}", { module: group.module })}
              />
              <span className="text-[11px] font-bold tracking-wide text-foreground uppercase">
                {group.module}
              </span>
            </label>

            {group.permissions.map((permission) => (
              <label
                key={permission.id}
                className="flex items-center gap-2 py-0.5"
              >
                <Checkbox
                  checked={selected.has(permission.id)}
                  onCheckedChange={() => {
                    if (!disabled) onToggle(permission.id);
                  }}
                  disabled={disabled}
                  aria-label={permission.name}
                />
                <span className="flex flex-col leading-tight">
                  <span className="text-[12px] text-foreground">
                    {permission.name}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {permission.code}
                  </span>
                </span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
