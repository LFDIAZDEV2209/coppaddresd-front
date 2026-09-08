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
  PermissionWithOrigin,
  User,
  UserCreateInput,
  UserSort,
  UserStats,
  UserUpdateInput,
  UsersFilters,
} from "../types";
import { getMockLastAccess } from "./users-mock";
import type { Permission } from "@/features/permissions/types";
import type { Role } from "@/features/roles/types";
import {
  fetchRolePermissions,
  fetchUserPermissions,
} from "@/features/permissions/services/permissions-service";

const PATH = `${env.apiUrl}/api/auth/users`;

const CREATED_WITHIN_MS: Record<UsersFilters["createdWithin"], number> = {
  all: Number.POSITIVE_INFINITY,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

/**
 * Lista paginada de usuarios con filtros + ordenamiento aplicados client-side.
 * `signal` permite abortar la request cuando cambian filtros/página (guard de
 * secuencia en use-users).
 */
export async function fetchUsers(
  page: number,
  pageSize: number,
  filters: UsersFilters,
  sort: UserSort,
  signal?: AbortSignal,
): Promise<PaginatedResult<User>> {
  const users = await apiFetch<User[]>(PATH, { signal });

  const filtered = filterUsers(users, filters);
  sortUsers(filtered, sort);

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

/** Búsqueda (nombre, apellido, email) + filtros de estado/rol/fecha/sin roles. */
export function filterUsers(users: User[], filters: UsersFilters): User[] {
  const query = filters.search.trim().toLowerCase();
  const withinMs = CREATED_WITHIN_MS[filters.createdWithin];
  const now = Date.now();

  return users.filter((user) => {
    if (query) {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      if (!fullName.includes(query) && !email.includes(query)) return false;
    }
    if (filters.status !== "all") {
      const active = filters.status === "active";
      if (user.isActive !== active) return false;
    }
    if (filters.role === "none") {
      // "Sin roles" solo cuando no hay roles globales NI scoped.
      const hasScoped = (user.scopedRoles?.length ?? 0) > 0;
      if (user.roles.length > 0 || hasScoped) return false;
    } else if (filters.role !== "all" && !user.roles.includes(filters.role)) {
      return false;
    }
    if (
      withinMs !== Number.POSITIVE_INFINITY &&
      now - new Date(user.createdAt).getTime() > withinMs
    ) {
      return false;
    }
    return true;
  });
}

/** Ordenamiento client-side; "lastAccess" usa el mock determinista. */
export function sortUsers(users: User[], sort: UserSort): User[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  const byField: Record<
    NonNullable<UserSort["field"]>,
    (a: User, b: User) => number
  > = {
    name: (a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "es",
      ),
    email: (a, b) => a.email.localeCompare(b.email, "es"),
    status: (a, b) => Number(b.isActive) - Number(a.isActive),
    createdAt: (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    lastAccess: (a, b) => getMockLastAccess(a.id) - getMockLastAccess(b.id),
  };

  if (sort.field) {
    users.sort((a, b) => factor * byField[sort.field!](a, b));
  } else {
    // Sin orden activo: los más recientes primero (default histórico).
    users.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  return users;
}

/** Obtiene un usuario por id (GET /api/auth/users/{id}, Users.View). */
export async function fetchUser(id: string): Promise<User> {
  return apiFetch<User>(`${PATH}/${id}`);
}

/**
 * Estadísticas del módulo calculadas sobre la lista completa (misma fuente
 * que la tabla): total, activos, inactivos, sin roles y creados en 7 días.
 */
export async function fetchUserStats(): Promise<UserStats> {
  const users = await apiFetch<User[]>(PATH);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let active = 0;
  let withoutRoles = 0;
  let newThisWeek = 0;

  for (const user of users) {
    if (user.isActive) active++;
    if (user.roles.length === 0 && (user.scopedRoles?.length ?? 0) === 0)
      withoutRoles++;
    if (new Date(user.createdAt).getTime() >= weekAgo) newThisWeek++;
  }

  return {
    total: users.length,
    active,
    inactive: users.length - active,
    withoutRoles,
    newThisWeek,
  };
}

/**
 * Permisos del usuario para la vista de detalle, con ORIGEN:
 * - heredados: unión de los permisos de cada rol asignado (etiquetados con
 *   el nombre del rol que los aporta).
 * - directos: los asignados directamente al usuario.
 * Los heredados se deduplican conservando el primer rol que los aporta.
 */
export async function fetchUserPermissionSummary(
  userId: string,
  roles: Role[],
): Promise<{ inherited: PermissionWithOrigin[]; direct: Permission[] }> {
  const direct = await fetchUserPermissions(userId);

  const byRole = await Promise.all(
    roles.map(async (role) => ({
      roleName: role.name,
      permissions: await fetchRolePermissions(role.id),
    })),
  );

  const inherited: PermissionWithOrigin[] = [];
  const seen = new Set<string>();
  for (const entry of byRole) {
    for (const permission of entry.permissions) {
      if (seen.has(permission.id)) continue;
      seen.add(permission.id);
      inherited.push({ ...permission, originRole: entry.roleName });
    }
  }

  return { inherited, direct };
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

// --- Creación masiva de usuarios (CSV) ---

/** Fila individual enviada al bulk endpoint de usuarios. */
export interface BulkCreateUserRowInput {
  firstName: string;
  lastName: string;
  email: string;
  roleName: string | null;
  status: string;
}

/** Resultado individual de una fila en la importación masiva. */
export interface BulkUserRowResult {
  line: number;
  success: boolean;
  userId?: string;
  email?: string;
  temporaryPassword?: string;
  error?: string;
}

/** Resultado agregado de la importación masiva de usuarios. */
export interface BulkCreateUsersResult {
  results: BulkUserRowResult[];
  created: number;
  failed: number;
}

/**
 * Crea usuarios de forma masiva.
 * POST /api/auth/users/bulk — cada fila se procesa de forma independiente.
 */
export async function createBulkUsers(
  rows: BulkCreateUserRowInput[],
): Promise<BulkCreateUsersResult> {
  return apiFetch<BulkCreateUsersResult>(`${PATH}/bulk`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
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
  return (
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() ||
    "US"
  );
}

export function getStatusLabel(active: boolean): "Activo" | "Inactivo" {
  return active ? "Activo" : "Inactivo";
}

// Badges de estado y fechas: compartidos con el módulo de roles.
export { getStatusColor, formatDate } from "@/features/auth-common/utils";

/** Catálogo de roles para el multi-select (GET /api/auth/roles). */
export { fetchRoles } from "@/features/roles/services/roles-service";

/** Catálogo de permisos y permisos directos del usuario (precarga del form). */
export {
  fetchPermissions,
  fetchUserPermissions,
} from "@/features/permissions/services/permissions-service";
