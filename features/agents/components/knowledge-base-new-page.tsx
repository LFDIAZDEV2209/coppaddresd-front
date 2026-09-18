"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { createKnowledgeBase } from "../services/agents-service";
import { KnowledgeBaseCreateFields } from "./knowledge-base-create-fields";

/**
 * Página dedicada de creación de knowledge bases globales
 * (/agents/knowledge/new): reemplaza al antiguo modal "Nueva knowledge base
 * global". Tras crear navega al listado con feedback.
 */
export function KnowledgeBaseNewPage() {
  const t = useT();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (values: { name: string; description: string | null }) => {
    setServerError(null);
    setCreating(true);
    try {
      await createKnowledgeBase({
        ...values,
        scope: "Global",
        agentTypeId: null,
        status: "Activo",
      });
      // Feedback de éxito + regreso al listado (se recarga fresco al montar).
      router.push("/agents/knowledge?creado=1");
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error
          ? err.message
          : t('No se pudo crear la knowledge base.'),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/agents/knowledge")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t('Volver a knowledge bases')}
      </Button>

      <PageHeader
        title={t('Nueva knowledge base global')}
        description={t('El conocimiento global queda disponible para todos los agentes.')}
        icon={BookOpen}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        {serverError && (
          <p
            className="rounded-none bg-destructive-soft px-6 py-3 text-sm text-destructive"
            role="alert"
          >
            {serverError}
          </p>
        )}
        <KnowledgeBaseCreateFields
          key="new"
          creating={creating}
          onCancel={() => router.push("/agents/knowledge")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
