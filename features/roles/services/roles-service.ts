/**
 * Servicio de roles del frontend contra el Auth Service.
 *
 * Cubre el CRUD de roles y re-exporta el servicio de permisos para que el
 * módulo de roles sea autosuficiente (asignación de permisos al rol).
 */

import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { Role, RoleCreateInput, RoleUpdateInput } from "../types";

const PATH = `${env.apiUrl}/api/auth/roles`;

/** Lista completa de roles (GET /api/auth/roles). */
export async function fetchRoles(): Promise<Role[]> {
  return apiFetch<Role[]>(PATH);
}

/** Crea un rol (POST /api/auth/roles) → 201 con el rol creado. */
export async function createRole(input: RoleCreateInput): Promise<Role> {
  return apiFetch<Role>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Actualiza un rol (PUT /api/auth/roles/{id}) → 204. */
export async function updateRole(
  id: string,
  input: RoleUpdateInput,
): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Elimina un rol (DELETE /api/auth/roles/{id}) → 204. */
export async function deleteRole(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

/** Reemplaza todos los permisos de un rol (PUT /api/auth/roles/{id}/permissions). */
export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  await apiFetch<void>(`${PATH}/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionIds }),
  });
}

// Badges de estado y fechas: compartidos con el módulo de usuarios.
export {
  getStatusColor,
  formatDate,
} from "@/features/auth-common/utils";

// Permisos de rol: el módulo de roles expone también la asignación de
// permisos para mantener su API completa (gating con Permissions.Assign).
export {
  fetchPermissions,
  fetchRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
} from "@/features/permissions/services/permissions-service";
