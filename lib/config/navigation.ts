import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
  hidden?: boolean;
}

export interface NavModule {
  label: string;
  icon: LucideIcon;
  color: string;
  items: NavItem[];
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
      { label: "Usuarios", href: "/users", icon: Users, color: "#0E7490" },
      {
        label: "Profesionales",
        href: "/employees",
        icon: Stethoscope,
        color: "#0E7490",
      },
      {
        label: "Roles y permisos",
        href: "/roles",
        icon: ShieldCheck,
        color: "#10B981",
      },
    ],
  },
  {
    label: "Pacientes",
    icon: UserRound,
    color: "#0E7490",
    items: [
      {
        label: "Pacientes",
        href: "/patients",
        icon: UserRound,
        color: "#0E7490",
      },
      {
        label: "Agendar cita",
        href: "/patients/appointments",
        icon: CalendarPlus,
        color: "#10B981",
        hidden: true,
      },
      {
        label: "Recetario",
        href: "/patients/prescriptions",
        icon: ClipboardPenLine,
        color: "#F59E0B",
      },
    ],
  },
  {
    label: "Inventario",
    icon: Package,
    color: "#7C3AED",
    items: [
      {
        label: "Productos",
        href: "/inventory",
        icon: Package,
        color: "#7C3AED",
      },
      {
        label: "Entradas",
        href: "/inventory/entries",
        icon: ArrowDownToLine,
        color: "#10B981",
      },
      {
        label: "Salidas",
        href: "/inventory/exits",
        icon: ArrowUpFromLine,
        color: "#EF4444",
      },
      {
        label: "Movimientos",
        href: "/inventory/movements",
        icon: ArrowLeftRight,
        color: "#0E7490",
      },
      {
        label: "Reportes",
        href: "/inventory/reports",
        icon: FileBarChart,
        color: "#F59E0B",
      },
    ],
  },
  {
    label: "Agentes AI",
    icon: Cpu,
    color: "#7C3AED",
    items: [
      { label: "Agentes", href: "/agents", icon: Bot, color: "#7C3AED" },
      {
        label: "Conocimiento",
        href: "/agents/knowledge",
        icon: BrainCircuit,
        color: "#6D28D9",
      },
      {
        label: "Playground",
        href: "/agents/playground",
        icon: PlayCircle,
        color: "#059669",
      },
      {
        label: "Monitoreo",
        href: "/agents/monitoring",
        icon: BarChart3,
        color: "#2563EB",
      },
      { label: "Voces", href: "/agents/voices", icon: Mic, color: "#0891B2", hidden: true },
      {
        label: "Configuración AI",
        href: "/agents/config",
        icon: Settings,
        color: "#475569",
        hidden: true,
      },
    ],
  },
  {
    label: "Contenido",
    icon: FileAudio,
    color: "#0E7490",
    items: [
      {
        label: "Medios",
        href: "/media",
        icon: FileAudio,
        color: "#0E7490",
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
      },
      {
        label: "Seguridad",
        href: "/settings/security",
        icon: Lock,
        color: "#EF4444",
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
