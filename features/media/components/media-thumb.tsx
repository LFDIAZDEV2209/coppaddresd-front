"use client";

import { useEffect, useState } from "react";
import { getMediaStreamUrl } from "../services/media-service";

interface MediaThumbProps {
  storageKey: string;
  alt: string;
  className?: string;
}

/**
 * Previsualiza la miniatura de un medio usando la URL firmada de lectura
 * (GET /api/v1/storage/sign). No renderiza nada si la clave no resuelve.
 */
export function MediaThumb({ storageKey, alt, className }: MediaThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMediaStreamUrl(storageKey)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  if (!url) return null;

  // eslint-disable-next-line @next/next/no-img-element -- La URL es firmada y temporal (exp+sig); el optimizer de next/image la rompería/cachearía mal.
  return <img src={url} alt={alt} className={className} />;
}
