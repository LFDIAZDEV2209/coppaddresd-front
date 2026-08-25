/**
 * Tipos del módulo de usuarios del Auth Service.
 *
 * El DTO del backend es `UserResponse { id, email, firstName, lastName,
 * isActive, createdAt, roles: string[] }`. La lista viene completa y el
 * frontend aplica búsqueda, filtros y paginación client-side.
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  /** Nombres de los roles asignados al usuario. */
  roles: string[];
}

/** Filtros de la lista (aplicados client-side). */
export interface UsersFilters {
  search: string;
  status: "active" | "inactive" | "all";
  role: string; // "all" o nombre de rol
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Cuerpo de POST /api/auth/users (creación; AllowAnonymous).
 * `roleIds`/`permissionIds` van SOLO si el caller tiene los permisos de
 * asignación (si no, se omiten → el backend los trata como null = sin
 * asignaciones, y no exige Roles.Assign/Permissions.Assign).
 */
export interface UserCreateInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Conjunto completo deseado de roles (sync total en el backend). */
  roleIds?: string[];
  /** Conjunto completo deseado de permisos directos. */
  permissionIds?: string[];
}

/**
 * Cuerpo de PUT /api/auth/users/{id} (actualización; sync total de asignaciones).
 * `roleIds`/`permissionIds` opcionales: el front los manda solo si tiene los
 * permisos de asignación; omitirlos = null = el backend no toca la asignación.
 */
export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  /** Conjunto completo deseado de roles. */
  roleIds?: string[];
  /** Conjunto completo deseado de permisos directos. */
  permissionIds?: string[];
}

/** Resultado del form de usuario: datos + asignaciones a sincronizar. */
export interface UserFormValues {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleIds: string[];
  permissionIds: string[];
  /**
   * true si los roles o permisos seleccionados difieren de la precarga
   * (solo relevante en edición; en creación siempre false). El backend solo
   * invalida el security stamp cuando hay cambios efectivos.
   */
  assignmentsChanged: boolean;
}
