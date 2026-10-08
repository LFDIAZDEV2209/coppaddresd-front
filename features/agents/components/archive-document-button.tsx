"use client";
import { useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { archiveDocument } from "../services/agents-service";
import type { AgentDocument } from "../types";

export function ArchiveDocumentButton({ document, onComplete }: { document: AgentDocument; onComplete: (document: AgentDocument) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (document.status === "Archivado" || document.status === "Procesando") return null;
  return <div className="grid gap-1"><Button size="sm" variant="outline" disabled={busy} title={t("Excluir de las respuestas sin eliminar el documento")} onClick={async () => {
    setBusy(true); setError(false);
    try { onComplete(await archiveDocument(document.id)); } catch { setError(true); } finally { setBusy(false); }
  }}><Archive />{t("Archivar")}</Button>{error && <span role="alert" className="text-xs text-destructive">{t("No se pudo archivar el documento.")}</span>}</div>;
}
