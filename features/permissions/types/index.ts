/**
 * Tipos del catálogo de permisos del Auth Service.
 *
 * Los permisos son un catálogo central (por módulo: "Users", "Roles",
 * "Permissions", "Agents", ...) que se asigna a roles y, opcionalmente, de
 * forma directa a usuarios. Este módulo NO tiene página propia: solo expone
 * tipos, el servicio de API y componentes compartidos para los módulos de
 * usuarios y roles.
 */

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** Módulo al que pertenece el permiso (ej. "Users", "Roles", "Agents"). */
  module: string;
  createdAt: string;
}

/** Grupo de permisos de un mismo módulo, para renderizarlos juntos en la UI. */
export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

/**
 * Agrupa el catálogo de permisos por `module` y ordena cada grupo por nombre.
 * Se usa para los checkboxes de asignación en usuarios y roles.
 */
export function groupPermissionsByModule(
  permissions: Permission[],
): PermissionGroup[] {
  const byModule = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const list = byModule.get(permission.module) ?? [];
    list.push(permission);
    byModule.set(permission.module, list);
  }

  return Array.from(byModule.entries())
    .map(([module, modulePermissions]) => ({
      module,
      permissions: [...modulePermissions].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
}
