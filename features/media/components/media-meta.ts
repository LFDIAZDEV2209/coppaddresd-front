import {
  Mic,
  Video,
  AudioLines,
  type LucideIcon,
} from "lucide-react";
import type { MediaItem } from "../types";

export const mediaTypeMeta: Record<
  MediaItem["mediaType"],
  { icon: LucideIcon; label: string; tone: string }
> = {
  Podcast: { icon: Mic, label: "Podcast", tone: "text-primary bg-primary-soft" },
  Video: { icon: Video, label: "Video", tone: "text-info bg-info-soft" },
  Audio: { icon: AudioLines, label: "Audio", tone: "text-accent bg-secondary-soft" },
};

export const mediaCategoryMeta: Record<
  MediaItem["category"],
  { label: string; tone: string }
> = {
  Biologia: { label: "Biología", tone: "text-success bg-success-soft" },
  Nutricion: { label: "Nutrición", tone: "text-primary bg-primary-soft" },
  Psicologia: { label: "Psicología", tone: "text-info bg-info-soft" },
  CrecimientoPersonal: {
    label: "Crecimiento personal",
    tone: "text-accent bg-secondary-soft",
  },
  Habitos: { label: "Hábitos", tone: "text-warning bg-warning-soft" },
  SaludFisica: {
    label: "Salud física",
    tone: "text-primary bg-primary-soft",
  },
  BienestarEmocional: {
    label: "Bienestar emocional",
    tone: "text-info bg-info-soft",
  },
  Mindfulness: {
    label: "Mindfulness",
    tone: "text-accent bg-secondary-soft",
  },
  Motivacion: { label: "Motivación", tone: "text-warning bg-warning-soft" },
};

/** Fallback para categorías vacías/desconocidas (filas legacy pre-migración). */
const fallbackCategoryMeta = { label: "Sin categoría", tone: "text-muted-foreground bg-muted" };

export function getMediaCategoryMeta(
  category: MediaItem["category"],
): { label: string; tone: string } {
  return mediaCategoryMeta[category] ?? fallbackCategoryMeta;
}

export const mediaStatusMeta: Record<
  MediaItem["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  Published: {
    label: "Publicado",
    bg: "var(--success-soft)",
    text: "var(--success-foreground)",
    dot: "var(--success-foreground)",
  },
  Draft: {
    label: "Borrador",
    bg: "var(--warning-soft)",
    text: "var(--warning-foreground)",
    dot: "var(--warning)",
  },
  Archived: {
    label: "Archivado",
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
  },
};
