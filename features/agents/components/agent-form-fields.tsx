"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/providers/i18n-provider";
import type { AgentType, AgentTypeRequest } from "../types";
import { AgentIconPicker } from "./agent-icon-picker";

interface AgentFormFieldsProps {
  /** Agente en edición (undefined = creación). */
  agent?: AgentType;
  saving: boolean;
  /** Etiqueta del botón principal (default: Guardar cambios / Crear agente). */
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (input: AgentTypeRequest) => Promise<void>;
}

/**
 * Cuerpo del formulario de tipos de agente (nombre, especialidad, icono,
 * estado, descripción). Compartido por la página de creación (/agents/new) y
 * el modal de edición — misma lógica, sin duplicar.
 */
export function AgentFormFields({
  agent,
  saving,
  submitLabel,
  onCancel,
  onSubmit,
}: AgentFormFieldsProps) {
  const t = useT();
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [specialty, setSpecialty] = useState(agent?.specialty ?? "");
  const [iconKey, setIconKey] = useState(agent?.iconKey ?? "Bot");
  const [status, setStatus] = useState(agent?.status ?? "Borrador");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setValidationError(t('El nombre del agente es obligatorio.'));
      return;
    }
    setValidationError(null);
    await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      specialty: specialty.trim() || null,
      iconKey: iconKey.trim() || null,
      status,
      metadata: agent?.metadata ?? null,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
      <Field label={t('Nombre')} required>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Ej. Asistente de Nutrición')}
          disabled={saving}
        />
      </Field>

      <Field label={t('Especialidad')}>
        <Input
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value)}
          placeholder={t('Ej. Nutrición, Salud mental, Citas')}
          disabled={saving}
        />
      </Field>

      <Field label={t('Icono')}>
        <AgentIconPicker
          value={iconKey}
          onChange={setIconKey}
          disabled={saving}
        />
      </Field>

      <Field label={t('Estado')}>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as AgentType["status"])
          }
          disabled={saving}
        >
          <option value="Borrador">{t('Borrador')}</option>
          <option value="Activo">{t('Activo')}</option>
          <option value="Inactivo">{t('Inactivo')}</option>
        </select>
      </Field>

      <Field label={t('Descripción')}>
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('Describe el propósito del agente')}
          disabled={saving}
        />
      </Field>

      {validationError && (
        <p
          className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {validationError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          {t('Cancelar')}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
              {t('Guardando...')}
            </>
          ) : (
            (submitLabel ?? (agent ? t('Guardar cambios') : t('Crear agente')))
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}
