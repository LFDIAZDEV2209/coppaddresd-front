"use client";

import { useEffect, useRef, useState } from "react";
import { Check, UploadCloud, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { mediaCategoryMeta } from "./media-meta";
import { formatDuration } from "../services/media-service";
import {
  createMediaBulkRows,
  createMediaBulkDrafts,
  publishMediaBulkDrafts,
  mediaBulkDraftCandidates,
  mediaBulkPublishCandidates,
  type MediaBulkRow,
} from "../services/media-bulk-queue";

export interface MediaBulkUploadProps {
  /** Adaptador pendiente de conectar al contrato confirmado de la tarea backend 1.13. */
  createDraft: (
    row: MediaBulkRow,
    signal: AbortSignal,
    onProgress?: (update: {
      percent?: number;
      durationSecs?: number | null;
    }) => void,
  ) => Promise<string>;
  /** Guarda los metadatos editados y publica el mismo id, nunca crea otro borrador. */
  publishDraft: (
    row: MediaBulkRow & { mediaId: string },
    signal: AbortSignal,
  ) => Promise<void>;
  onCancel: () => void;
  onChanged?: () => void;
}

/** Cola local por archivo. No contiene rutas HTTP ni altera la biblioteca de 1.17. */
export function MediaBulkUpload({
  createDraft,
  publishDraft,
  onCancel,
  onChanged,
}: MediaBulkUploadProps) {
  const t = useT();
  const { can } = useAppContext();
  const [rows, setRows] = useState<MediaBulkRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const running = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const warn = (event: BeforeUnloadEvent) => {
      if (running.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      controller.abort();
      window.removeEventListener("beforeunload", warn);
    };
  }, []);
  const canCreate = can("Media.Create");
  const canPublish = can("Media.Publish");
  const canEdit = can("Media.Edit");

  const addFiles = (files: File[]) => {
    if (!running.current && canCreate)
      setRows((current) => [...current, ...createMediaBulkRows(files)]);
  };
  const updateRow = (
    key: string,
    values: Partial<Pick<MediaBulkRow, "title" | "author" | "category">>,
  ) => {
    if (running.current) return;
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...values } : row)),
    );
  };
  const applyResult = (row: MediaBulkRow) => {
    if (lifetime.current?.signal.aborted) return;
    setRows((current) =>
      current.map((previous) =>
        previous.key === row.key
          ? {
              ...row,
              durationSecs: row.durationSecs ?? previous.durationSecs,
              progress: null,
            }
          : previous,
      ),
    );
  };

  const run = async (
    action: "create" | "publish",
    candidates: MediaBulkRow[],
  ) => {
    if (running.current || (action === "create" ? !canCreate : !canPublish))
      return;
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted) return;
    running.current = true;
    setBusy(true);
    try {
      for (const row of candidates) {
        if (signal.aborted) break;
        setBusyKey(row.key);
        if (action === "create") {
          await createMediaBulkDrafts(
            [row],
            async (entry) => {
              if (!entry.title.trim())
                throw new Error(t("El título es obligatorio."));
              if (!entry.author.trim())
                throw new Error(t("El autor es obligatorio."));
              if (entry.file.size > 200 * 1024 * 1024)
                throw new Error(t("El archivo supera 200 MB."));
              if (
                !entry.file.type.startsWith("audio/") &&
                !/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(entry.file.name)
              )
                throw new Error(
                  t(
                    "Selecciona archivos de audio para la biblioteca de podcasts.",
                  ),
                );
              return createDraft(entry, signal, (update) => {
                if (signal.aborted) return;
                setRows((current) =>
                  current.map((previous) =>
                    previous.key === entry.key
                      ? {
                          ...previous,
                          ...(update.durationSecs !== undefined
                            ? { durationSecs: update.durationSecs }
                            : {}),
                          ...(update.percent !== undefined
                            ? { progress: update.percent }
                            : {}),
                        }
                      : previous,
                  ),
                );
              });
            },
            applyResult,
          );
        } else {
          await publishMediaBulkDrafts(
            [row],
            (entry) => publishDraft(entry, signal),
            applyResult,
          );
        }
      }
      if (!signal.aborted) onChanged?.();
    } finally {
      running.current = false;
      if (!signal.aborted) {
        setBusy(false);
        setBusyKey(null);
      }
    }
  };

  return (
    <section
      aria-label={t("Carga múltiple de podcasts")}
      className="flex min-w-0 flex-col gap-5"
      aria-busy={busy}
    >
      <div
        className="flex flex-col gap-4 rounded-xl border border-dashed border-primary/50 bg-primary-soft p-5 sm:flex-row sm:items-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <UploadCloud className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor="media-bulk-files" className="text-sm font-semibold">
            {t("Suelta aquí más archivos de audio")}
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Audio · hasta 200 MB por archivo · {count} en esta carga", {
              count: String(rows.length),
            })}
          </p>
        </div>
        <Input
          ref={fileInput}
          id="media-bulk-files"
          type="file"
          multiple
          accept="audio/*"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("Seleccionar varios archivos")}
          disabled={busy || !canCreate}
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 bg-background"
          disabled={busy || !canCreate}
          onClick={() => fileInput.current?.click()}
        >
          {t("Elegir archivos")}
        </Button>
      </div>
      {rows.length > 0 && (
        <>
          <div
            role="region"
            aria-label={t("Archivos del lote")}
            tabIndex={0}
            className="max-w-full overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-ring"
          >
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">{t("Archivos del lote")}</caption>
              <thead className="bg-muted">
                <tr>
                  {[
                    "Título",
                    "Autor",
                    "Categoría",
                    "Duración",
                    "Estado",
                    "Acciones",
                  ].map((label) => (
                    <th
                      scope="col"
                      key={label}
                      className="px-3 py-3 font-medium"
                    >
                      {t(label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const editable =
                    !busy &&
                    row.state !== "publicado" &&
                    (!row.mediaId || canEdit);
                  return (
                    <tr
                      key={row.key}
                      className="border-t border-border"
                      aria-busy={busyKey === row.key}
                    >
                      <th
                        scope="row"
                        className="min-w-60 max-w-80 px-3 py-3 font-normal"
                      >
                        <Input
                          className="min-h-11 min-w-44"
                          value={row.title}
                          disabled={!editable}
                          aria-label={t("Título de {name}", {
                            name: row.file.name,
                          })}
                          onChange={(event) =>
                            updateRow(row.key, { title: event.target.value })
                          }
                        />
                        <span className="mt-1 block break-all text-xs text-muted-foreground">
                          {row.file.name}
                        </span>
                      </th>
                      <td className="px-3 py-3">
                        <Input
                          className="min-h-11 min-w-36"
                          value={row.author}
                          disabled={!editable}
                          aria-label={t("Autor de {name}", {
                            name: row.file.name,
                          })}
                          onChange={(event) =>
                            updateRow(row.key, { author: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="min-h-11 min-w-36 rounded-lg border border-input bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          value={row.category}
                          disabled={!editable}
                          aria-label={t("Categoría de {name}", {
                            name: row.file.name,
                          })}
                          onChange={(event) =>
                            updateRow(row.key, {
                              category: event.target
                                .value as MediaBulkRow["category"],
                            })
                          }
                        >
                          {Object.entries(mediaCategoryMeta).map(
                            ([value, meta]) => (
                              <option key={value} value={value}>
                                {t(meta.label)}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-muted-foreground">
                        {formatDuration(row.durationSecs)}
                      </td>
                      <td className="max-w-64 px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${row.state === "error" ? "bg-destructive-soft text-destructive" : row.state === "borrador" || row.state === "publicado" ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {row.state === "error" ? (
                            <TriangleAlert
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          ) : row.state === "borrador" ||
                            row.state === "publicado" ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : null}
                          {busyKey === row.key
                            ? t("Procesando...")
                            : t(
                                row.state === "pendiente"
                                  ? "Pendiente"
                                  : row.state === "borrador"
                                    ? "Borrador listo"
                                    : row.state === "publicado"
                                      ? "Publicado"
                                      : "Error",
                              )}
                        </span>
                        {busyKey === row.key && row.progress !== null && (
                          <progress
                            className="mt-2 h-2 w-full accent-primary"
                            value={row.progress}
                            max={100}
                            aria-label={t("Subida de {name}", {
                              name: row.file.name,
                            })}
                          />
                        )}
                        {row.error && (
                          <p
                            className="mt-1 break-words text-destructive"
                            role="alert"
                          >
                            {row.error}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {row.state === "error" && (
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11"
                              disabled={
                                busy || (row.mediaId ? !canPublish : !canCreate)
                              }
                              onClick={() =>
                                void run(row.mediaId ? "publish" : "create", [
                                  row,
                                ])
                              }
                            >
                              {t("Reintentar")}
                            </Button>
                          )}
                          {!row.mediaId && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="min-h-11"
                              disabled={busy}
                              aria-label={t("Quitar {name} del lote", {
                                name: row.file.name,
                              })}
                              onClick={() =>
                                setRows((current) =>
                                  current.filter(
                                    (entry) => entry.key !== row.key,
                                  ),
                                )
                              }
                            >
                              {t("Quitar")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <p role="status" className="mr-auto text-sm text-muted-foreground">
          {t(
            "{drafts} borradores · {published} publicados · {errors} con error",
            {
              drafts: String(
                rows.filter((row) => row.state === "borrador").length,
              ),
              published: String(
                rows.filter((row) => row.state === "publicado").length,
              ),
              errors: String(
                rows.filter((row) => row.state === "error").length,
              ),
            },
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={onCancel}
        >
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={
            busy || !canCreate || !mediaBulkDraftCandidates(rows).length
          }
          onClick={() => void run("create", mediaBulkDraftCandidates(rows))}
        >
          {t("Guardar borradores")}
        </Button>
        <Button
          type="button"
          className="min-h-11"
          disabled={
            busy || !canPublish || !mediaBulkPublishCandidates(rows).length
          }
          onClick={() => void run("publish", mediaBulkPublishCandidates(rows))}
        >
          {t("Publicar {count} listos", {
            count: String(mediaBulkPublishCandidates(rows).length),
          })}
        </Button>
      </div>
    </section>
  );
}
