/**
 * Servicio de usuarios del frontend contra el Auth Service.
 *
 * La lista completa llega por GET /api/auth/users (Users.View) y el filtrado,
 * búsqueda y paginación se hacen client-side (mismo patrón que media).
 * La creación y edición usan UN SOLO request que incluye los conjuntos
 * completos de roles y permisos (el backend hace el sync total en una
 * transacción; evita el N+1 de asignaciones).
 */

import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  PaginatedResult,
  User,
  UserCreateInput,
  UserUpdateInput,
  UsersFilters,
} from "../types";
import type { Role } from "@/features/roles/types";

const PATH = `${env.apiUrl}/api/auth/users`;

/**
 * Lista paginada de usuarios con filtros aplicados client-side.
 * `signal` permite abortar la request cuando cambian filtros/página (guard de
 * secuencia en use-users).
 */
export async function fetchUsers(
  page: number,
  pageSize: number,
  filters: UsersFilters,
  signal?: AbortSignal,
): Promise<PaginatedResult<User>> {
  const users = await apiFetch<User[]>(PATH, { signal });

  const query = filters.search.trim().toLowerCase();
  const filtered = users.filter((user) => {
    if (query) {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      if (!fullName.includes(query) && !email.includes(query)) return false;
    }
    if (filters.status !== "all") {
      const active = filters.status === "active";
      if (user.isActive !== active) return false;
    }
    if (filters.role !== "all" && !user.roles.includes(filters.role)) {
      return false;
    }
    return true;
  });

  // Los más recientes primero.
  filtered.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/**
 * Crea el usuario con sus roles y permisos en UNA llamada
 * (POST /api/auth/users, AllowAnonymous). El backend valida la existencia de los
 * ids y persiste todo en una transacción; si el caller es anónimo o no tiene
 * permisos de asignación y se envían roles/permisos → 403.
 */
export async function createUser(input: UserCreateInput): Promise<User> {
  return apiFetch<User>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Actualiza el perfil y hace sync TOTAL de roles y permisos directos en UNA
 * llamada (PUT /api/auth/users/{id}). El front siempre envía los conjuntos
 * completos (el backend distingue null = no tocar de lista vacía = quitar
 * todo). Requiere Users.Update y, si se envían asignaciones, Roles.Assign +
 * Permissions.Assign → 403 si faltan.
 */
export async function updateUser(
  id: string,
  input: UserUpdateInput,
): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Elimina un usuario (DELETE /api/auth/users/{id}) → 204. */
export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`${PATH}/${id}`, { method: "DELETE" });
}

// --- Lecturas de asignaciones del usuario (precarga del form de edición) ---

/** Roles asignados a un usuario (GET /api/auth/roles/user/{userId}). */
export async function fetchUserRoles(userId: string): Promise<Role[]> {
  return apiFetch<Role[]>(`${env.apiUrl}/api/auth/roles/user/${userId}`);
}

// --- Helpers de presentación ---

export function getFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function getInitials(user: User): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() ||
    "US";
}

export function getStatusLabel(active: boolean): "Activo" | "Inactivo" {
  return active ? "Activo" : "Inactivo";
}

// Badges de estado y fechas: compartidos con el módulo de roles.
export {
  getStatusColor,
  formatDate,
} from "@/features/auth-common/utils";

/** Catálogo de roles para el multi-select (GET /api/auth/roles). */
export { fetchRoles } from "@/features/roles/services/roles-service";

/** Catálogo de permisos y permisos directos del usuario (precarga del form). */
export {
  fetchPermissions,
  fetchUserPermissions,
} from "@/features/permissions/services/permissions-service";
