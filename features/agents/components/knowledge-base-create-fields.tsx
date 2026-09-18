"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/providers/i18n-provider";

interface KnowledgeBaseCreateFieldsProps {
  creating: boolean;
  /** Etiqueta del botón principal (default: Crear base). */
  submitLabel?: string;
  onCancel: () => void;
  /** Valores del formulario; el caller arma el request completo (scope). */
  onSubmit: (values: { name: string; description: string | null }) => Promise<void>;
}

/**
 * Cuerpo del formulario de creación de knowledge bases (nombre + descripción).
 * Compartido por la página global (/agents/knowledge/new), la página por
 * agente (/agents/[id]/knowledge/new) y el modal embebido del wizard.
 */
export function KnowledgeBaseCreateFields({
  creating,
  submitLabel,
  onCancel,
  onSubmit,
}: KnowledgeBaseCreateFieldsProps) {
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setValidationError(t('El nombre es obligatorio.'));
      return;
    }
    setValidationError(null);
    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kb-name">{t('Nombre')}</Label>
        <Input
          id="kb-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Ej. Protocolos generales de atención')}
          disabled={creating}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kb-desc">{t('Descripción')}</Label>
        <Input
          id="kb-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('Describe el contenido de la base')}
          disabled={creating}
        />
      </div>
      {validationError && (
        <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
          {validationError}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={creating}>
          {t('Cancelar')}
        </Button>
        <Button type="submit" disabled={creating}>
          {creating ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              {t('Creando...')}
            </>
          ) : (
            (submitLabel ?? t('Crear base'))
          )}
        </Button>
      </div>
    </form>
  );
}
