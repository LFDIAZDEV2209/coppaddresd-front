"use client";

import { Bot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgentType, AgentTypeRequest } from "../types";
import { AgentFormFields } from "./agent-form-fields";
import { useT } from "@/providers/i18n-provider";

interface AgentFormDialogProps {
  open: boolean;
  agent?: AgentType;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AgentTypeRequest) => Promise<void>;
}

/**
 * Modal de EDICIÓN de tipos de agente. La creación vive en la página dedicada
 * /agents/new; el cuerpo del formulario es compartido (AgentFormFields).
 */
export function AgentFormDialog({
  open,
  agent,
  saving,
  onOpenChange,
  onSubmit,
}: AgentFormDialogProps) {
  const t = useT();
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
                {agent ? t('Editar agente') : t('Nuevo tipo de agente')}
              </DialogTitle>
              <DialogDescription>
                {agent
                  ? t('Actualiza la información del tipo de agente.')
                  : t('Define el tipo de agente: nombre, especialidad y estado.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <AgentFormFields
          agent={agent}
          saving={saving}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
