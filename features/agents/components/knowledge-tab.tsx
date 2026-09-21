"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Plus,
  UploadCloud,
  LoaderCircle,
  FileText,
  X,
  Trash2,
  Globe,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { uuid } from "@/lib/uuid";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { KnowledgeBase, AgentDocument, KnowledgeBaseRequest } from "../types";
import { formatFileSize, formatDate } from "../services/agents-service";
import { uploadDocumentToStorage } from "../services/upload-agent-document";
import { useT } from "@/providers/i18n-provider";

interface KnowledgeTabProps {
  knowledge: {
    bases: KnowledgeBase[];
    loading: boolean;
    error: string | null;
    creating: boolean;
    deletingId: string | null;
    registeringDoc: boolean;
    refetch: () => void;
    handleCreateBase: (input: KnowledgeBaseRequest) => Promise<void>;
    handleDeleteBase: (id: string) => Promise<void>;
    loadDocuments: (knowledgeBaseId: string) => Promise<AgentDocument[]>;
    handleRegisterDocument: (
      knowledgeBaseId: string,
      input: {
        storageKey: string;
        fileName: string;
        contentType?: string | null;
        fileSizeBytes?: number | null;
      },
    ) => Promise<void>;
    handleDeleteDocument: (id: string) => Promise<void>;
  };
  agentTypeId: string;
}

const docStatusVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  Listo: "default",
  Error: "destructive",
  Procesando: "secondary",
  Pendiente: "outline",
};

