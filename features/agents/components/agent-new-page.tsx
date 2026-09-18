"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { createAgentType } from "../services/agents-service";
import { AgentFormFields } from "./agent-form-fields";
import type { AgentTypeRequest } from "../types";

/**
 * Página dedicada de creación de tipos de agente (/agents/new): reemplaza al
 * antiguo modal "Nuevo agente". Reutiliza AgentFormFields y el servicio
 * existente; tras crear navega a /agents con feedback.
 */
export function AgentNewPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (input: AgentTypeRequest) => {
    setServerError(null);
    setSaving(true);
    try {
      await createAgentType(input);
      // Feedback de éxito + regreso al listado (se recarga fresco al montar).
      router.push("/agents?creado=1");
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error ? err.message : t('No se pudo crear el agente.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/agents")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t('Volver a agentes')}
      </Button>

      <PageHeader
        title={t('Nuevo tipo de agente')}
        description={t('Define el tipo de agente: nombre, especialidad y estado.')}
        icon={Bot}
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
        <AgentFormFields
          key="new"
          saving={saving}
          submitLabel={t('Crear agente')}
          onCancel={() => router.push("/agents")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
