"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Lightbox para visionado a pantalla completa de imagen/video de publicación.
 * Fondo oscuro (via Dialog overlay), contenido centrado, cerrar con botón ✕ / Esc / tap overlay.
 */
export function MediaLightbox({
  url,
  mediaType,
  body,
  open,
  onOpenChange,
}: {
  url: string | null;
  mediaType?: "IMAGE" | "VIDEO" | null;
  body?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isVideo = mediaType === "VIDEO";

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 z-50 flex items-center justify-center border-0 bg-black/90 p-0 shadow-none ring-0 sm:max-w-none [&>button]:text-white/80 [&>button]:hover:text-white"
        showCloseButton
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3 z-50 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={handleClose}
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </Button>

        {/* Media */}
        <div
          className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt="Imagen ampliada"
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
          )}
          {body && (
            <p className="max-w-[80vw] text-center text-xs text-white/60">
              {body}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
