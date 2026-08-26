import type { LucideIcon } from "lucide-react";
import { hasAppointmentPermission } from "./appointment-permissions";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Bot,
  BarChart3,
  Mic,
  BrainCircuit,
  ScrollText,
  Lock,
  Settings,
  Home,
  FolderKanban,
  Cpu,
  Server,
  CalendarPlus,
  ClipboardPenLine,
  UserRound,
  Stethoscope,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  FileBarChart,
  FileAudio,
  PlayCircle,
  ShoppingBag,
  Store,
  Eye,
  Star,
  Video,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  Inbox,
  Bell,
  Apple,
  Dumbbell,
  UserCheck,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
  hidden?: boolean;
  /**
   * Permiso requerido para ver el ítem (o lista any-of). La visibilidad la
   * evalúa el Sidebar y el guard de rutas con el contexto del usuario (global
   * ∪ scoped de la clínica activa); la autorización REAL la aplica el backend.
   */
  permission?: string | string[];
}

export interface NavModule {
  label: string;
  icon: LucideIcon;
  color: string;
  items: NavItem[];
  /** Permiso requerido para ver el módulo completo (or lista any-of). */
  permission?: string | string[];
}

/**
 * Evalúa un permiso declarativo: single code o lista any-of. Durante la
 * transición Phase-1 también acepta los códigos legacy Telemedicine.*
 * equivalentes (ver appointment-permissions).
 */
export function hasNavPermission(
  permission: string | string[] | undefined,
  can: (code: string) => boolean,
): boolean {
  if (!permission) return true;
  const codes = Array.isArray(permission) ? permission : [permission];
  return codes.some((code) => hasAppointmentPermission(can, code));
}

/** Ítems visibles del módulo (filtra hidden y permisos). */
export function visibleNavItems(
  module: NavModule,
  can: (code: string) => boolean,
): NavItem[] {
  return module.items.filter(
    (item) => !item.hidden && hasNavPermission(item.permission, can),
  );
}

/** Módulos visibles: con permiso de módulo y al menos un ítem visible. */
export function visibleNavModules(can: (code: string) => boolean): NavModule[] {
  return navModules.filter(
    (module) =>
      hasNavPermission(module.permission, can) &&
      visibleNavItems(module, can).length > 0,
  );
}

