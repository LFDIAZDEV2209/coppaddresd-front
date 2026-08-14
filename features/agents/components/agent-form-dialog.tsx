"use client";

import { useState, type FormEvent } from "react";
import { Bot, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgentType, AgentTypeRequest } from "../types";
import { AgentIconPicker } from "./agent-icon-picker";

interface AgentFormDialogProps {
  open: boolean;
  agent?: AgentType;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AgentTypeRequest) => Promise<void>;
}

export function AgentFormDialog({
  open,
  agent,
  saving,
  onOpenChange,
  onSubmit,
}: AgentFormDialogProps) {
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [specialty, setSpecialty] = useState(agent?.specialty ?? "");
  const [iconKey, setIconKey] = useState(agent?.iconKey ?? "Bot");
  const [status, setStatus] = useState(agent?.status ?? "Borrador");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setValidationError("El nombre del agente es obligatorio.");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] min-w-[560px] max-w-xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>
                {agent ? "Editar agente" : "Nuevo tipo de agente"}
              </DialogTitle>
              <DialogDescription>
                {agent
                  ? "Actualiza la información del tipo de agente."
                  : "Define el tipo de agente: nombre, especialidad y estado."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
          <Field label="Nombre" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Asistente de Nutrición"
              disabled={saving}
            />
          </Field>

          <Field label="Especialidad">
            <Input
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              placeholder="Ej. Nutrición, Salud mental, Citas"
              disabled={saving}
            />
          </Field>

          <Field label="Icono">
            <AgentIconPicker
              value={iconKey}
              onChange={setIconKey}
              disabled={saving}
            />
          </Field>

          <Field label="Estado">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AgentType["status"])
              }
              disabled={saving}
            >
              <option value="Borrador">Borrador</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </Field>

          <Field label="Descripción">
            <textarea
              className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe el propósito del agente"
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

          <DialogFooter className="-mx-6 -mb-5 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  Guardando...
                </>
              ) : agent ? (
                "Guardar cambios"
              ) : (
                "Crear agente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
