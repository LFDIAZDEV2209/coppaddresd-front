"use client";

import { MediaLibraryPicker } from "@/features/media/components/media-library-picker";
import type { MediaItem } from "@/features/media/types";
import { useT } from "@/providers/i18n-provider";

interface PickerBase {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel?: string;
}

type PodcastPickerDialogProps = PickerBase & (
  | { multiple?: false; currentMediaId: string | null; onSelect: (mediaId: string | null, mediaItem?: MediaItem | null) => void }
  | { multiple: true; currentMediaIds: string[]; onSelectMultiple: (items: MediaItem[]) => void }
);

/** Adaptador compatible con las asignaciones actuales; las secuencias admiten selección múltiple. */
export function PodcastPickerDialog(props: PodcastPickerDialogProps) {
  const t = useT();
  return <MediaLibraryPicker destino="programa" multiple={props.multiple}
    open={props.open} onOpenChange={props.onOpenChange}
    selectedIds={props.multiple ? props.currentMediaIds : props.currentMediaId ? [props.currentMediaId] : []}
    title={props.multiple ? undefined : t("Seleccionar podcast educativo")}
    description={props.multiple ? undefined : props.dayLabel ? t("Asigna el episodio para el {day}", { day: props.dayLabel }) : t("Busca y selecciona un podcast publicado")}
    onConfirm={items => {
      if (props.multiple) props.onSelectMultiple(items);
      else props.onSelect(items[0]?.id ?? null, items[0] ?? null);
    }}
    onReset={props.multiple ? undefined : () => props.onSelect(null, null)} />;
}
