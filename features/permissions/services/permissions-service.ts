/**
 * Servicio de permisos del frontend contra el Auth Service.
 *
 * Cubre los endpoints de catálogo y las asignaciones de permisos a roles y a
 * usuarios. Se comparte entre el módulo de usuarios y el de roles.
 */

import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { Permission } from "../types";

const PATH = `${env.authApiUrl}/api/permissions`;

/** Catálogo completo de permisos (GET /api/permissions). */
export async function fetchPermissions(): Promise<Permission[]> {
  return apiFetch<Permission[]>(PATH);
}

/** Permisos actuales de un rol (GET /api/permissions/role/{roleId}). */
export async function fetchRolePermissions(roleId: string): Promise<Permission[]> {
  return apiFetch<Permission[]>(`${PATH}/role/${roleId}`);
}

/** Asigna un permiso a un rol (POST /api/permissions/role/{roleId}). */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await apiFetch<void>(`${PATH}/role/${roleId}`, {
    method: "POST",
    body: JSON.stringify({ permissionId }),
  });
}

/** Quita un permiso de un rol (DELETE /api/permissions/role/{roleId}/{permissionId}). */
export async function removePermissionFromRole(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await apiFetch<void>(`${PATH}/role/${roleId}/${permissionId}`, {
    method: "DELETE",
  });
}

/** Permisos directos de un usuario (GET /api/permissions/user/{userId}). */
export async function fetchUserPermissions(userId: string): Promise<Permission[]> {
  return apiFetch<Permission[]>(`${PATH}/user/${userId}`);
}
