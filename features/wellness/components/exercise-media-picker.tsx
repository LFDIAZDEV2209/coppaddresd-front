"use client";

import { useEffect, useId, useState } from "react";
import { ImageIcon, Upload, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { ExerciseMediaCredits } from "./exercise-media-credits";
import { MediaPlayer } from "@/features/media/components/media-player";
import { fetchMediaItems, getMediaItemById } from "@/features/media/services/media-service";
import { uploadExerciseMedia } from "../services/exercise-media-service";
import type { MediaItem } from "@/features/media/types";

interface Props {
  value: string;
  exerciseName: string;
  disabled?: boolean;
  onChange: (id: string) => void;
  onBusyChange: (busy: boolean) => void;
}

/** Biblioteca compartida: se conserva la referencia y se publica el archivo
 * antes de adjuntarlo; nunca se fabrican demostraciones para un ejercicio. */
export function ExerciseMediaPicker({ value, exerciseName, disabled, onChange, onBusyChange }: Props) {
  const t = useT();
  const { can } = useAppContext();
  const fieldId = useId();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const canBrowse = can("Media.View");
  const canUpload = can("Media.Create") && can("Media.Publish") && can("Wellness.Manage");

  useEffect(() => {
    if (!canBrowse) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      Promise.all([
        fetchMediaItems(1, 20, { status: "Published", mediaType: "Video", search }, controller.signal),
        fetchMediaItems(1, 20, { status: "Published", mediaType: "Image", search }, controller.signal),
      ]).then(([videos, images]) => {
        setItems([...videos.data, ...images.data]);
        setLibraryError("");
      }).catch(() => {
        if (!controller.signal.aborted) setLibraryError(t("No se pudo cargar la biblioteca de ejercicios."));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, canBrowse, t]);

  useEffect(() => {
    let active = true;
    if (value && canBrowse) {
      getMediaItemById(value).then((item) => { if (active) setSelected(item); })
        .catch(() => { if (active) setSelected(null); });
    }
    return () => { active = false; };
  }, [value, canBrowse]);

  const upload = async (file: File) => {
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const isImage = imageTypes.includes(file.type);
    if (!isImage && !videoTypes.includes(file.type)) {
      setError(t("Usa una imagen JPG, PNG, WebP o GIF, o un vídeo MP4, WebM o MOV."));
      return;
    }
    if (file.size <= 0 || file.size > (isImage ? 5 : 20) * 1024 * 1024) {
      setError(t("El vídeo admite hasta 20 MB y la imagen hasta 5 MB."));
      return;
    }
    setBusy(true); onBusyChange(true); setError("");
    try {
      const created = await uploadExerciseMedia(file, exerciseName.trim() || file.name);
      setSelected(created);
      onChange(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("No se pudo adjuntar la demostración."));
    } finally {
      setBusy(false); onBusyChange(false);
    }
  };

  return <section className="flex min-w-0 flex-col gap-3">
    {value ? <div className="flex flex-col gap-3">
      {selected?.id === value && <MediaPlayer key={value} storageKey={selected.storageKey} thumbnailKey={selected.thumbnailKey}
        mediaType={selected.mediaType} alt={exerciseName || selected.title} preload="none" className="rounded-lg" />}
      <ExerciseMediaCredits provenance={selected?.id === value ? selected.provenance : null} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{selected?.id === value ? selected.title : t("Demostración adjunta")}</p>
        <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => onChange("")}>
          <X className="size-4" />{t("Quitar demostración")}
        </Button>
      </div>
    </div> : <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{t("Este ejercicio todavía no tiene imagen o vídeo.")}</p>}
    {canBrowse ? <>
      <Label htmlFor={`${fieldId}-search`}>{t("Buscar una demostración publicada")}</Label>
      <Input id={`${fieldId}-search`} value={search} disabled={disabled || busy}
        placeholder={t("Buscar una demostración publicada")}
        onChange={(event) => setSearch(event.target.value)} />
      <div className="flex max-h-36 flex-col gap-1 overflow-y-auto" aria-busy={loading}>
        {loading ? <p role="status" className="py-2 text-xs text-muted-foreground">{t("Cargando demostraciones...")}</p>
          : items.length === 0 ? <p className="py-2 text-xs text-muted-foreground">{t("No hay demostraciones publicadas para esta búsqueda.")}</p>
          : items.map((item) => <Button key={item.id} type="button" variant={value === item.id ? "secondary" : "ghost"}
              className="min-h-10 justify-start whitespace-normal text-left" disabled={disabled || busy}
              onClick={() => { setSelected(item); onChange(item.id); }}>
              {item.mediaType === "Image" ? <ImageIcon className="size-4 shrink-0" /> : <Video className="size-4 shrink-0" />}
              {item.title}
            </Button>)}
      </div>
    </> : <p className="text-xs text-muted-foreground">{t("Necesitas el permiso de biblioteca de medios para buscar demostraciones.")}</p>}
    {canUpload && <div className="flex flex-col gap-2 border-t border-border pt-3">
      <Label htmlFor={`${fieldId}-file`} className="flex items-center gap-2"><Upload className="size-4" />{t("Subir imagen o vídeo")}</Label>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("Sube únicamente archivos propios o con permiso para compartirlos con los pacientes. Vídeo: 20 MB y 3 minutos. Imagen: 5 MB.")}</p>
      <Input id={`${fieldId}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        disabled={disabled || busy} onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file);
        }} />
      {busy && <p role="status" className="text-xs text-muted-foreground">{t("Preparando y guardando la demostración...")}</p>}
    </div>}
    {libraryError && <p role="alert" className="text-xs text-destructive">{libraryError}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </section>;
}
