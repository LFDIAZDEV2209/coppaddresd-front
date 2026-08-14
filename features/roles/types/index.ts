/**
 * Tipos del módulo de roles del Auth Service.
 */

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Cuerpo de POST /api/roles (creación). */
export interface RoleCreateInput {
  name: string;
  description?: string | null;
}

/** Cuerpo de PUT /api/roles/{id} (actualización parcial). */
export interface RoleUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}
