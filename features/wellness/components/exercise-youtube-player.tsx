"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { canonicalYouTubeUrl } from "../services/exercise-media-service";

/** Reproductor oficial intacto: sin autoplay, proxy ni descarga de YouTube. */
export function ExerciseYouTubePlayer({ url, title }: { url: string; title: string }) {
  const t = useT();
  const canonical = canonicalYouTubeUrl(url);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [canonical]);
  if (!canonical) return <p role="alert">{t("Usa un enlace válido de YouTube con HTTPS.")}</p>;
  const id = new URL(canonical).searchParams.get("v");
  return <div ref={container} className="flex w-full min-w-0 max-w-xl flex-col gap-2">
    {width !== null && width >= 200 ? <iframe className="aspect-video min-h-[200px] w-full rounded-xl border-0 bg-black" title={t("Demostración de {exercise}", { exercise: title })}
      src={`https://www.youtube-nocookie.com/embed/${id}?playsinline=1&autoplay=0`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : width === null ? <div className="min-h-[200px] animate-pulse rounded-xl bg-muted" /> : <p className="text-sm font-medium">{t("Vista previa disponible en YouTube")}</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">{t("YouTube conserva sus controles y anuncios. Si el vídeo no está disponible aquí, ábrelo en YouTube.")}</p>
    <p className="text-xs text-muted-foreground"><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("Condiciones de YouTube")}</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("Privacidad de Google")}</a></p>
    <a className="w-fit text-sm font-medium underline underline-offset-4" href={canonical} target="_blank" rel="noopener noreferrer">{t("Abrir en YouTube")}</a>
  </div>;
}
