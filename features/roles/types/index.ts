/**
 * Tipos del módulo de roles del Auth Service.
 */

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  /** Rol de sistema (protegido: requiere System.AdminSettings para editar/eliminar). */
  isSystem: boolean;
  createdAt: string;
}

/** Cuerpo de POST /api/auth/roles (creación). */
export interface RoleCreateInput {
  name: string;
  description?: string | null;
}

/** Cuerpo de PUT /api/auth/roles/{id} (actualización parcial). */
export interface RoleUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}
