import type {
  User,
  UsersFilters,
  PaginatedResult,
  UserStatus,
  UserRole,
} from "../types";

const mockUsers: User[] = [
  { id: "u1", name: "María González", email: "maria.gonzalez@copp.com", initials: "MG", role: "Superadministrador", status: "Activo", lastActivity: "Hace 5 min" },
  { id: "u2", name: "Carlos Rodríguez", email: "carlos.rodriguez@copp.com", initials: "CR", role: "Administrador", status: "Activo", lastActivity: "Hace 12 min" },
  { id: "u3", name: "Laura Martínez", email: "laura.martinez@copp.com", initials: "LM", role: "Analista", status: "Activo", lastActivity: "Hace 1h" },
  { id: "u4", name: "Andrés Pérez", email: "andres.perez@copp.com", initials: "AP", role: "Soporte", status: "Inactivo", lastActivity: "Hace 3 días" },
  { id: "u5", name: "Valeria Sánchez", email: "valeria.sanchez@copp.com", initials: "VS", role: "Analista", status: "Activo", lastActivity: "Hace 30 min" },
  { id: "u6", name: "Jorge Ramírez", email: "jorge.ramirez@copp.com", initials: "JR", role: "Administrador", status: "Pendiente", lastActivity: "Hace 2h" },
  { id: "u7", name: "Lucía Fernández", email: "lucia.fernandez@copp.com", initials: "LF", role: "Soporte", status: "Activo", lastActivity: "Hace 45 min" },
  { id: "u8", name: "Diego Torres", email: "diego.torres@copp.com", initials: "DT", role: "Analista", status: "Activo", lastActivity: "Hace 15 min" },
  { id: "u9", name: "Camila Herrera", email: "camila.herrera@copp.com", initials: "CH", role: "Soporte", status: "Inactivo", lastActivity: "Hace 1 semana" },
  { id: "u10", name: "Martín Díaz", email: "martin.diaz@copp.com", initials: "MD", role: "Analista", status: "Activo", lastActivity: "Hace 1h" },
];

export async function fetchUsers(
  page: number,
  pageSize: number,
  filters: UsersFilters
): Promise<PaginatedResult<User>> {
  await simulateDelay(500);

  let filtered = [...mockUsers];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  if (filters.status !== "all") {
    filtered = filtered.filter((u) => u.status === filters.status);
  }

  if (filters.role !== "all") {
    filtered = filtered.filter((u) => u.role === filters.role);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total, page, pageSize, totalPages };
}

export function getStatusColor(status: UserStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "Activo":
      return {
        bg: "var(--success-soft)",
        text: "var(--success-foreground)",
        dot: "var(--success-foreground)",
      };
    case "Inactivo":
      return {
        bg: "var(--destructive-soft)",
        text: "var(--destructive)",
        dot: "var(--destructive)",
      };
    case "Pendiente":
      return {
        bg: "var(--warning-soft)",
        text: "var(--warning-foreground)",
        dot: "var(--warning)",
      };
  }
}

export function getRoles(): UserRole[] {
  return ["Superadministrador", "Administrador", "Analista", "Soporte"];
}

export function getStatuses(): UserStatus[] {
  return ["Activo", "Inactivo", "Pendiente"];
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
