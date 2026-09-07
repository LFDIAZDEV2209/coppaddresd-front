"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  Hash,
  History,
  PenLine,
  Pencil,
  Plus,
  Rocket,
  Save,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Markdown } from "@/components/markdown";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import {
  getLegalDocument,
  listAllLegalDocumentVersions,
  listLegalDocuments,
  publishLegalDocument,
  saveLegalDocumentDraft,
} from "../services/legal-documents-service";
import type {
  DocumentVersionListItem,
  LegalDocumentDetail,
  LegalDocumentSummary,
  LegalDocumentVersion,
} from "../types/legal-documents";

const BLANK = "blank";

export function LegalDocumentsSection() {
  const t = useT();
  const { can } = useAppContext();
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([]);
  const [allVersions, setAllVersions] = useState<DocumentVersionListItem[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<LegalDocumentDetail | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [baseVersionId, setBaseVersionId] = useState(BLANK);
  const [view, setView] = useState<"edit" | "preview" | "history">("edit");
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishVersionId, setPublishVersionId] = useState<string>("");
  const [pendingPreviewId, setPendingPreviewId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reloadList = () =>
    Promise.all([listLegalDocuments(), listAllLegalDocumentVersions()]).then(
      ([docs, versions]) => {
        setDocuments(docs);
        setAllVersions(versions);
      },
    );

  const loadDocument = (documentCode: string) => {
    const requestedId = pendingPreviewId;
    void getLegalDocument(documentCode)
      .then((document) => {
        setDetail(document);
        setCode(document.code);
        setTitle(document.title);
        setContent("");
        setBaseVersionId(BLANK);
        const requested = document.versions.find((version) => version.id === requestedId);
        const current = document.versions.find((version) => version.isCurrent);
        const latest = [...document.versions].sort(
          (a, b) => b.major - a.major || b.minor - a.minor,
        )[0];
        setPreviewVersionId(requested?.id ?? current?.id ?? latest?.id ?? null);
        setPendingPreviewId(null);
        setView("preview");
      })
      .catch(() => {
        setDetail(null);
        setPendingPreviewId(null);
        setError(t("No pudimos cargar el documento seleccionado."));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void listAllLegalDocumentVersions()
      .then(setAllVersions)
      .catch(() => undefined);
  }, [t]);

  useEffect(() => {
    void listLegalDocuments()
      .then((data) => {
        setDocuments(data);
        if (data[0]) setSelectedCode(data[0].code);
        else setLoading(false);
      })
      .catch(() => {
        setError(t("No pudimos cargar los documentos legales."));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    if (selectedCode) loadDocument(selectedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCode, reloadKey]);

  const changeBase = (versionId: string) => {
    setBaseVersionId(versionId);
    if (versionId === BLANK) {
      setContent("");
      return;
    }
    const version = detail?.versions.find((item) => item.id === versionId);
    setContent(version?.content ?? "");
  };

  const openDocument = (documentCode: string) => {
    setLoading(true);
    setSelectedCode(documentCode);
    setReloadKey((key) => key + 1);
    setSuccess(null);
  };

  const openVersion = (documentCode: string, versionId: string) => {
    setPendingPreviewId(versionId);
    openDocument(documentCode);
  };

  const startNewDocument = () => {
    setSelectedCode(null);
    setDetail(null);
    setCode("");
    setTitle("");
    setContent("");
    setBaseVersionId(BLANK);
    setPreviewVersionId(null);
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
      setSuccess(t("Borrador guardado correctamente."));
      void reloadList();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("No pudimos guardar el documento."));
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
      setSuccess(t('Publicado como v{version}.', { version: String(published.currentVersion) }));
      void reloadList();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("No pudimos publicar el documento."));
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

      <section className="rounded-2xl bg-primary-strong p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">{detail?.title ?? t("Nuevo documento")}</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/70">
                  {code}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {detail?.isPublished ? (
                  <span className="rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-white">
                    <CheckCircle2 className="mr-1 inline size-3" />
                    {t('Publicado · v{version}', { version: String(detail.currentVersion) })}
                  </span>
                ) : (
                  <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-bold text-white">
                    <PenLine className="mr-1 inline size-3" />
                    {t("Sin publicar")}
                  </span>
                )}
                {detail?.latestDraft && (
                  <span className="text-xs text-white/70">
                    {t('Último borrador v{version}', { version: String(detail.latestDraft) })}
                  </span>
                )}
                {detail && (
                  <span className="text-xs text-white/70">
                    · {detail.versionCount} {detail.versionCount === 1 ? t("versión") : t("versiones")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {can("LegalDocuments.Manage") && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={startNewDocument}
              >
                <Plus data-icon="inline-start" />
                {t("Nuevo documento")}
              </Button>
            )}
            <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={openPublish} disabled={!hasDrafts || publishing || !can("LegalDocuments.Manage")}>
              <Rocket data-icon="inline-start" />
              {t("Publicar")}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FolderOpen className="size-3.5" />
            {t("Documentos")}
          </p>
          {documents.map((document) => {
            const docVersions = allVersions
              .filter((item) => item.documentCode === document.code)
              .sort((a, b) => b.major - a.major || b.minor - a.minor);
            return (
              <div key={document.code} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => openDocument(document.code)}
                  className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${selectedCode === document.code ? "bg-primary-soft font-semibold text-primary" : "hover:bg-muted"}`}
                >
                  <FileText className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{document.title}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {document.isPublished ? t('v{version} publicado', { version: String(document.currentVersion) }) : t("Sin publicar")}
                      {document.versionCount ? ` · ${document.versionCount} ${document.versionCount === 1 ? t("versión") : t("versiones")}` : ""}
                    </span>
                  </span>
                </button>
                {docVersions.length > 0 && (
                  <div className="ml-5 flex flex-col border-l border-border pl-2">
                    {docVersions.map((version) => (
                      <button
                        type="button"
                        key={version.versionId}
                        onClick={() => openVersion(version.documentCode, version.versionId)}
                        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs ${previewVersionId === version.versionId ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                      >
                        <span className="font-mono">v{version.versionLabel}</span>
                        <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${version.isPublished ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground"}`}>
                          {version.isPublished ? <CheckCircle2 className="size-2.5" /> : <PenLine className="size-2.5" />}
                          {version.isPublished ? t("Publicado") : t("Borrador")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!documents.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">{t("Aún no hay documentos.")}</p>
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
                {([
                  { id: "edit", label: t("Editar"), icon: Pencil },
                  { id: "preview", label: t("Vista previa"), icon: Eye },
                  { id: "history", label: t("Historial"), icon: History },
                ] as const).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setView(item.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${view === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {view === "edit" && (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="legal-code" className="flex items-center gap-1">
                        <Hash className="size-3.5" />
                        {t("Código")}
                      </Label>
                      <Input id="legal-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="terms-and-conditions" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="legal-title" className="flex items-center gap-1">
                        <Type className="size-3.5" />
                        {t("Título")}
                      </Label>
                      <Input id="legal-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Términos y condiciones" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                      <Label htmlFor="legal-base" className="flex items-center gap-1">
                        <GitBranch className="size-3.5" />
                        {t("Basada en")}
                      </Label>
                    <select
                      id="legal-base"
                      value={baseVersionId}
                      onChange={(event) => changeBase(event.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={BLANK}>{t("En blanco")}</option>
                      {detail?.versions.map((version) => (
                        <option key={version.id} value={version.id}>
                          v{version.versionLabel} · {version.isPublished ? t("Publicado") : t("Borrador")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("Contenido")}</Label>
                    <RichTextEditor
                      value={content}
                      onChange={(markdown) => {
                        setPreviewVersionId(null);
                        setContent(markdown);
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => void saveDraft()} disabled={saving || !code.trim() || !title.trim() || !content.trim() || !can("LegalDocuments.Manage")}>
                      <Save data-icon="inline-start" />
                      {saving ? t("Guardando...") : t("Guardar borrador")}
                    </Button>
                  </div>
                </div>
              )}

              {view === "preview" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold">{title || t("Sin título")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t("Vista previa para la aplicación")}
                        {previewVersionId ? ` · ${t("versión seleccionada")}` : ` · ${t("borrador actual")}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!can("LegalDocuments.Manage")}
                      onClick={() => {
                        setPreviewVersionId(null);
                        setContent("");
                        setBaseVersionId(BLANK);
                        setView("edit");
                      }}
                    >
                      <Plus data-icon="inline-start" />
                      {t("Nueva versión")}
                    </Button>
                  </div>
                  <article className="min-h-80 rounded-xl border border-border bg-background p-5 text-sm text-foreground">
                    {previewContent ? (
                      <Markdown content={previewContent} />
                    ) : (
                      <p className="text-muted-foreground">{t("No hay contenido para previsualizar.")}</p>
                    )}
                  </article>
                </div>
              )}

              {view === "history" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">{t("Todas las versiones")}</h3>
                    <span className="text-xs text-muted-foreground">
                      · {allVersions.length} {t("borradores y publicaciones")}
                    </span>
                  </div>
                  {allVersions.length ? (
                    allVersions.map((item) => (
                      <div key={item.versionId} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {item.documentTitle}
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              v{item.versionLabel}
                            </span>
                            {item.isPublished ? (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success-foreground">
                                <CheckCircle2 className="size-3" />
                                {t("Publicado")}
                              </span>
                            ) : (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning-foreground">
                                <PenLine className="size-3" />
                                {t("Borrador")}
                              </span>
                            )}
                            {item.isCurrent && <span className="ml-2 text-xs text-success-foreground">· {t("Activa")}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString("es-CO")} · {item.createdBy ?? "Administrador"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openDocument(item.documentCode)}>
                          <Eye data-icon="inline-start" />
                          {t("Ver")}
                        </Button>
                        {!item.isPublished && can("LegalDocuments.Manage") && (
                          <Button size="sm" className="bg-success text-white hover:bg-success/90" disabled={publishing} onClick={() => { openDocument(item.documentCode); setPublishVersionId(item.versionId); setPublishOpen(true); }}>
                            <Rocket data-icon="inline-start" />
                            {t("Publicar")}
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
                      {t("No hay versiones guardadas.")}
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
            <h3 className="text-base font-bold">{t("Publicar documento")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('Elige el borrador que quieres publicar. Se creará una nueva versión {version}.0.', { version: String(nextMajor(detail)) })}
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="publish-version">{t("Versión a publicar")}</Label>
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
                {t("Cancelar")}
              </Button>
              <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => void publish()} disabled={publishing || !publishVersionId}>
                <Rocket data-icon="inline-start" />
                {publishing ? t("Publicando...") : t("Publicar")}
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
