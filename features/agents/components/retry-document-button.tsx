"use client";

import { useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { retryDocument } from "../services/agents-service";
import type { AgentDocument } from "../types";

export function RetryDocumentButton({ document, onComplete }: {
  document: AgentDocument;
  onComplete: (document: AgentDocument) => void;
}) {
  const t = useT();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(false);
  if (document.status === "Listo") return null;

  const retry = async () => {
    setRetrying(true);
    setError(false);
    try {
      onComplete(await retryDocument(document.id));
    } catch {
      setError(true);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex max-w-52 flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
        {retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        {retrying ? t('Indexando...') : document.status === 'Archivado' ? t('Restaurar e indexar') : t('Reintentar')}
      </Button>
      {error && <span role="alert" className="text-right text-xs text-destructive">
        {t('No se pudo reindexar. Si sigue procesando, espera unos minutos y reintenta.')}
      </span>}
    </div>
  );
}
