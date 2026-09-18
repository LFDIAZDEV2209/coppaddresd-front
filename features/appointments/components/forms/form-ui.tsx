"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

/**
 * Primitivas de formulario del panel de la consulta: usan los tokens del
 * tema claro del ERP (border-input, bg-background, text-foreground,
 * ring-primary) para que los formularios se vean como el resto de shadcn.
 */

export const formInput =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50";

export const formTextarea =
  "min-h-16 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50";

export function FormField({
  label,
  htmlFor,
  children,
  hint,
  icon: Icon,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground"
      >
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Banda superior de un formulario médico: fondo tintado + icono + título. */
export function FormHeader({
  icon: Icon,
  title,
  subtitle,
  tint,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tint: "teal" | "violet" | "amber" | "rose";
  count?: number;
}) {
  const tints = {
    teal: {
      band: "border-primary/20 bg-gradient-to-r from-primary/10 to-transparent",
      icon: "bg-primary/10 text-primary",
      chip: "bg-primary/10 text-primary",
    },
    violet: {
      band: "border-violet-200 bg-gradient-to-r from-violet-500/10 to-transparent",
      icon: "bg-violet-500/10 text-violet-600",
      chip: "bg-violet-500/10 text-violet-600",
    },
    amber: {
      band: "border-amber-200 bg-gradient-to-r from-amber-500/10 to-transparent",
      icon: "bg-amber-500/10 text-amber-600",
      chip: "bg-amber-500/10 text-amber-600",
    },
    rose: {
      band: "border-rose-200 bg-gradient-to-r from-rose-500/10 to-transparent",
      icon: "bg-rose-500/10 text-rose-600",
      chip: "bg-rose-500/10 text-rose-600",
    },
  }[tint];

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${tints.band}`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tints.icon}`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        <p className="truncate text-[11.5px] text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {typeof count === "number" && count > 0 && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold ${tints.chip}`}
        >
          {count}
        </span>
      )}
    </div>
  );
}

export function AddRowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-[12.5px] font-medium text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/20"
    >
      <Plus className="size-3.5" />
      {label}
    </button>
  );
}

export function RemoveRowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function ItemRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3">
      {children}
    </div>
  );
}

export function DraftActions({
  onSave,
  onClear,
  busy,
  saved,
}: {
  onSave: () => void;
  onClear: () => void;
  busy: boolean;
  saved: boolean;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/40 disabled:opacity-50"
      >
        {busy
          ? t("Guardando…")
          : saved
            ? t("Borrador guardado ✓")
            : t("Guardar borrador")}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-center text-[11.5px] font-medium text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"
      >
        {t("Limpiar borrador")}
      </button>
    </div>
  );
}
