"use client";
import { useState, type ComponentProps } from "react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";

/** Los adjuntos inválidos muestran un estado explícito, sin un reproductor vacío. */
export function CommunityVideo({ src, onError, ...props }: Omit<ComponentProps<"video">, "src"> & { src?: string }) {
  const t = useT();
  const [failedSrc, setFailedSrc] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  if (src && failedSrc === src) return <div role="status" className="grid min-h-32 place-content-center gap-3 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
    <p>{t("No se pudo reproducir este video. El archivo puede no estar disponible o tener un formato incompatible.")}</p>
    {props.controls && <Button variant="outline" onClick={() => { setFailedSrc(undefined); setAttempt(a => a + 1); }}>{t("Reintentar")}</Button>}
  </div>;
  return <video {...props} src={src} key={`${src}-${attempt}`} preload={props.preload ?? "metadata"} onError={event => { setFailedSrc(src); onError?.(event); }} />;
}
