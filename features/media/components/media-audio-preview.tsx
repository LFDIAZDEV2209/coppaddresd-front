"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, TriangleAlert } from "lucide-react";
import { getMediaStreamUrl } from "../services/media-service";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Registro global de pausas: solo un reproductor de preescucha suena a la
 * vez en toda la página. Cada instancia registra su función de pausa y al
 * reproducir detiene a las demás (evita audios superpuestos entre casillas).
 */
const activePausers = new Set<() => void>();

interface MediaAudioPreviewProps {
  /** Clave del objeto de audio en el storage (se firma solo al reproducir). */
  storageKey: string;
  /** Etiqueta de accesibilidad (título del podcast). */
  label?: string;
  /** Variante compacta para tarjetas del selector. */
  compact?: boolean;
  className?: string;
}

/**
 * Reproductor de preescucha inline (REQ-PCA-05): botón play/pause con barra
 * de progreso para escuchar un fragmento de prueba del podcast antes de
 * asignarlo. La URL firmada se resuelve al primer play (no se firman N urls
 * por página) y la reproducción no sale del modal actual.
 */
export function MediaAudioPreview({
  storageKey,
  label,
  compact = false,
  className,
}: MediaAudioPreviewProps) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  /** Pausa esta instancia (se registra en el conjunto global de pausas). */
  const pauseSelf = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // Al desmontar, pausa y libera el registro (evita audio fantasma).
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      activePausers.delete(pauseSelf);
      audio?.pause();
    };
  }, [pauseSelf]);

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    // Un solo reproductor activo: pausa al resto antes de sonar.
    activePausers.forEach((pause) => pause());
    activePausers.add(pauseSelf);

    if (!url) {
      setLoading(true);
      setError(false);
      try {
        const signed = await getMediaStreamUrl(storageKey);
        setUrl(signed);
      } catch {
        setError(true);
        setLoading(false);
        activePausers.delete(pauseSelf);
        return;
      }
      setLoading(false);
    }
    // El elemento <audio> se monta con la nueva URL después de este render;
    // el atributo autoPlay dispara la reproducción en cuanto cargue.
    if (url) {
      requestAnimationFrame(() => {
        void audioRef.current?.play().catch(() => {
          setPlaying(false);
        });
      });
    }
  };

  const showProgress = playing || progress > 0;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void toggle();
        }}
        disabled={loading || error}
        aria-label={
          playing ? t("Pausar preescucha") : t("Preescuchar fragmento")
        }
        title={label ? `${t("Preescuchar")}: ${label}` : t("Preescuchar")}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50",
          compact ? "size-7" : "size-8",
        )}
      >
        {error ? (
          <TriangleAlert className={compact ? "size-3" : "size-3.5"} />
        ) : playing ? (
          <Pause className={compact ? "size-3" : "size-3.5"} />
        ) : (
          <Play className={compact ? "size-3" : "size-3.5"} />
        )}
      </button>
      <div className="min-w-0 flex-1" aria-hidden={!showProgress}>
        {showProgress ? (
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={t("Progreso de la preescucha")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        ) : (
          <div className="h-1 w-full rounded-full bg-muted/70" />
        )}
      </div>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          autoPlay
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            activePausers.delete(pauseSelf);
          }}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
            activePausers.delete(pauseSelf);
          }}
          onTimeUpdate={(event) => {
            const el = event.currentTarget;
            if (el.duration > 0) setProgress(el.currentTime / el.duration);
          }}
          onError={() => setError(true)}
          className="hidden"
        />
      )}
    </div>
  );
}
