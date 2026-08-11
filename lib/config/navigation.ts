import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Bot,
  BarChart3,
  Plug,
  Mic,
  BrainCircuit,
  ScrollText,
  Lock,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "INICIO",
    items: [
      { label: "Resumen", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { label: "Usuarios", href: "/users", icon: Users },
      { label: "Roles y permisos", href: "/roles", icon: ShieldCheck },
    ],
  },
  {
    label: "INTELIGENCIA ARTIFICIAL",
    items: [
      { label: "Agentes", href: "/agents", icon: Bot },
      { label: "Analítica de agentes", href: "/agents/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "PLATAFORMA",
    items: [
      { label: "Integraciones", href: "/settings/integrations", icon: Plug },
      { label: "Voces", href: "/settings/voices", icon: Mic },
      { label: "Configuración de IA", href: "/settings/ai", icon: BrainCircuit },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { label: "Auditoría", href: "/settings/audit", icon: ScrollText },
      { label: "Seguridad", href: "/settings/security", icon: Lock },
      { label: "Configuración", href: "/settings", icon: Settings },
    ],
  },
];

export function getBreadcrumbSegments(pathname: string): { label: string; href?: string }[] {
  const segments: { label: string; href?: string }[] = [
    { label: "Copp Adresd", href: "/dashboard" },
  ];

  const allItems = navGroups.flatMap((g) => g.items);
  const current = allItems.find((item) => item.href === pathname);

  if (current) {
    segments.push({ label: current.label });
  }

  return segments;
}
