"use client";

import { useEffect, useState } from "react";
import { FileAudio, LoaderCircle } from "lucide-react";
import { getMediaStreamUrl } from "../services/media-service";
import type { MediaItem } from "../types";

interface MediaPlayerProps {
  storageKey: string;
  mediaType: MediaItem["mediaType"];
  className?: string;
  preload?: "none" | "metadata" | "auto";
}

/**
 * Reproductor de audio/video que obtiene una URL firmada temporal del back
 * (el <video>/<audio> nativo no puede enviar el header Authorization) y la
 * usa como fuente. Muestra un loader mientras firma la URL.
 */
export function MediaPlayer({
  storageKey,
  mediaType,
  className = "",
  preload = "metadata",
}: MediaPlayerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMediaStreamUrl(storageKey)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-3 py-6 text-xs text-muted-foreground">
        <FileAudio className="size-4" />
        No se pudo cargar el medio
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-3 py-6 text-xs text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Cargando medio...
      </div>
    );
  }

  if (mediaType === "Video") {
    return (
      <video
        src={url}
        controls
        preload={preload}
        className={`max-h-72 w-full bg-black ${className}`}
      />
    );
  }

  return (
    <audio src={url} controls preload={preload} className={`w-full ${className}`} />
  );
}