export const navModules: NavModule[] = [
  {
    label: "Inicio",
    icon: Home,
    color: "#123B63",
    items: [
      {
        label: "Resumen",
        href: "/dashboard",
        icon: LayoutDashboard,
        color: "#123B63",
      },
    ],
  },
  {
    label: "GestiA3n",
    icon: FolderKanban,
    color: "#1F6E9F",
    items: [
      {
        label: "Usuarios",
        href: "/users",
        icon: Users,
        color: "#0E7490",
        permission: "Users.View",
      },
      {
        label: "Profesionales",
        href: "/professionals",
        icon: Stethoscope,
        color: "#0E7490",
        permission: "Professionals.View",
      },
      {
        label: "Roles y permisos",
        href: "/roles",
        icon: ShieldCheck,
        color: "#10B981",
        permission: "Roles.View",
      },
    ],
  },
  {
    label: "Pacientes",
    icon: UserRound,
    color: "#0E7490",
    permission: ["Patients.View", "Patients.ViewOwn"],
    items: [
      {
        label: "Pacientes",
        href: "/patients",
        icon: UserRound,
        color: "#0E7490",
        permission: ["Patients.View", "Patients.ViewOwn"],
      },
      {
        label: "Agendar cita",
        href: "/patients/appointments",
        icon: CalendarPlus,
        color: "#10B981",
        hidden: true,
        permission: "Patients.View",
      },
      {
        label: "Recetario",
        href: "/patients/prescriptions",
        icon: ClipboardPenLine,
        color: "#F59E0B",
        permission: "Prescriptions.View",
      },
    ],
  },
  {
    label: "Citas",
    icon: Video,
    color: "#0E7490",
    permission: [
      "Appointments.AgendaView",
      "Appointments.AdminView",
      "Appointments.RequestsView",
    ],
    items: [
      {
        label: "Dashboard",
        href: "/appointments",
        icon: LayoutDashboard,
        color: "#123B63",
        permission: "Appointments.AgendaView",
      },
      {
        label: "Agenda",
        href: "/appointments/agenda",
        icon: CalendarDays,
        color: "#2563EB",
        permission: "Appointments.AgendaView",
      },
      {
        label: "Calendario",
        href: "/appointments/calendario",
        icon: CalendarClock,
        color: "#0E7490",
        permission: "Appointments.AgendaView",
      },
      {
        label: "Citas",
        href: "/appointments/citas",
        icon: ClipboardList,
        color: "#0891B2",
        permission: "Appointments.View",
      },
      {
        label: "Solicitudes",
        href: "/appointments/solicitudes",
        icon: Inbox,
        color: "#F59E0B",
        permission: "Appointments.RequestsView",
      },
      {
        label: "Alertas",
        href: "/appointments/alertas",
        icon: Bell,
        color: "#EF4444",
        permission: "Appointments.AlertsView",
      },
      {
        label: "Administración",
        href: "/appointments/admin",
        icon: BarChart3,
        color: "#7C3AED",
        permission: "Appointments.AdminView",
      },
    ],
  },
  {
    label: "Inventario",
    icon: Package,
    color: "#7C3AED",
    permission: "Inventory.View",
    items: [
      {
        label: "Productos",
        href: "/inventory",
        icon: Package,
        color: "#7C3AED",
        permission: "Inventory.View",
      },
      {
        label: "Entradas",
        href: "/inventory/entries",
        icon: ArrowDownToLine,
        color: "#10B981",
        permission: "Inventory.View",
      },
      {
        label: "Salidas",
        href: "/inventory/exits",
        icon: ArrowUpFromLine,
        color: "#EF4444",
        permission: "Inventory.View",
      },
      {
        label: "Movimientos",
        href: "/inventory/movements",
        icon: ArrowLeftRight,
        color: "#0E7490",
        permission: "Inventory.View",
      },
      {
        label: "Reportes",
        href: "/inventory/reports",
        icon: FileBarChart,
        color: "#F59E0B",
        permission: "Inventory.View",
      },
    ],
  },
  {
    label: "Tienda de bienestar",
    icon: ShoppingBag,
    color: "#10B981",
    permission: "Store.View",
    items: [
      {
        label: "Catálogo",
        href: "/store",
        icon: Store,
        color: "#10B981",
        permission: "Store.View",
      },
      {
        label: "Previsualización",
        href: "/store/preview",
        icon: Eye,
        color: "#0E7490",
        permission: "Store.View",
      },
      {
        label: "Destacados",
        href: "/store/featured",
        icon: Star,
        color: "#F59E0B",
        permission: "Store.View",
      },
    ],
  },
  {
    label: "Agentes AI",
    icon: Cpu,
    color: "#7C3AED",
    permission: "Agents.View",
    items: [
      {
        label: "Agentes",
        href: "/agents",
        icon: Bot,
        color: "#7C3AED",
        permission: "Agents.View",
      },
      {
        label: "Conocimiento",
        href: "/agents/knowledge",
        icon: BrainCircuit,
        color: "#6D28D9",
        permission: "Agents.View",
      },
      {
        label: "Playground",
        href: "/agents/playground",
        icon: PlayCircle,
        color: "#059669",
        permission: "Agents.View",
      },
      {
        label: "Monitoreo",
        href: "/agents/monitoring",
        icon: BarChart3,
        color: "#2563EB",
        permission: "Agents.View",
      },
      {
        label: "Voces",
        href: "/agents/voices",
        icon: Mic,
        color: "#0891B2",
        hidden: true,
        permission: "Agents.View",
      },
      {
        label: "Configuración AI",
        href: "/agents/config",
        icon: Settings,
        color: "#475569",
        hidden: true,
        permission: "Agents.View",
      },
    ],
  },
  {
    label: "Contenido",
    icon: FileAudio,
    color: "#0E7490",
    permission: "Media.View",
    items: [
      {
        label: "Medios",
        href: "/media",
        icon: FileAudio,
        color: "#0E7490",
        permission: "Media.View",
      },
    ],
  },
  {
    label: "Bienestar",
    icon: Apple,
    color: "#059669",
    items: [
      {
        label: "Planes de alimentación",
        href: "/wellness/nutrition-plans",
        icon: Apple,
        color: "#059669",
      },
      {
        label: "Rutinas de ejercicio",
        href: "/wellness/exercise-routines",
        icon: Dumbbell,
        color: "#0891B2",
      },
      {
        label: "Asignaciones",
        href: "/wellness/assignments",
        icon: ClipboardList,
        color: "#7C3AED",
      },
    ],
  },
  {
    label: "Comunidad",
    icon: Users,
    color: "#0D9488",
    items: [
      {
        label: "Miembros",
        href: "/community/profiles",
        icon: UserCheck,
        color: "#0E7490",
      },
      {
        label: "Moderación",
        href: "/community/moderation",
        icon: ShieldCheck,
        color: "#F59E0B",
      },
      {
        label: "Analítica",
        href: "/community/analytics",
        icon: BarChart3,
        color: "#10B981",
      },
    ],
  },
  {
    label: "Sistema",
    icon: Server,
    color: "#475569",
    items: [
      {
        label: "Auditoría",
        href: "/settings/audit",
        icon: ScrollText,
        color: "#F59E0B",
        permission: "Audit.View",
      },
      {
        label: "Seguridad",
        href: "/settings/security",
        icon: Lock,
        color: "#EF4444",
        permission: "System.AdminSettings",
      },
      {
        label: "Configuración",
        href: "/settings",
        icon: Settings,
        color: "#64748B",
      },
    ],
  },
];

export function getBreadcrumbSegments(
  pathname: string,
): { label: string; href?: string }[] {
  const segments: { label: string; href?: string }[] = [
    { label: "Copp Adresd", href: "/dashboard" },
  ];

  const allItems = navModules.flatMap((m) => m.items);
  const current = allItems.find((item) => item.href === pathname);

  if (current) {
    segments.push({ label: current.label });
  }

  return segments;
}

export function findModuleForPath(pathname: string): NavModule | null {
  return (
    navModules.find((m) =>
      m.items.some(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    ) || null
  );
}
