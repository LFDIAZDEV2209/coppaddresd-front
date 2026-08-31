"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/providers/i18n-provider";

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título ya traducido. */
  title: string;
  /** Descripción ya traducida (opcional). */
  description?: string;
  /** Texto sugerido, prellenado y editable. */
  defaultText: string;
  onSend: (text: string) => void;
}

/** Diálogo editable antes de enviar un mensaje (montar con key para resetear el borrador). */
export function MessageDialog({ open, onOpenChange, title, description, defaultText, onSend }: MessageDialogProps) {
  const t = useT();
  const [text, setText] = useState(defaultText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("Escribe tu mensaje...")}
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("Cancelar")}
          </Button>
          <Button
            size="sm"
            disabled={!text.trim()}
            onClick={() => {
              onSend(text);
              onOpenChange(false);
            }}
          >
            <Send data-icon="inline-start" />
            {t("Enviar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
