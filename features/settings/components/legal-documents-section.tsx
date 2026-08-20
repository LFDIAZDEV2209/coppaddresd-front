"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  History,
  Plus,
  Rocket,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getLegalDocument,
  listLegalDocuments,
  publishLegalDocument,
  saveLegalDocumentDraft,
} from "../services/legal-documents-service";
import type {
  LegalDocumentDetail,
  LegalDocumentSummary,
  LegalDocumentVersion,
} from "../types/legal-documents";

const DEFAULT_CODE = "terms-and-conditions";
const DEFAULT_TITLE = "Términos y condiciones";
const BLANK = "blank";

export function LegalDocumentsSection() {
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<LegalDocumentDetail | null>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [content, setContent] = useState("");
  const [baseVersionId, setBaseVersionId] = useState(BLANK);
  const [view, setView] = useState<"edit" | "preview" | "history">("edit");
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishVersionId, setPublishVersionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reloadList = () =>
    listLegalDocuments().then((data) => setDocuments(data));

  const loadDocument = (documentCode: string) => {
    void getLegalDocument(documentCode)
      .then((document) => {
        setDetail(document);
        setCode(document.code);
        setTitle(document.title);
        setContent("");
        setBaseVersionId(BLANK);
        setPreviewVersionId(null);
        setView("edit");
      })
      .catch(() => {
        setDetail(null);
        setError("No pudimos cargar el documento seleccionado.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void listLegalDocuments()
      .then((data) => {
        setDocuments(data);
        if (data[0]) setSelectedCode(data[0].code);
        else setLoading(false);
      })
      .catch(() => {
        setError("No pudimos cargar los documentos legales.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedCode) loadDocument(selectedCode);
  }, [selectedCode]);

  const changeBase = (versionId: string) => {
    setBaseVersionId(versionId);
    if (versionId === BLANK) {
      setContent("");
      return;
    }
    const version = detail?.versions.find((item) => item.id === versionId);
    setContent(version?.content ?? "");
  };

  const startNewDocument = () => {
    setSelectedCode(null);
    setDetail(null);
    setCode(DEFAULT_CODE);
    setTitle(DEFAULT_TITLE);
    setContent("");
    setBaseVersionId(BLANK);
    setView("edit");
    setError(null);
    setSuccess(null);
  };

  const saveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveLegalDocumentDraft(code, {
        title,
        content,
        createdBy: null,
      });
      setDetail(saved);
      setSelectedCode(saved.code);
      setPreviewVersionId(null);
      setSuccess("Borrador guardado correctamente.");
      void reloadList();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const openPublish = () => {
    const draft = latestDraft(detail?.versions);
    setPublishVersionId(draft?.id ?? "");
    setPublishOpen(true);
  };

  const publish = async () => {
    if (!selectedCode || !publishVersionId) return;
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const published = await publishLegalDocument(selectedCode, {
        sourceVersionId: publishVersionId,
      });
      setDetail(published);
      setPublishOpen(false);
      setSuccess(`Publicado como v${published.currentVersion}.`);
      void reloadList();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos publicar el documento.");
    } finally {
      setPublishing(false);
    }
  };

  const previewContent =
    (view === "preview" && previewVersionId
      ? detail?.versions.find((version) => version.id === previewVersionId)?.content
      : null) ?? content;

  const hasDrafts = detail?.versions.some((version) => !version.isPublished) ?? false;

  return (
    <div className="flex flex-col gap-4 p-5">
      {error && (
        <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success-foreground" role="status">
          <CheckCircle2 className="size-4" />
          {success}
        </p>
      )}

      <section className="rounded-2xl border border-primary/15 bg-primary-soft/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{detail?.title ?? "Nuevo documento"}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {code}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {detail?.isPublished ? (
                  <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success-foreground">
                    Publicado · v{detail.currentVersion}
                  </span>
                ) : (
                  <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning-foreground">
                    Sin publicar
                  </span>
                )}
                {detail?.latestDraft && (
                  <span className="text-xs text-muted-foreground">
                    Último borrador v{detail.latestDraft}
                  </span>
                )}
                {detail && (
                  <span className="text-xs text-muted-foreground">
                    · {detail.versionCount} {detail.versionCount === 1 ? "versión" : "versiones"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={startNewDocument}>
              <Plus data-icon="inline-start" />
              Nuevo documento
            </Button>
            <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={openPublish} disabled={!hasDrafts || publishing}>
              <Rocket data-icon="inline-start" />
              Publicar
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos
          </p>
          {documents.map((document) => (
            <button
              type="button"
              key={document.code}
              onClick={() => {
                setLoading(true);
                setSelectedCode(document.code);
                setSuccess(null);
              }}
              className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${selectedCode === document.code ? "bg-primary-soft font-semibold text-primary" : "hover:bg-muted"}`}
            >
              <FileText className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{document.title}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {document.isPublished ? `v${document.currentVersion} publicado` : "Sin publicar"}
                  {document.latestDraft ? ` · borrador v${document.latestDraft}` : ""}
                </span>
              </span>
            </button>
          ))}
          {!documents.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Aún no hay documentos.</p>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                {(["edit", "preview", "history"] as const).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setView(item)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {item === "edit" ? "Editar" : item === "preview" ? "Vista previa" : "Historial"}
                  </button>
                ))}
              </div>

              {view === "edit" && (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="legal-code">Código</Label>
                      <Input id="legal-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="terms-and-conditions" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="legal-title">Título</Label>
                      <Input id="legal-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Términos y condiciones" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="legal-base">Basada en</Label>
                    <select
                      id="legal-base"
                      value={baseVersionId}
                      onChange={(event) => changeBase(event.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={BLANK}>En blanco</option>
                      {detail?.versions.map((version) => (
                        <option key={version.id} value={version.id}>
                          v{version.versionLabel} · {version.isPublished ? "Publicado" : "Borrador"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="legal-content">Contenido</Label>
                    <textarea
                      id="legal-content"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      className="min-h-80 rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Escribe aquí el contenido del documento..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => void saveDraft()} disabled={saving || !code.trim() || !title.trim() || !content.trim()}>
                      <Save data-icon="inline-start" />
                      {saving ? "Guardando..." : "Guardar borrador"}
                    </Button>
                  </div>
                </div>
              )}

              {view === "preview" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold">{title || "Sin título"}</h3>
                      <p className="text-xs text-muted-foreground">
                        Vista previa para la aplicación
                        {previewVersionId ? " · versión seleccionada" : " · borrador actual"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setView("edit")}>
                      Editar
                    </Button>
                  </div>
                  <article className="min-h-80 whitespace-pre-wrap rounded-xl border border-border bg-background p-5 text-sm leading-7 text-foreground">
                    {previewContent || "No hay contenido para previsualizar."}
                  </article>
                </div>
              )}

              {view === "history" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">Historial de versiones</h3>
                  </div>
                  {detail?.versions.length ? (
                    detail.versions.map((version) => (
                      <div key={version.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            v{version.versionLabel}
                            {version.isPublished ? (
                              <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success-foreground">Publicado</span>
                            ) : (
                              <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning-foreground">Borrador</span>
                            )}
                            {version.isCurrent && <span className="ml-2 text-xs text-success-foreground">· Activa</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString("es-CO")} · {version.createdBy ?? "Administrador"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setPreviewVersionId(version.id); setView("preview"); }}>
                          <Eye data-icon="inline-start" />
                          Ver
                        </Button>
                        {!version.isPublished && (
                          <Button size="sm" className="bg-success text-white hover:bg-success/90" disabled={publishing} onClick={() => { setPublishVersionId(version.id); setPublishOpen(true); }}>
                            <Rocket data-icon="inline-start" />
                            Publicar
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
                      No hay versiones guardadas.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {publishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-bold">Publicar documento</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige el borrador que quieres publicar. Se creará una nueva versión {nextMajor(detail)}.0.
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="publish-version">Versión a publicar</Label>
              <select
                id="publish-version"
                value={publishVersionId}
                onChange={(event) => setPublishVersionId(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(detail?.versions.filter((version) => !version.isPublished) ?? []).map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.versionLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPublishOpen(false)} disabled={publishing}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => void publish()} disabled={publishing || !publishVersionId}>
                <Rocket data-icon="inline-start" />
                {publishing ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function latestDraft(versions: LegalDocumentVersion[] | undefined): LegalDocumentVersion | undefined {
  return versions
    ?.filter((version) => !version.isPublished)
    .sort((a, b) => b.major - a.major || b.minor - a.minor)[0];
}

function nextMajor(detail: LegalDocumentDetail | null): number {
  const published = detail?.versions
    .filter((version) => version.isPublished)
    .map((version) => version.major);
  return published?.length ? Math.max(...published) + 1 : 1;
}
