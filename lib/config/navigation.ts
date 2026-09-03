import type { LucideIcon } from "lucide-react";
import { hasAppointmentPermission } from "./appointment-permissions";
import {
  LayoutDashboard,
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
  Users,
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
  ShieldAlert,
  Video,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  Inbox,
  Bell,
  Apple,
  Dumbbell,
  Sparkles,
  HeartPulse,
  Activity,
  BellRing,
  Hourglass,
  Layers,
  FileText,
  TrendingUp,
  PieChart,
  Trophy,
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
  /** Etiqueta de subgrupo visual en el sidebar expandido. */
  section?: string;
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
    label: "Gestión",
    icon: FolderKanban,
    color: "#1F6E9F",
    items: [
      {
        label: "Usuarios",
        href: "/users",
        icon: Users,
        color: "#0E7490",
        permission: "System.AdminSettings",
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
        permission: "System.AdminSettings",
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
    label: "Tests de salud",
    icon: HeartPulse,
    color: "#0D9488",
    permission: ["HealthTests.View", "HealthTests.ViewOwn"],
    items: [
      {
        label: "Pacientes",
        href: "/health-tests/pacientes",
        icon: UserRound,
        color: "#2563EB",
        section: "Operación",
      },
      {
        label: "Dashboard",
        href: "/health-tests",
        icon: HeartPulse,
        color: "#123B63",
        section: "Operación",
      },
      {
        label: "Alertas",
        href: "/health-tests/alertas",
        icon: BellRing,
        color: "#EF4444",
        section: "Operación",
      },
      {
        label: "Cobertura",
        href: "/health-tests/cobertura",
        icon: PieChart,
        color: "#10B981",
        section: "Análisis",
      },
      {
        label: "Seguimiento",
        href: "/health-tests/seguimiento",
        icon: Hourglass,
        color: "#F59E0B",
        section: "Análisis",
      },
      {
        label: "Indicadores",
        href: "/health-tests/indicadores",
        icon: Activity,
        color: "#0E7490",
        section: "Análisis",
      },
      {
        label: "DOFA poblacional",
        href: "/health-tests/dofa",
        icon: TrendingUp,
        color: "#7C3AED",
        section: "Análisis",
      },
      {
        label: "Catálogo de tests",
        href: "/health-tests/catalogo",
        icon: FileText,
        color: "#0891B2",
        section: "Configuración",
      },
      {
        label: "Baterías",
        href: "/health-tests/baterias",
        icon: Layers,
        color: "#64748B",
        section: "Configuración",
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
    permission: "Wellness.View",
    items: [
      {
        label: "Planes de alimentación",
        href: "/wellness/nutrition-plans",
        icon: Apple,
        color: "#059669",
        permission: "Wellness.View",
      },
      {
        label: "Rutinas de ejercicio",
        href: "/wellness/exercise-routines",
        icon: Dumbbell,
        color: "#0891B2",
        permission: "Wellness.View",
      },
      {
        label: "Asignaciones",
        href: "/wellness/assignments",
        icon: ClipboardList,
        color: "#7C3AED",
        permission: "Wellness.View",
      },
    ],
  },
  {
    label: "Programa",
    icon: Trophy,
    color: "#D97706",
    items: [
      {
        label: "Dashboard General",
        href: "/program/dashboard",
        icon: BarChart3,
        color: "#123B63",
        permission: "Program.View",
      },
      {
        label: "Adherencia & Rachas",
        href: "/program/adherencia",
        icon: TrendingUp,
        color: "#1D9E75",
        permission: "Program.View",
      },
      {
        label: "Gestión del programa",
        href: "/program/gestion",
        icon: Trophy,
        color: "#D97706",
        permission: ["Program.View", "Program.Edit"],
      },
      {
        label: "Clínica",
        href: "/program/clinica",
        icon: ShieldAlert,
        color: "#DC2626",
        permission: ["Program.View", "Program.Adapt"],
      },
    ],
  },
  {
    label: "Comunidad",
    icon: Sparkles,
    color: "#B8860B",
    permission: "Community.View",
    items: [
      {
        label: "Comunidad",
        href: "/community/dashboard",
        icon: Sparkles,
        color: "#B8860B",
        permission: "Community.View",
      },
      {
        label: "Publicaciones",
        href: "/community/posts",
        icon: Sparkles,
        hidden: true,
        permission: "Community.View",
      },
      {
        label: "Moderación",
        href: "/community/moderation",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Moderate",
      },
      {
        label: "Feed en vivo",
        href: "/community/feed",
        icon: Sparkles,
        hidden: true,
        permission: "Community.View",
      },
      {
        label: "Miembros",
        href: "/community/members",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Profiles",
      },
      {
        label: "Sin publicar",
        href: "/community/inactive",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Profiles",
      },
      {
        label: "Rachas y logros",
        href: "/community/streaks",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Profiles",
      },
      {
        label: "Por región",
        href: "/community/regions",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Profiles",
      },
      {
        label: "Por diagnóstico",
        href: "/community/diagnostics",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Profiles",
      },
      {
        label: "Reconocimientos",
        href: "/community/rewards",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Manage",
      },
      {
        label: "Grupos/Chats",
        href: "/community/groups",
        icon: Sparkles,
        hidden: true,
        permission: "Community.View",
      },
      {
        label: "Redes ANTARES",
        href: "/community/networks",
        icon: Sparkles,
        hidden: true,
        permission: "Community.Manage",
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

  // Rutas legacy de enrollments: redirigen a Gestión · Perfil 360
  if (pathname.startsWith("/program/enrollments")) {
    segments.push({ label: "Gestión del programa", href: "/program/gestion" });
    segments.push({ label: "Perfil 360" });
    return segments;
  }

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
