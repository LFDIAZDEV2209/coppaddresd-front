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
}

export interface ErpNavSection {
  label: string;
  items: ErpNavItem[];
}

export const erpNavSections: ErpNavSection[] = [
  {
    label: "Principal",
    items: [
      { label: "Panel", href: "/community/dashboard", icon: LayoutDashboard },
      { label: "Publicaciones", href: "/community/posts", icon: Send, badge: "3", badgeColor: "purple" },
      { label: "Moderación", href: "/community/moderation", icon: ShieldAlert, color: "var(--destructive)" },
      { label: "Feed en vivo", href: "/community/feed", icon: Radio, badge: "12", badgeColor: "red" },
    ],
  },
  {
    label: "Miembros",
    items: [
      { label: "Miembros", href: "/community/members", icon: Users },
      { label: "Sin publicar", href: "/community/inactive", icon: Moon, badge: "8", badgeColor: "red" },
      { label: "Rachas y logros", href: "/community/streaks", icon: Flame },
      { label: "Por región", href: "/community/regions", icon: Map },
      { label: "Por diagnóstico", href: "/community/diagnostics", icon: Stethoscope },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Reconocimientos", href: "/community/rewards", icon: Trophy },
      { label: "Grupos/Chats", href: "/community/groups", icon: MessageCircle },
      { label: "Redes ANTARES", href: "/community/networks", icon: Share2 },
    ],
  },
];

export const communityBrand = "ANTARES · ERP Comunidad";
