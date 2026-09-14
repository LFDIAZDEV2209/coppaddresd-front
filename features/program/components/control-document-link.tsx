"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { signStorageKey } from "../services/program-controls-service";
import type { PatientControlDocumentDto } from "../types/erp";

interface ControlDocumentLinkProps {
  doc: PatientControlDocumentDto | null;
}

/**
 * Botón "Ver documento": firma el `source_key` del examen y abre la URL firmada
 * en una pestaña nueva. No renderiza nada si el control no tiene documento o
 * si el archivo no tiene key en el storage.
 */
export function ControlDocumentLink({ doc }: ControlDocumentLinkProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `source_key` es nullable en el contrato: sin key no hay nada que firmar.
  const sourceKey = doc?.source_key;
  if (!doc || !sourceKey) return null;

  const handleOpen = () => {
    // La pestaña se abre de forma síncrona al click: si se abriera después del
    // await de la firma, el navegador la bloquearía por pérdida de la
    // activación del usuario. Si la firma falla, se cierra la pestaña vacía.
    const tab = window.open("", "_blank");
    if (!tab) {
      // Bloqueador de popups activo: aviso visible en vez de fallar en silencio.
      setError(t("Permite las ventanas emergentes para abrir el documento."));
      return;
    }
    tab.opener = null;

    setLoading(true);
    setError(null);
    signStorageKey(sourceKey)
      .then((url) => {
        tab.location.href = url;
      })
      .catch(() => {
        tab.close();
        setError(t("No pudimos abrir el documento."));
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={loading}
      >
        {loading ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <FileText data-icon="inline-start" />
        )}
        {t("Ver documento")}
      </Button>
      {doc.measurement_count > 0 && (
        <span className="text-[11px] text-muted-foreground">
          {t("{count} mediciones", { count: String(doc.measurement_count) })}
        </span>
      )}
      {error && (
        <span role="alert" className="text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
