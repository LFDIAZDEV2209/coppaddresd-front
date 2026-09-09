/**
 * Tipos del módulo de usuarios del Auth Service.
 *
 * El DTO del backend es `UserResponse { id, email, firstName, lastName,
 * isActive, createdAt, roles: string[] }`. La lista viene completa y el
 * frontend aplica búsqueda, filtros, ordenamiento y paginación client-side.
 *
 * "Último acceso" no lo expone el backend todavía: se resuelve con mock
 * determinista (users-mock.ts) aislado de la lógica de producción.
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

export type UserSortField =
  "name" | "email" | "status" | "createdAt" | "lastAccess";

export type SortDir = "asc" | "desc";

/**
 * Permiso del catálogo enriquecido con su ORIGEN para la vista de detalle
 * (heredado de un rol vs. directo).
 */
export interface PermissionWithOrigin extends ImportablePermission {
  /** Nombre del rol del que se hereda (siempre presente en heredados). */
  originRole: string;
}

/** Alias local para no importar el tipo base dos veces. */
type ImportablePermission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: string;
};

/** Estado del ordenamiento de la tabla/cards (null = sin orden activo). */
export interface UserSort {
  field: UserSortField | null;
  dir: SortDir;
}

export interface UsersFilters {
  search: string;
  status: "active" | "inactive" | "all";
  /** "all" | "none" (sin roles) | nombre de rol */
  role: string;
  /** Ventana de fecha de creación: "all" | "7d" | "30d" | "90d". */
  createdWithin: "all" | "7d" | "30d" | "90d";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Estadísticas del módulo, calculadas sobre la lista completa de usuarios
 * (la misma que ya trae GET /api/auth/users). "newThisWeek" usa el
 * createdAt real; no requiere mock.
 */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  withoutRoles: number;
  newThisWeek: number;
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

/** Resultado del wizard de usuario: datos + asignaciones a sincronizar. */
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

/**
 * Fila normalizada del archivo de importación masiva (mock). Los errores se
 * validan contra las mismas reglas que la creación individual.
 */
export interface BulkUserRow {
  line: number;
  firstName: string;
  lastName: string;
  email: string;
  /** Nombre del rol (opcional). */
  role: string;
  /** "activo" | "inactivo" (opcional, default activo). */
  status: string;
  /** Errores de validación de la fila (vacío = fila válida). */
  errors: string[];
}

/** Resumen del preview de importación. */
export interface BulkPreview {
  valid: number;
  invalid: number;
  duplicates: number;
}

/** Resultado simulado de la importación masiva (mock). */
export interface BulkResult {
  created: number;
  skipped: number;
}
