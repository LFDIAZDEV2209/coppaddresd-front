"use client";

import { useEffect, useId, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { MediaLibraryPicker } from "@/features/media/components/media-library-picker";
import { MediaPlayer } from "@/features/media/components/media-player";
import { createMediaItem, getMediaItemById, publishMediaItem } from "@/features/media/services/media-service";
import { detectMediaMetadata, resolveStorageKeys } from "@/features/media/services/upload-service";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const canBrowse = can("Media.View");
  const canUpload = can("Media.Create") && can("Media.Publish");

  useEffect(() => {
    let active = true;
    if (value && canBrowse) {
      getMediaItemById(value).then((item) => { if (active) setSelected(item.mediaType === "Video" || item.mediaType === "Image" ? item : null); })
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
    if (file.size <= 0 || file.size > (isImage ? 20 : 1024) * 1024 * 1024) {
      setError(t("La imagen admite hasta 20 MB y el vídeo hasta 1 GB."));
      return;
    }
    setBusy(true); onBusyChange(true); setError(""); setProgress(0);
    try {
      const metadata = isImage ? null : await detectMediaMetadata(file);
      if (!isImage && !metadata?.durationSecs) throw new Error(t("No se pudo leer la duración del vídeo."));
      const input = await resolveStorageKeys({
        title: exerciseName.trim() || file.name,
        description: null, author: "", mediaType: isImage ? "Image" : "Video", category: "SaludFisica",
        storageKey: "", thumbnailKey: null, contentType: file.type,
        fileSizeBytes: file.size, durationSecs: metadata?.durationSecs ?? null,
        status: "Draft", sortOrder: 0, day: 0, month: 0,
      }, file, null, setProgress);
      const created = await createMediaItem(input);
      await publishMediaItem(created.id);
      setSelected({ ...created, status: "Published" });
      onChange(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("No se pudo adjuntar la demostración."));
    } finally {
      setBusy(false); onBusyChange(false);
    }
  };

  return <section className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{t("Demostración del ejercicio")}</h3>
        <p className="text-xs text-muted-foreground">{t("Adjunta una imagen o un vídeo real para guiar al paciente.")}</p>
      </div>
      <ImageIcon className="size-5 shrink-0 text-primary" aria-hidden />
    </div>
    {value ? <div className="flex flex-col gap-3">
      {selected?.id === value && <MediaPlayer key={value} storageKey={selected.storageKey}
        mediaType={selected.mediaType} alt={exerciseName || selected.title} preload="none" className="rounded-lg" />}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{selected?.id === value ? selected.title : t("Demostración adjunta")}</p>
        <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => onChange("")}>
          <X className="size-4" />{t("Quitar demostración")}
        </Button>
      </div>
    </div> : <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{t("Este ejercicio todavía no tiene imagen o vídeo.")}</p>}
    {canBrowse ? <>
      <Button id={`${fieldId}-library`} type="button" variant="outline" disabled={disabled || busy}
        onClick={() => setPickerOpen(true)}>{t("Elegir de la biblioteca")}</Button>
      <MediaLibraryPicker destino="rutinas" open={pickerOpen} onOpenChange={setPickerOpen}
        selectedIds={value ? [value] : []} title={t("Demostración del ejercicio")}
        onConfirm={items => { const item = items[0]; if (item) { setSelected(item); onChange(item.id); } }} />
    </> : <p className="text-xs text-muted-foreground">{t("Necesitas el permiso de biblioteca de medios para buscar demostraciones.")}</p>}
    {canUpload && <div className="flex flex-col gap-2 border-t border-border pt-3">
      <Label htmlFor={`${fieldId}-file`} className="flex items-center gap-2"><Upload className="size-4" />{t("Subir imagen o vídeo")}</Label>
      <Input id={`${fieldId}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        disabled={disabled || busy} onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file);
        }} />
      {busy && <p role="status" className="text-xs text-muted-foreground">{t("Preparando demostración: {progress}%", { progress: String(progress) })}</p>}
    </div>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </section>;
}
