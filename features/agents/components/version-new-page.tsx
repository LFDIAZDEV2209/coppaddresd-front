"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { useAgentDetail } from "../hooks/use-agent-detail";
import { useAgentKnowledge } from "../hooks/use-agent-knowledge";
import { uploadInstructionsDocument } from "../services/upload-agent-document";
import { VersionFormFields } from "./version-form-dialog";

/**
 * Página dedicada de creación de versiones de agente
 * (/agents/[id]/versions/new): reemplaza al antiguo modal "Nueva versión".
 * Mismo wiring que el detalle (config + instrucciones .md indexadas en RAG);
 * al terminar vuelve al detalle del agente con feedback.
 */
export function AgentVersionNewPage({ agentTypeId }: { agentTypeId: string }) {
  const t = useT();
  const router = useRouter();
  const detail = useAgentDetail(agentTypeId);
  const knowledge = useAgentKnowledge(agentTypeId, { includeGlobal: true });
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (config: string, notes?: string | null) => {
    setServerError(null);
    try {
      await detail.handleCreateVersion(config, notes);
      // Feedback de éxito + regreso al detalle del agente (tab versiones).
      router.push(`/agents/${agentTypeId}?creado=1&tab=versions`);
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error ? err.message : t('No se pudo crear la versión.'),
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push(`/agents/${agentTypeId}`)}
      >
        <ArrowLeft data-icon="inline-start" />
        {t('Volver al detalle del agente')}
      </Button>

      <PageHeader
        title={t('Nueva versión del agente')}
        description={t('Configurá el comportamiento sin tocar código: instrucciones, modelo y herramientas.')}
        icon={Sparkles}
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
        <VersionFormFields
          key="new"
          saving={detail.creatingVersion}
          knowledgeBases={knowledge.bases}
          onCancel={() => router.push(`/agents/${agentTypeId}`)}
          onCreate={submit}
          onUploadInstructions={(file) =>
            uploadInstructionsDocument(file, {
              agentId: agentTypeId,
              agentName: detail.agent?.name ?? t('Agente'),
              findAgentBase: () =>
                knowledge.bases.find(
                  (base) => base.scope !== "Global" && base.agentTypeId === agentTypeId,
                ) ?? null,
              createAgentBase: knowledge.handleCreateBase,
              registerDocument: knowledge.handleRegisterDocument,
            })
          }
        />
      </div>
    </div>
  );
}
