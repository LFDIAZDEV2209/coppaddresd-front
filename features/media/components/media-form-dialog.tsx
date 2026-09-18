"use client";

import {
  FileAudio,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaItem, MediaInput } from "../types";
import { MediaFormFields } from "./media-form-fields";
import { useT } from "@/providers/i18n-provider";

interface MediaFormDialogProps {
  open: boolean;
  media?: MediaItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: MediaInput,
    file?: File,
    thumbnailFile?: File | null,
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
}

/**
 * Modal de EDICIÓN de medios. La creación vive en la página dedicada
 * /media/new; el cuerpo del formulario es compartido (MediaFormFields).
 */
export function MediaFormDialog({
  open,
  media,
  saving,
  onOpenChange,
  onSubmit,
}: MediaFormDialogProps) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] min-w-[700px] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileAudio className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>
                {media ? t('Editar medio') : t('Nuevo medio')}
              </DialogTitle>
              <DialogDescription>
                {media
                  ? t('Actualiza la información del medio. Si adjuntás un archivo, se reemplaza el contenido.')
                  : t('Adjuntá el archivo: el tipo, la duración y el tamaño se detectan automáticamente.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <MediaFormFields
          media={media}
          saving={saving}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
          footerClassName="-mx-6 -mb-5 px-6"
        />
      </DialogContent>
    </Dialog>
  );
}
