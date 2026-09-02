// Helpers de presentación del módulo de Clubes (ERP y app comparten los mismos patrones).

import type {
  ClubMemberRole,
  ClubMemberStatus,
  ClubStatus,
  ClubVisibility,
  EventType,
  LiveSessionStatus,
  PostVisibility,
} from "../types";
import { coverGradient } from "../mock/seeds";

export interface BadgeColor {
  bg: string;
  text: string;
  dot: string;
}

export const VISIBILITY_COLORS: Record<ClubVisibility, BadgeColor> = {
  PUBLICO: {
    bg: "var(--success-soft)",
    text: "var(--success-foreground)",
    dot: "var(--success-foreground)",
  },
  PRIVADO: {
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
  INVITACION: {
    bg: "var(--info-soft)",
    text: "var(--info-foreground)",
    dot: "var(--info-foreground)",
  },
};

export const CLUB_STATUS_COLORS: Record<ClubStatus, BadgeColor> = {
  ACTIVO: {
    bg: "var(--success-soft)",
    text: "var(--success-foreground)",
    dot: "var(--success-foreground)",
  },
  ARCHIVADO: {
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
  },
};

export const MEMBER_ROLE_COLORS: Record<ClubMemberRole, BadgeColor> = {
  ADMIN: {
    bg: "var(--primary-soft)",
    text: "var(--primary)",
    dot: "var(--primary)",
  },
  MODERADOR: {
    bg: "var(--info-soft)",
    text: "var(--info-foreground)",
    dot: "var(--info-foreground)",
  },
  MIEMBRO: {
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
  },
};

export const MEMBER_STATUS_COLORS: Record<ClubMemberStatus, BadgeColor> = {
  ACTIVO: {
    bg: "var(--success-soft)",
    text: "var(--success-foreground)",
    dot: "var(--success-foreground)",
  },
  PENDIENTE: {
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
  EXPULSADO: {
    bg: "var(--destructive-soft)",
    text: "var(--destructive)",
    dot: "var(--destructive)",
  },
  SILENCIADO: {
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
};

export const POST_VISIBILITY_COLORS: Record<PostVisibility, BadgeColor> = {
  PUBLICO: {
    bg: "var(--success-soft)",
    text: "var(--success-foreground)",
    dot: "var(--success-foreground)",
  },
  PRIVADO: {
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
};

export const EVENT_TYPE_COLORS: Record<EventType, BadgeColor> = {
  PRESENCIAL: {
    bg: "var(--info-soft)",
    text: "var(--info-foreground)",
    dot: "var(--info-foreground)",
  },
  VIRTUAL: {
    bg: "var(--primary-soft)",
    text: "var(--primary)",
    dot: "var(--primary)",
  },
};

export const LIVE_STATUS_COLORS: Record<LiveSessionStatus, BadgeColor> = {
  PROGRAMADO: {
    bg: "var(--info-soft)",
    text: "var(--info-foreground)",
    dot: "var(--info-foreground)",
  },
  ACTIVO: {
    bg: "var(--destructive-soft)",
    text: "var(--destructive)",
    dot: "var(--destructive)",
  },
  FINALIZADO: {
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
  },
  CANCELADO: {
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
  },
};

export const CATEGORY_COLORS: Record<string, BadgeColor> = {
  Salud: {
    bg: "var(--info-soft)",
    text: "var(--info-foreground)",
    dot: "var(--info-foreground)",
  },
  Deporte: {
    bg: "var(--success-soft)",
    text: "var(--success-foreground)",
    dot: "var(--success-foreground)",
  },
  Bienestar: {
    bg: "var(--primary-soft)",
    text: "var(--primary)",
    dot: "var(--primary)",
  },
  Nutrición: {
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
  Embarazo: {
    bg: "var(--destructive-soft)",
    text: "var(--destructive)",
    dot: "var(--destructive)",
  },
  Diabetes: {
    bg: "var(--info-soft)",
    text: "var(--info-foreground)",
    dot: "var(--info-foreground)",
  },
  "Adultos mayores": {
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
  },
  Empresas: {
    bg: "var(--primary-soft)",
    text: "var(--primary)",
    dot: "var(--primary)",
  },
  Hobbies: {
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
};

export function categoryColor(category: string): BadgeColor {
  return (
    CATEGORY_COLORS[category] ?? {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    }
  );
}

export function clubCoverStyle(category: string): React.CSSProperties {
  return { background: coverGradient(category) };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return new Date(isoDate).toLocaleDateString();
}

export function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  return (
    d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  );
}
