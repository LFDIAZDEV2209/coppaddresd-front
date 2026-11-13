"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FileAudio, LoaderCircle } from "lucide-react";
import { getMediaStreamUrl } from "../services/media-service";
import type { MediaItem } from "../types";
import { useT } from "@/providers/i18n-provider";

interface MediaPlayerProps {
  storageKey: string;
  mediaType: MediaItem["mediaType"];
  className?: string;
  preload?: "none" | "metadata" | "auto";
  onDuration?: (seconds: number) => void;
  alt?: string;
  /** Opt-in para la escucha desde la biblioteca; conserva el comportamiento anterior por defecto. */
  autoPlay?: boolean;
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
  onDuration,
  alt,
  autoPlay = false,
}: MediaPlayerProps) {
  const t = useT();
  const [source, setSource] = useState<{ key: string; url: string | null; error: boolean } | null>(null);
  const url = source?.key === storageKey ? source.url : null;
  const error = source?.key === storageKey && source.error;

  useEffect(() => {
    let cancelled = false;

    getMediaStreamUrl(storageKey)
      .then((signedUrl) => {
        if (!cancelled) setSource({ key: storageKey, url: signedUrl, error: false });
      })
      .catch(() => {
        if (!cancelled) setSource({ key: storageKey, url: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-3 py-6 text-xs text-muted-foreground">
        <FileAudio className="size-4" />
        {t('No se pudo cargar el medio')}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted px-3 py-6 text-xs text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        {t('Cargando medio...')}
      </div>
    );
  }

  if (mediaType === "Image") {
    return <Image src={url} alt={alt ?? t("Imagen del ejercicio")} width={960} height={540} unoptimized
      onError={() => setSource({ key: storageKey, url: null, error: true })} className={`h-auto max-h-80 w-full object-contain ${className}`} />;
  }

  if (mediaType === "Video") {
    return (
      <video
        src={url}
        controls
        autoPlay={autoPlay}
        aria-label={alt}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) onDuration?.(seconds);
        }}
        preload={preload}
        playsInline
        className={`max-h-72 w-full min-w-0 max-w-full bg-black ${className}`}
      />
    );
  }

  return (
    <audio src={url} controls autoPlay={autoPlay} aria-label={alt} onLoadedMetadata={(event) => {
      const seconds = event.currentTarget.duration;
      if (Number.isFinite(seconds) && seconds > 0) onDuration?.(seconds);
    }} preload={preload} className={`block w-full min-w-0 max-w-full ${className}`} />
  );
}
