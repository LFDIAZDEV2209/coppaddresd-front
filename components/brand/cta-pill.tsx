"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * CTA de la línea visual COPP-ADRESD (firma de la app Antares):
 * pill navy, círculo teal con icono, etiqueta y chevrones triples.
 *
 * Interacción "deslizar con el mouse": brillo radial que sigue el cursor
 * (vars CSS --mx/--my, sin re-renders) + atracción magnética sutil del
 * botón hacia el puntero. Todo vía refs y transform; se desactiva con
 * prefers-reduced-motion.
 */
interface CtaPillProps {
  label: string;
  /** Etiqueta mostrada mientras `busy` (ej. "Verificando…"). */
  busyLabel?: string;
  icon: LucideIcon;
  busy?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CtaPill({
  label,
  busyLabel,
  icon: Icon,
  busy = false,
  type = "button",
  disabled = false,
  onClick,
  className,
}: CtaPillProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || disabled || busy) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    // Brillo que sigue al cursor (consumido por .cta-shine::after).
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    // Atracción magnética perceptible (hasta ~7px) — el botón literalmente
    // se desliza siguiendo el puntero.
    const dx = (x - r.width / 2) / r.width;
    const dy = (y - r.height / 2) / r.height;
    el.style.transform = `translate(${dx * 14}px, ${dy * 8}px)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "cta-shine group/cta inline-flex h-[52px] w-full items-center gap-3 rounded-full bg-brand-navy py-2 pr-7 pl-2 text-white",
        "shadow-[0_14px_30px_-14px_rgba(20,40,85,0.6)] transition-[background-color,box-shadow,transform] duration-200 ease-out",
        "hover:bg-[#1d3a72] hover:shadow-[0_18px_36px_-14px_rgba(20,40,85,0.7)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-teal">
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="size-4" aria-hidden="true" />
        )}
      </span>
      <span className="flex-1 text-center text-[15px] font-semibold tracking-tight">
        {busy ? (busyLabel ?? label) : label}
      </span>
      <span aria-hidden="true" className="flex items-center text-white">
        <ChevronRight className="size-4 -mr-2.5 opacity-40 transition-[opacity,transform] duration-200 group-hover/cta:translate-x-1 group-hover/cta:opacity-70" />
        <ChevronRight className="size-4 -mr-2.5 opacity-65 transition-[opacity,transform] duration-200 [transition-delay:40ms] group-hover/cta:translate-x-1 group-hover/cta:opacity-85" />
        <ChevronRight className="size-4 opacity-100 transition-transform duration-200 [transition-delay:80ms] group-hover/cta:translate-x-1" />
      </span>
    </button>
  );
}