export function KnowledgeTab({ knowledge, agentTypeId }: KnowledgeTabProps) {
  const t = useT();
  const router = useRouter();
  const [uploadBase, setUploadBase] = useState<KnowledgeBase | null>(null);
  const [docsByBase, setDocsByBase] = useState<Record<string, AgentDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<Record<string, boolean>>({});
  const [deletingDoc, setDeletingDoc] = useState<AgentDocument | null>(null);
  /** Feedback tras crear en /agents/[id]/knowledge/new (query ?creado=1). */
  const [createdNotice, setCreatedNotice] = useState(false);

  useEffect(() => {
    if (!window.location.search.includes("creado=1")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feedback post-creación (flag de URL), intencional
    setCreatedNotice(true);
  }, []);

  const toggleDocs = async (base: KnowledgeBase) => {
    if (docsByBase[base.id]) {
      setDocsByBase((current) => {
        const next = { ...current };
        delete next[base.id];
        return next;
      });
      return;
    }
    setDocsLoading((current) => ({ ...current, [base.id]: true }));
    try {
      const docs = await knowledge.loadDocuments(base.id);
      setDocsByBase((current) => ({ ...current, [base.id]: docs }));
    } finally {
      setDocsLoading((current) => ({ ...current, [base.id]: false }));
    }
  };

  const removeDoc = async (doc: AgentDocument) => {
    await knowledge.handleDeleteDocument(doc.id);
    setDocsByBase((current) => ({
      ...current,
      [doc.knowledgeBaseId]: (current[doc.knowledgeBaseId] ?? []).filter(
        (d) => d.id !== doc.id,
      ),
    }));
    setDeletingDoc(null);
    await knowledge.refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <BookOpen className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t('Knowledge bases')}</h3>
            <p className="text-[12px] text-muted-foreground">
              {t('Conocimiento global y específico del agente para RAG.')}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => router.push(`/agents/${agentTypeId}/knowledge/new`)}>
          <Plus data-icon="inline-start" />
          {t('Nueva knowledge base')}
        </Button>
      </div>

      {knowledge.error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {knowledge.error}
        </p>
      )}

      {knowledge.loading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : knowledge.bases.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t('Sin knowledge bases')}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('Crea una knowledge base para indexar documentos del agente.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {knowledge.bases.map((base) => (
            <div key={base.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  {base.scope === "Global" ? (
                    <Globe className="size-4.5" />
                  ) : (
                    <Bot className="size-4.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{base.name}</span>
                    <Badge variant={base.scope === "Global" ? "outline" : "secondary"}>
                      {base.scope === "Global" ? t('Global') : t('Agente')}
                    </Badge>
                  </div>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {base.description ?? t('Sin descripción')} · {t('{count} documento(s)', { count: String(base.documentCount) })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleDocs(base)}
                  disabled={docsLoading[base.id]}
                >
                  {docsLoading[base.id] ? (
                    <LoaderCircle className="size-4 animate-spin" data-icon="inline-start" />
                  ) : (
                    <FileText className="size-4" data-icon="inline-start" />
                  )}
                  {docsByBase[base.id] ? t('Ocultar') : t('Documentos')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadBase(base)}
                  disabled={knowledge.registeringDoc}
                >
                  <UploadCloud data-icon="inline-start" className="size-4" />
                  {t('Subir')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => knowledge.handleDeleteBase(base.id)}
                  disabled={knowledge.deletingId === base.id}
                  aria-label={t('Eliminar {name}', { name: base.name })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {docsByBase[base.id] && (
                <div className="flex flex-col border-t border-border bg-background/50 px-5 py-3">
                  {docsByBase[base.id].length === 0 ? (
                    <p className="py-2 text-[12.5px] text-muted-foreground">
                      {t('Sin documentos. Subí el primero.')}
                    </p>
                  ) : (
                    docsByBase[base.id].map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0"
                      >
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{doc.fileName}</p>
                          <p className="text-[11.5px] text-muted-foreground">
                            {formatFileSize(doc.fileSizeBytes)} ·{" "}
                            {doc.chunksCount !== null ? `${doc.chunksCount} chunks` : t('sin indexar')} ·{" "}
                            {formatDate(doc.createdAt)}
                          </p>
                          {doc.status === "Error" && doc.errorMessage && (
                            <p className="mt-0.5 text-[11.5px] text-destructive">
                              {doc.errorMessage}
                            </p>
                          )}
                        </div>
                        <Badge variant={docStatusVariant[doc.status] ?? "outline"}>
                          {doc.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingDoc(doc)}
                          aria-label={t('Eliminar {name}', { name: doc.fileName })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createdNotice && (
        <div
          className="flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-foreground"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{t('Knowledge base creada correctamente.')}</span>
          <button
            type="button"
            onClick={() => setCreatedNotice(false)}
            className="text-xs font-medium underline-offset-2 hover:underline"
          >
            {t('Cerrar')}
          </button>
        </div>
      )}

      {uploadBase && (
        <UploadDocumentDialog
          base={uploadBase}
          open
          onOpenChange={(open) => !open && setUploadBase(null)}
          uploading={knowledge.registeringDoc}
          onSubmit={async (file) => {
            const storageKey = `agents/docs/${uploadBase.id}/${uuid()}-${file.name}`;
            await uploadDocumentToStorage(storageKey, file);
            await knowledge.handleRegisterDocument(uploadBase.id, {
              storageKey,
              fileName: file.name,
              contentType: file.type || null,
              fileSizeBytes: file.size,
            });
            const docs = await knowledge.loadDocuments(uploadBase.id);
            setDocsByBase((current) => ({ ...current, [uploadBase.id]: docs }));
            await knowledge.refetch();
            setUploadBase(null);
          }}
        />
      )}

      <AlertDialog open={deletingDoc !== null} onOpenChange={(open) => !open && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Eliminar documento')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('¿Eliminar "{name}"? También se quitarán sus chunks del índice de conocimiento.', { name: deletingDoc?.fileName ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancelar')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deletingDoc) void removeDoc(deletingDoc);
              }}
            >
              {t('Eliminar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadDocumentDialog({
  base,
  open,
  onOpenChange,
  uploading,
  onSubmit,
}: {
  base: KnowledgeBase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploading: boolean;
  onSubmit: (file: File) => Promise<void>;
}) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setValidationError(t('Seleccioná un archivo para subir.'));
      return;
    }
    setValidationError(null);
    await onSubmit(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[560px] max-w-lg p-0">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
          <DialogTitle className="text-base font-semibold">
            {t('Subir documento a "{name}"', { name: base.name })}
          </DialogTitle>
          <DialogDescription>
            {t('Se indexa automáticamente: chunking + embeddings en el AI Service.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
          <div>
            <Label htmlFor="doc-file">{t('Archivo')}</Label>
            <input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              accept=".md,.txt,.pdf,.doc,.docx"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setProgress(null);
              }}
              disabled={uploading}
            />
            {file ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <FileText className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                {progress !== null ? (
                  <span className="text-xs font-medium text-primary">{progress}%</span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label={t('Quitar archivo')}
                  >
                    <X />
                  </Button>
                )}
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
                <span className="text-sm font-medium">{t('Seleccioná el documento')}</span>
                <span className="text-xs text-muted-foreground">Markdown, TXT, PDF, Word</span>
              </button>
            )}
          </div>

          {progress !== null && (
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
          )}

          {validationError && (
            <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}

          <DialogFooter className="-mx-6 -mb-5 px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              {t('Cancelar')}
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? (
                <>
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  {t('Indexando...')}
                </>
              ) : (
                t('Subir e indexar')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
