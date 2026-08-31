"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

/**
 * Lightbox para visionado a pantalla completa de imagen/video de publicación.
 * Usa DialogPortal + Backdrop + Popup customizados (no DialogContent) para
 * evitar que el estilo por defecto (max-w-sm, bg-popover) colisione con el
 * overlay a pantalla completa.
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
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-50 rounded-full bg-black/40 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>

          {/* Media */}
          <div className="flex max-h-[85vh] max-w-[90vw] flex-col items-center gap-3">
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
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
