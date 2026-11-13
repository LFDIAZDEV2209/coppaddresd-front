"use client";

import {
  useState,
  useRef,
  useId,
  useEffect,
  cloneElement,
  isValidElement,
  type ReactElement,
  type FormEvent,
} from "react";

import {
  FileAudio,
  LoaderCircle,
  UploadCloud,
  X,
  Clock,
  HardDrive,
  ImagePlus,
  Plus,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type {
  MediaItem,
  MediaInput,
  MediaChapter,
  MediaReferences,
} from "../types";
import {
  detectMediaMetadata,
  type DetectedMediaMetadata,
} from "../services/upload-service";
import {
  formatDuration,
  formatFileSize,
  fetchMediaReferences,
} from "../services/media-service";
import { MediaPlayer } from "./media-player";
import { MediaThumb } from "./media-thumb";
import { mediaCategoryMeta } from "./media-meta";
import { useT } from "@/providers/i18n-provider";

interface MediaFormFieldsProps {
  /** Medio en edición (undefined = creación). */
  media?: MediaItem;
  saving: boolean;
  /** Error del backend a mostrar sobre las acciones (conserva los datos). */
  serverError?: string | null;
  /** Etiqueta del botón principal (default: Guardar cambios / Subir y crear medio). */
  submitLabel?: string;
  /** Clases extra para el footer (el dialog usa márgenes negativos). */
  footerClassName?: string;
  previewClassName?: string;
  fullPage?: boolean;
  /** El panel de la tarjeta conserva los metadatos avanzados sin mostrarlos. */
  mode?: "full" | "quick";
  onCancel: () => void;
  onSubmit: (
    input: MediaInput,
    file?: File,
    thumbnailFile?: File | null,
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
}

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024; // 2 MB

function secondsToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mmssToSeconds(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  return parseInt(str, 10) || 0;
}

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

/**
 * Cuerpo del formulario de medios (creación y edición): archivo con detección
 * de metadata, miniatura, campos, capítulos, takeaways y acciones. Lo usan el
 * páginas de edición y creación (/media/new) — misma
 * lógica, misma presentación.
 */
export function MediaFormFields({
  media,
  saving,
  serverError,
  submitLabel,
  footerClassName,
  previewClassName,
  fullPage = false,
  mode = "full",
  onCancel,
  onSubmit,
}: MediaFormFieldsProps) {
  const t = useT();
  const quick = mode === "quick";
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
  const [chapters, setChapters] = useState<
    { timeStr: string; label: string }[]
  >(() =>
    media?.chapters
      ? media.chapters.map((c) => ({
          timeStr: secondsToMMSS(c.atSeconds),
          label: c.label,
        }))
      : [],
  );
  const [takeaways, setTakeaways] = useState<string[]>(() =>
    media?.takeaways ? [...media.takeaways] : [],
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

  const update = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addChapter = () => {
    setChapters((prev) => [...prev, { timeStr: "00:00", label: "" }]);
  };

  const updateChapter = (
    index: number,
    field: "timeStr" | "label",
    val: string,
  ) => {
    setChapters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c)),
    );
  };

  const removeChapter = (index: number) => {
    setChapters((prev) => prev.filter((_, i) => i !== index));
  };

  const addTakeaway = () => {
    setTakeaways((prev) => [...prev, ""]);
  };

  const updateTakeaway = (index: number, val: string) => {
    setTakeaways((prev) => prev.map((t, i) => (i === index ? val : t)));
  };

  const removeTakeaway = (index: number) => {
    setTakeaways((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (
      quick &&
      !selected.type.startsWith("audio/") &&
      !/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(selected.name)
    ) {
      setValidationError(
        t("Selecciona archivos de audio para la biblioteca de podcasts."),
      );
      return;
    }

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

  const handleThumbnailChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setValidationError(
        t("La miniatura debe ser una imagen (JPG, PNG, WebP...)."),
      );
      return;
    }
    if (selected.size > MAX_THUMBNAIL_BYTES) {
      setValidationError(t("La miniatura no puede superar los 2 MB."));
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
      setValidationError(t("El título es obligatorio."));
      return;
    }
    if (!form.author.trim()) {
      setValidationError(t("El autor es obligatorio."));
      return;
    }

    // En creación el archivo es obligatorio; en edición es opcional (reemplazo).
    if (!media && !file) {
      setValidationError(
        t("Adjunta el archivo de audio o video para continuar."),
      );
      return;
    }

    setValidationError(null);
    setProgress(0);

    const parsedChapters: MediaChapter[] = chapters
      .filter((c) => c.label.trim())
      .map((c) => ({
        atSeconds: mmssToSeconds(c.timeStr),
        label: c.label.trim(),
      }))
      .sort((a, b) => a.atSeconds - b.atSeconds);

    const parsedTakeaways = takeaways.map((t) => t.trim()).filter(Boolean);

    const input: MediaInput =
      media && !file
        ? {
            title: form.title.trim(),
            description: form.description,
            author: form.author.trim(),
            mediaType: media.mediaType,
            category: form.category,
            storageKey: media.storageKey,
            thumbnailKey:
              media.thumbnailKey && !thumbnailCleared
                ? media.thumbnailKey
                : null,
            contentType: media.contentType,
            fileSizeBytes: media.fileSizeBytes,
            durationSecs: media.durationSecs,
            status: form.status,
            sortOrder: form.sortOrder,
            day: form.day,
            month: form.month,
            chapters: parsedChapters,
            takeaways: parsedTakeaways,
          }
        : {
            title: form.title.trim(),
            description: form.description,
            author: form.author.trim(),
            mediaType: metadata?.mediaType ?? "Podcast",
            category: form.category,
            storageKey: "",
            thumbnailKey: !thumbnailCleared ? media?.thumbnailKey ?? null : null,
            contentType: metadata?.contentType ?? file?.type ?? null,
            fileSizeBytes: metadata?.fileSizeBytes ?? file?.size ?? null,
            durationSecs: metadata?.durationSecs ?? null,
            status: form.status,
            sortOrder: form.sortOrder,
            day: form.day,
            month: form.month,
            chapters: parsedChapters,
            takeaways: parsedTakeaways,
          };

    try {
      await onSubmit(input, file ?? undefined, thumbnailFile, setProgress);
    } finally {
      // Una subida fallida debe permitir corregir o reintentar, sin perder el archivo.
      setProgress(null);
    }
  };

  const uploading = saving || progress !== null;

  const defaultSubmitLabel = media
    ? t("Guardar cambios")
    : t("Subir y crear medio");

  return (
    <form
      onSubmit={submit}
      className={
        fullPage
          ? "grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          : "flex flex-col gap-5 px-6 py-5"
      }
    >
      {!media && !quick && (
        <Link
          href="/media/new?mode=bulk"
          className={buttonVariants({
            variant: "outline",
            className: "min-h-11 self-start justify-self-start lg:col-span-2",
          })}
        >
          {t("Carga múltiple de podcasts")}
        </Link>
      )}
      <div
        data-slot="media-file-section"
        className={
          fullPage
            ? "flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
            : "contents"
        }
      >
        {!quick && !media && (
          <div>
            <Label htmlFor="media-file">
              {t("Archivo (audio o video)")}{" "}
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <input
              ref={fileInputRef}
              id="media-file"
              type="file"
              accept="audio/*,video/*,image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <FileAudio className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {detecting
                      ? t("Leyendo metadata del archivo...")
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
                  aria-label={t("Quitar archivo")}
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
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <UploadCloud className="size-6" />
                </span>
                <span className="text-sm font-medium">
                  {t("Seleccioná el archivo del medio")}
                </span>
                <span className="text-xs text-muted-foreground">
                  MP3, WAV, M4A, MP4, WebM...
                </span>
              </button>
            )}
          </div>
        )}

        {!quick && media && (
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {t("Archivo actual")}
            </p>
            <MediaPlayer
              storageKey={media.storageKey}
              mediaType={media.mediaType}
              className={previewClassName ?? "max-h-48"}
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
              {t("Reemplazar archivo")}
            </Button>
            <input
              ref={fileInputRef}
              id="media-file-edit"
              type="file"
              accept="audio/*,video/*,image/jpeg,image/png,image/webp,image/gif"
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
                    : t("Leyendo metadata...")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearFile}
                  disabled={uploading}
                  aria-label={t("Quitar archivo nuevo")}
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
                {progress >= 100
                  ? t("Subida completada")
                  : t("Subiendo archivo...")}
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
          <Label htmlFor="media-thumbnail">{t("Miniatura (opcional)")}</Label>
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
                alt={t("Vista previa de la miniatura")}
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {thumbnailFile?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Nueva miniatura · se sube al guardar")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clearThumbnail}
                disabled={uploading}
                aria-label={t("Quitar miniatura nueva")}
              >
                <X />
              </Button>
            </div>
          ) : media?.thumbnailKey && !thumbnailCleared ? (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <MediaThumb
                storageKey={media.thumbnailKey}
                alt={t("Miniatura de {title}", { title: media.title })}
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t("Miniatura actual")}
                </p>
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
                aria-label={t("Quitar miniatura")}
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
              {t("Agregar miniatura")}
            </button>
          )}
        </div>
      </div>
      <div
        data-slot="media-information-section"
        className={
          fullPage
            ? "flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6"
            : "contents"
        }
      >
        <fieldset className="flex min-w-0 flex-col gap-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("Información del medio")}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={quick ? "sm:col-span-2" : undefined}>
              <Field label={t("Título")} required>
                <Input
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder={t("Ej. Bienvenida al programa")}
                  disabled={uploading}
                />
              </Field>
            </div>
            {!quick && (
              <Field label={t("Orden de lección")}>
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
            )}
            {(!quick || !media?.author?.trim()) && (
              <Field label={t("Autor")} required>
                <Input
                  value={form.author}
                  onChange={(event) => update("author", event.target.value)}
                  placeholder={t("Ej. Dra. Ana Pérez")}
                  disabled={uploading}
                />
              </Field>
            )}
            <Field label={t("Categoría")} required>
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
                    {t(meta.label)}
                  </option>
                ))}
              </select>
            </Field>
            {quick && (
              <Field label={t("Duración")}>
                <output className="flex min-h-9 items-center rounded-md border border-border bg-muted px-3 font-mono text-sm">
                  {formatDuration(
                    metadata?.durationSecs ?? media?.durationSecs ?? null,
                  )}
                </output>
              </Field>
            )}
            {!quick && (
              <Field label={t("Estado")} required>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  value={form.status}
                  onChange={(event) =>
                    update("status", event.target.value as MediaInput["status"])
                  }
                  disabled={uploading}
                >
                  <option value="Draft">{t("Borrador")}</option>
                  <option value="Published">{t("Publicado")}</option>
                  <option value="Archived">{t("Archivado")}</option>
                </select>
              </Field>
            )}
          </div>
        </fieldset>

        <Field label={t("Descripción")}>
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={form.description ?? ""}
            onChange={(event) =>
              update("description", event.target.value || null)
            }
            placeholder={t("Describe el contenido del medio")}
            disabled={uploading}
          />
        </Field>
      </div>

      {quick && media && (
        <section
          className="flex flex-col gap-3 border-t border-border pt-5"
          aria-label={t("Dónde se usa")}
        >
          <h3 className="text-sm font-semibold">{t("Dónde se usa")}</h3>
          <MediaQuickUsage key={media.id} mediaId={media.id} />
          <input
            ref={fileInputRef}
            id="media-file"
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={uploading || detecting}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={uploading || detecting}
            onClick={() => fileInputRef.current?.click()}
          >
            <ArrowLeftRight aria-hidden="true" />
            {t("Reemplazar archivo")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t(
              "Al reemplazar el archivo se conservan las asignaciones. El cambio se aplica al guardar.",
            )}
          </p>
          {file && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <span className="min-w-0 break-all">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                disabled={uploading}
                onClick={clearFile}
              >
                {t("Quitar archivo nuevo")}
              </Button>
            </div>
          )}
          {detecting && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("Leyendo metadata del archivo...")}
            </p>
          )}
        </section>
      )}
      <div
        className={
          fullPage
            ? "flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-card p-4 sm:p-6 lg:col-span-2"
            : "contents"
        }
      >
        {!quick && (
          <>
            <fieldset className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Capítulos interactivos")}
                </legend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChapter}
                  disabled={uploading}
                >
                  <Plus className="size-3.5" data-icon="inline-start" />
                  {t("Agregar capítulo")}
                </Button>
              </div>
              {chapters.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  {t(
                    "Sin capítulos personalizados (se generarán automáticamente según la duración).",
                  )}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {chapters.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        className="w-24 shrink-0"
                        placeholder="00:00"
                        value={ch.timeStr}
                        onChange={(e) =>
                          updateChapter(idx, "timeStr", e.target.value)
                        }
                        disabled={uploading}
                      />
                      <Input
                        className="flex-1"
                        placeholder={t(
                          "Nombre del capítulo (ej. Introducción)",
                        )}
                        value={ch.label}
                        onChange={(e) =>
                          updateChapter(idx, "label", e.target.value)
                        }
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeChapter(idx)}
                        disabled={uploading}
                        aria-label={t("Eliminar capítulo")}
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Puntos Clave (Takeaways)")}
                </legend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTakeaway}
                  disabled={uploading}
                >
                  <Plus className="size-3.5" data-icon="inline-start" />
                  {t("Agregar punto clave")}
                </Button>
              </div>
              {takeaways.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  {t(
                    "Sin puntos clave personalizados (se mostrarán las recomendaciones por defecto).",
                  )}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {takeaways.map((tk, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        placeholder={t("Ej. Proteína en cada comida principal")}
                        value={tk}
                        onChange={(e) => updateTakeaway(idx, e.target.value)}
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeTakeaway(idx)}
                        disabled={uploading}
                        aria-label={t("Eliminar punto clave")}
                      >
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          </>
        )}
        {!quick && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {t("Publicar de inmediato")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(
                  "Al publicar se fijará la fecha de publicación automáticamente.",
                )}
              </span>
            </div>
            <Switch
              checked={form.status === "Published"}
              onCheckedChange={(checked) =>
                update("status", checked ? "Published" : "Draft")
              }
              disabled={uploading}
              aria-label={t("Publicar de inmediato")}
            />
          </div>
        )}
      </div>

      {(validationError || serverError) && (
        <p
          className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive lg:col-span-2"
          role="alert"
        >
          {validationError ?? serverError}
        </p>
      )}

      <div
        className={
          footerClassName ??
          (fullPage
            ? "flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4 lg:col-span-2"
            : "flex items-center justify-end gap-2 pt-1")
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving || uploading}
        >
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={saving || uploading || detecting}>
          {progress !== null && (file || thumbnailFile) ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              {t("Subiendo...")}
            </>
          ) : uploading ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              {t("Guardando...")}
            </>
          ) : (
            (submitLabel ?? defaultSubmitLabel)
          )}
        </Button>
      </div>
    </form>
  );
}

