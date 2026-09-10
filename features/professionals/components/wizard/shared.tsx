/**
 * Componentes UI compartidos por los pasos del wizard: Field (campo con
 * label, error, hint) y ReviewEditButton (botón "Cambiar" de la revisión).
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Campo de formulario con label, indicador requerido, error y hint. */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && (
        <p
          className="text-xs leading-snug whitespace-pre-line text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Botón "Cambiar" de las secciones de revisión: salta al paso indicado. */
export function ReviewEditButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      onClick={onClick}
    >
      <Pencil data-icon="inline-start" className="size-3" />
      {t("Cambiar")}
    </Button>
  );
}
