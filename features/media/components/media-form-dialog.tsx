"use client";

import { useState, useRef, type FormEvent } from "react";
import {
  FileAudio,
  LoaderCircle,
  UploadCloud,
  X,
  Clock,
  HardDrive,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MediaItem, MediaInput } from "../types";
import { detectMediaMetadata, type DetectedMediaMetadata } from "../services/upload-service";
import { formatDuration, formatFileSize } from "../services/media-service";
import { MediaPlayer } from "./media-player";
import { MediaThumb } from "./media-thumb";
import { mediaCategoryMeta } from "./media-meta";

interface MediaFormDialogProps {
  open: boolean;
  media?: MediaItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: MediaInput,
    file?: File,
    thumbnailFile?: File | null,
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
}

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024; // 2 MB

const emptyForm = {
  title: "",
  description: null as string | null,
  author: "",
  category: "Nutricion" as MediaInput["category"],
  status: "Draft" as MediaInput["status"],
  sortOrder: 1,
  day: 1,
  month: 1,
};

export function MediaFormDialog({
  open,
  media,
  saving,
  onOpenChange,
  onSubmit,
}: MediaFormDialogProps) {
  const [form, setForm] = useState(() =>
    media
      ? {
          title: media.title,
          description: media.description,
          author: media.author ?? "",
          category: mediaCategoryMeta[media.category]
            ? media.category
            : emptyForm.category,
          status: media.status,
          sortOrder: media.sortOrder,
          day: media.day,
          month: media.month,
        }
      : emptyForm,
  );
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<DetectedMediaMetadata | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailCleared, setThumbnailCleared] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setMetadata(null);
    setDetecting(true);
    setValidationError(null);
    try {
      const detected = await detectMediaMetadata(selected);
      setMetadata(detected);
    } catch {
      setMetadata(null);
    } finally {
      setDetecting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setMetadata(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setValidationError("La miniatura debe ser una imagen (JPG, PNG, WebP...).");
      return;
    }
    if (selected.size > MAX_THUMBNAIL_BYTES) {
      setValidationError("La miniatura no puede superar los 2 MB.");
      return;
    }

    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(selected);
    setThumbnailPreview(URL.createObjectURL(selected));
    setThumbnailCleared(false);
    setValidationError(null);
  };

  const clearThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setThumbnailCleared(true);
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setValidationError("El título es obligatorio.");
      return;
    }
    if (!form.author.trim()) {
      setValidationError("El autor es obligatorio.");
      return;
    }

    // En creación el archivo es obligatorio; en edición es opcional (reemplazo).
    if (!media && !file) {
      setValidationError("Adjunta el archivo de audio o video para continuar.");
      return;
    }

    setValidationError(null);
    setProgress(0);

    const input: MediaInput = media && !file
      ? {
          title: form.title.trim(),
          description: form.description,
          author: form.author.trim(),
          mediaType: media.mediaType,
          category: form.category,
          storageKey: media.storageKey,
          thumbnailKey: media.thumbnailKey && !thumbnailCleared
            ? media.thumbnailKey
            : null,
          contentType: media.contentType,
          fileSizeBytes: media.fileSizeBytes,
          durationSecs: media.durationSecs,
          status: form.status,
          sortOrder: form.sortOrder,
          day: form.day,
          month: form.month,
        }
      : {
          title: form.title.trim(),
          description: form.description,
          author: form.author.trim(),
          mediaType: metadata?.mediaType ?? "Podcast",
          category: form.category,
          storageKey: "",
          thumbnailKey: null,
          contentType: metadata?.contentType ?? file?.type ?? null,
          fileSizeBytes: metadata?.fileSizeBytes ?? file?.size ?? null,
          durationSecs: metadata?.durationSecs ?? null,
          status: form.status,
          sortOrder: form.sortOrder,
          day: form.day,
          month: form.month,
        };

    await onSubmit(input, file ?? undefined, thumbnailFile, setProgress);
  };

  const uploading = progress !== null && progress > 0 && progress < 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] min-w-[700px] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileAudio className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>
                {media ? "Editar medio" : "Nuevo medio"}
              </DialogTitle>
              <DialogDescription>
                {media
                  ? "Actualiza la información del medio. Si adjuntás un archivo, se reemplaza el contenido."
                  : "Adjuntá el archivo: el tipo, la duración y el tamaño se detectan automáticamente."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-5">
          {!media && (
            <div>
              <Label htmlFor="media-file">
                Archivo (audio o video){" "}
                <span className="ml-1 text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <input
                ref={fileInputRef}
                id="media-file"
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file ? (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <FileAudio className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {detecting
                        ? "Leyendo metadata del archivo..."
                        : metadata
                          ? `${metadata.mediaType} · ${formatDuration(metadata.durationSecs)} · ${formatFileSize(metadata.fileSizeBytes)}`
                          : `${formatFileSize(file.size)}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={clearFile}
                    disabled={uploading}
                    aria-label="Quitar archivo"
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <UploadCloud className="size-6" />
                  </span>
                  <span className="text-sm font-medium">
                    Seleccioná el archivo del medio
                  </span>
                  <span className="text-xs text-muted-foreground">
                    MP3, WAV, M4A, MP4, WebM...
                  </span>
                </button>
              )}
            </div>
          )}

          {media && (
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Archivo actual
              </p>
              <MediaPlayer
                storageKey={media.storageKey}
                mediaType={media.mediaType}
                className="max-h-48"
              />
              <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatDuration(media.durationSecs)}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="size-3.5" />
                  {formatFileSize(media.fileSizeBytes)}
                </span>
                <span>{media.mediaType}</span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <UploadCloud data-icon="inline-start" />
                Reemplazar archivo
              </Button>
              <input
                ref={fileInputRef}
                id="media-file-edit"
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {file && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {metadata
                      ? `${metadata.mediaType} · ${formatDuration(metadata.durationSecs)}`
                      : "Leyendo metadata..."}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={clearFile}
                    disabled={uploading}
                    aria-label="Quitar archivo nuevo"
                  >
                    <X />
                  </Button>
                </div>
              )}
            </div>
          )}

          {progress !== null && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {progress >= 100 ? "Subida completada" : "Subiendo archivo..."}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="media-thumbnail">Miniatura (opcional)</Label>
            <input
              ref={thumbInputRef}
              id="media-thumbnail"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
              disabled={uploading}
            />
            {thumbnailPreview ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- Vista previa local con object URL; el optimizer de next/image no aplica a blob: */}
                <img
                  src={thumbnailPreview}
                  alt="Vista previa de la miniatura"
                  className="size-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {thumbnailFile?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nueva miniatura · se sube al guardar
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearThumbnail}
                  disabled={uploading}
                  aria-label="Quitar miniatura nueva"
                >
                  <X />
                </Button>
              </div>
            ) : media?.thumbnailKey && !thumbnailCleared ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <MediaThumb
                  storageKey={media.thumbnailKey}
                  alt={`Miniatura de ${media.title}`}
                  className="size-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Miniatura actual</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {media.thumbnailKey}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearThumbnail}
                  disabled={uploading}
                  aria-label="Quitar miniatura"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft/40 disabled:opacity-50"
              >
                <ImagePlus className="size-4" />
                Agregar miniatura
              </button>
            )}
          </div>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Información del medio
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título" required>
                <Input
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Ej. Bienvenida al programa"
                  disabled={uploading}
                />
              </Field>
              <Field label="Orden de lección">
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) =>
                    update("sortOrder", Number(event.target.value) || 0)
                  }
                  placeholder="Ej. 1"
                  disabled={uploading}
                />
              </Field>
              <Field label="Autor" required>
                <Input
                  value={form.author}
                  onChange={(event) => update("author", event.target.value)}
                  placeholder="Ej. Dra. Ana Pérez"
                  disabled={uploading}
                />
              </Field>
              <Field label="Categoría" required>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  value={form.category}
                  onChange={(event) =>
                    update(
                      "category",
                      event.target.value as MediaInput["category"],
                    )
                  }
                  disabled={uploading}
                >
                  {Object.entries(mediaCategoryMeta).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Día">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.day}
                  onChange={(event) =>
                    update("day", Number(event.target.value) || 1)
                  }
                  placeholder="Ej. 1"
                  disabled={uploading}
                />
              </Field>
              <Field label="Mes">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={form.month}
                  onChange={(event) =>
                    update("month", Number(event.target.value) || 1)
                  }
                  placeholder="Ej. 1"
                  disabled={uploading}
                />
              </Field>
              <Field label="Estado" required>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  value={form.status}
                  onChange={(event) =>
                    update(
                      "status",
                      event.target.value as MediaInput["status"],
                    )
                  }
                  disabled={uploading}
                >
                  <option value="Draft">Borrador</option>
                  <option value="Published">Publicado</option>
                  <option value="Archived">Archivado</option>
                </select>
              </Field>
            </div>
          </fieldset>

          <Field label="Descripción">
            <textarea
              className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={form.description ?? ""}
              onChange={(event) =>
                update("description", event.target.value || null)
              }
              placeholder="Describe el contenido del medio"
              disabled={uploading}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Publicar de inmediato</span>
              <span className="text-xs text-muted-foreground">
                Al publicar se fijará la fecha de publicación automáticamente.
              </span>
            </div>
            <Switch
              checked={form.status === "Published"}
              onCheckedChange={(checked) =>
                update("status", checked ? "Published" : "Draft")
              }
              disabled={uploading}
              aria-label="Publicar de inmediato"
            />
          </div>

          {validationError && (
            <p
              className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {validationError}
            </p>
          )}

          <DialogFooter className="-mx-6 -mb-5 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || uploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {uploading ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  Subiendo...
                </>
              ) : saving ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  Guardando...
                </>
              ) : media ? (
                "Guardar cambios"
              ) : (
                "Subir y crear medio"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}
