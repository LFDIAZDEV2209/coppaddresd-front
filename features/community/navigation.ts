import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Send,
  Radio,
  Users,
  Moon,
  Flame,
  Map,
  Stethoscope,
  Trophy,
  MessageCircle,
  Share2,
  Users2,
  ShieldAlert,
} from "lucide-react";

export interface ErpNavItem {
  /** Texto visible (también es la key de i18n). */
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: "purple" | "red";
  /** Color opcional del icono (p. ej. moderación en destructive). */
  color?: string;
  /** Permiso requerido para ver el ítem. Evalúa el sidebar con useAppContext().can. */
  permission?: string;
}

export interface ErpNavSection {
  label: string;
  items: ErpNavItem[];
}

export const erpNavSections: ErpNavSection[] = [
  {
    label: "Principal",
    items: [
      {
        label: "Panel",
        href: "/community/dashboard",
        icon: LayoutDashboard,
        permission: "Community.View",
      },
      {
        label: "Publicaciones",
        href: "/community/posts",
        icon: Send,
        badge: "3",
        badgeColor: "purple",
        permission: "Community.View",
      },
      {
        label: "Moderación",
        href: "/community/moderation",
        icon: ShieldAlert,
        color: "var(--destructive)",
        permission: "Community.Moderate",
      },
      {
        label: "Feed en vivo",
        href: "/community/feed",
        icon: Radio,
        badge: "12",
        badgeColor: "red",
        permission: "Community.View",
      },
    ],
  },
  {
    label: "Miembros",
    items: [
      {
        label: "Miembros",
        href: "/community/members",
        icon: Users,
        permission: "Community.Profiles",
      },
      {
        label: "Sin publicar",
        href: "/community/inactive",
        icon: Moon,
        badge: "8",
        badgeColor: "red",
        permission: "Community.Profiles",
      },
      {
        label: "Rachas y logros",
        href: "/community/streaks",
        icon: Flame,
        permission: "Community.Profiles",
      },
      {
        label: "Por región",
        href: "/community/regions",
        icon: Map,
        permission: "Community.Profiles",
      },
      {
        label: "Por diagnóstico",
        href: "/community/diagnostics",
        icon: Stethoscope,
        permission: "Community.Profiles",
      },
    ],
  },
  {
    label: "Gestión",
    items: [
      {
        label: "Clubes",
        href: "/community/clubs",
        icon: Users2,
        permission: "Community.View",
      },
      {
        label: "Reconocimientos",
        href: "/community/rewards",
        icon: Trophy,
        permission: "Community.Manage",
      },
      {
        label: "Grupos/Chats",
        href: "/community/groups",
        icon: MessageCircle,
        permission: "Community.View",
      },
      {
        label: "Redes Copp Adresd",
        href: "/community/networks",
        icon: Share2,
        permission: "Community.Manage",
      },
    ],
  },
];

export const communityBrand = "Copp Adresd · ERP Comunidad";