/** Punto de integración para las tarjetas de 1.17; conserva el archivo y los metadatos avanzados. */
export function MediaQuickEditSheet({
  open,
  onOpenChange,
  ...props
}: Omit<MediaFormFieldsProps, "onCancel" | "fullPage" | "mode"> & {
  open: boolean;
  media: MediaItem;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const close = () => {
    if (!props.saving) onOpenChange(false);
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!props.saving) onOpenChange(next);
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <SheetTitle>{t("Editar podcast")}</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={props.saving}
              onClick={close}
            >
              {t("Cerrar")}
            </Button>
          </div>
          <SheetDescription>
            {t(
              "Actualiza título, categoría y miniatura sin salir de la biblioteca.",
            )}
          </SheetDescription>
        </SheetHeader>
        <MediaFormFields
          key={props.media.id}
          {...props}
          mode="quick"
          onCancel={close}
        />
      </SheetContent>
    </Sheet>
  );
}

/** Resumen con referencias reales: el contrato devuelve inscripciones, no un total de pacientes. */
function MediaQuickUsage({ mediaId }: { mediaId: string }) {
  const t = useT();
  const [refs, setRefs] = useState<MediaReferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void fetchMediaReferences(mediaId)
      .then((data) => {
        if (active) setRefs(data);
      })
      .catch(() => {
        if (active) setError(t("No se pudieron cargar las referencias."));
      });
    return () => {
      active = false;
    };
  }, [mediaId, attempt, t]);
  if (error)
    return (
      <div role="alert" className="text-sm text-destructive">
        <p>{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-2 min-h-11"
          onClick={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
        >
          {t("Reintentar")}
        </Button>
      </div>
    );
  if (!refs) return <Skeleton className="h-14 w-full rounded-lg" />;
  const templates = [
    ...new Map(
      refs.templateReferences.map((ref) => [ref.templateId, ref.templateName]),
    ).entries(),
  ];
  const enrollments = new Set(
    refs.enrollmentReferences.map((ref) => ref.enrollmentId),
  ).size;
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
      {refs.totalReferences === 0 ? (
        <p>{t("Sin referencias activas")}</p>
      ) : (
        <>
          {templates.length > 0 && (
            <ul className="flex flex-col gap-1">
              {templates.map(([id, name]) => (
                <li key={id}>{name}</li>
              ))}
            </ul>
          )}
          {enrollments > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("{count} inscripciones", { count: String(enrollments) })}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t("{count} referencias activas", {
              count: String(refs.totalReferences),
            })}
          </p>
        </>
      )}
    </div>
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
  const id = useId();
  const child = isValidElement<{ id?: string }>(children) ? children : null;
  const fieldId = child?.props.id ?? id;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {child
        ? cloneElement(child as ReactElement<{ id?: string }>, { id: fieldId })
        : children}
    </div>
  );
}
