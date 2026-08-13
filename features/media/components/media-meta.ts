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
