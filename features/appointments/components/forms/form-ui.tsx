"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

/**
 * Primitivas de formulario para el tema oscuro de la sala virtual
 * (slate-950 + acentos). Los componentes shadcn usan variables del tema
 * claro, por eso el drawer de la consulta define sus propios controles.
 */

export const darkInput =
  "h-9 w-full min-w-0 rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 text-[13px] text-white placeholder:text-slate-500 outline-none transition-colors focus-visible:border-teal-400/60 focus-visible:ring-3 focus-visible:ring-teal-400/20 disabled:pointer-events-none disabled:opacity-50 [color-scheme:dark]";

export const darkTextarea =
  "min-h-16 w-full resize-y rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 py-2 text-[13px] text-white placeholder:text-slate-500 outline-none transition-colors focus-visible:border-teal-400/60 focus-visible:ring-3 focus-visible:ring-teal-400/20 disabled:pointer-events-none disabled:opacity-50";

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
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-300"
      >
        {Icon && <Icon className="size-3.5 text-slate-500" />}
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
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
      band: "border-teal-400/20 bg-gradient-to-r from-teal-500/15 to-transparent",
      icon: "bg-teal-500/20 text-teal-300",
      chip: "bg-teal-500/20 text-teal-300",
    },
    violet: {
      band: "border-violet-400/20 bg-gradient-to-r from-violet-500/15 to-transparent",
      icon: "bg-violet-500/20 text-violet-300",
      chip: "bg-violet-500/20 text-violet-300",
    },
    amber: {
      band: "border-amber-400/20 bg-gradient-to-r from-amber-500/15 to-transparent",
      icon: "bg-amber-500/20 text-amber-300",
      chip: "bg-amber-500/20 text-amber-300",
    },
    rose: {
      band: "border-rose-400/20 bg-gradient-to-r from-rose-500/15 to-transparent",
      icon: "bg-rose-500/20 text-rose-300",
      chip: "bg-rose-500/20 text-rose-300",
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
        <p className="text-[14px] font-semibold text-white">{title}</p>
        <p className="truncate text-[11.5px] text-slate-400">{subtitle}</p>
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
      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 text-[12.5px] font-medium text-slate-300 outline-none transition-colors hover:border-teal-400/50 hover:bg-teal-400/5 hover:text-teal-200 focus-visible:border-teal-400/60 focus-visible:ring-3 focus-visible:ring-teal-400/20"
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
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:ring-3 focus-visible:ring-rose-400/30"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function ItemRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
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
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-teal-500 text-[13px] font-semibold text-slate-950 outline-none transition-colors hover:bg-teal-400 focus-visible:ring-3 focus-visible:ring-teal-400/40 disabled:opacity-50"
      >
        {busy
          ? "Guardando…"
          : saved
            ? "Borrador guardado ✓"
            : "Guardar borrador"}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-center text-[11.5px] font-medium text-slate-400 outline-none transition-colors hover:text-rose-300 focus-visible:ring-3 focus-visible:ring-rose-400/30"
      >
        Limpiar borrador
      </button>
    </div>
  );
}
