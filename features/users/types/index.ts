export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  status: UserStatus;
  lastActivity: string;
}

export type UserRole =
  | "Superadministrador"
  | "Administrador"
  | "Analista"
  | "Soporte";

export type UserStatus = "Activo" | "Inactivo" | "Pendiente";

export interface UsersFilters {
  search: string;
  status: UserStatus | "all";
  role: UserRole | "all";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
