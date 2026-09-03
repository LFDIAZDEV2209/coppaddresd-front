"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ProgramTemplate,
  ProgramTemplateListItem,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "../types";

interface ProgramTemplateFormDialogProps {
  open: boolean;
  template?: ProgramTemplate | ProgramTemplateListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    input: CreateTemplateInput | UpdateTemplateInput,
    id?: string,
  ) => Promise<void>;
}

export function ProgramTemplateFormDialog({
  open,
  template,
  saving,
  onOpenChange,
  onSubmit,
}: ProgramTemplateFormDialogProps) {
  const isEdit = Boolean(template);
  // Se inicializa directamente de props — el padre usa `key` para forzar remount
  const [code, setCode] = useState(template && "code" in template ? template.code : "");
  const [name, setName] = useState(template ? template.name : "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [totalWeeks, setTotalWeeks] = useState(template?.totalWeeks ?? 83);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      totalWeeks,
      days: template && "days" in template ? template.days : [],
    };
    await onSubmit(input, isEdit && template ? template.id : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar plantilla" : "Nueva plantilla"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos de la plantilla del programa."
              : "Crea una nueva plantilla para el programa de gamificación."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpl-code" className="text-sm font-medium">
              Código *
            </label>
            <Input
              id="tpl-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ej. default-83d"
              required
              disabled={isEdit}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpl-name" className="text-sm font-medium">
              Nombre *
            </label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la plantilla"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpl-desc" className="text-sm font-medium">
              Descripción
            </label>
            <Input
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpl-weeks" className="text-sm font-medium">
              Total de días *
            </label>
            <Input
              id="tpl-weeks"
              type="number"
              min={1}
              max={520}
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(Number(e.target.value))}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
